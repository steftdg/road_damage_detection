"""One inference worker, recoverable assets, and cooperative cancellation."""

import json
import logging
import math
import shutil
import subprocess
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import cv2

from .config import Settings
from .media import draw_detections, load_image, write_jpeg
from .registry import ModelRegistry
from .repository import AnalysisRepository
from .schemas import Analysis, Detection, Summary, utc_now

LOGGER = logging.getLogger(__name__)


class Cancelled(Exception):
    pass


class JobService:
    def __init__(self, settings: Settings, repository: AnalysisRepository, registry: ModelRegistry):
        self.settings, self.repository, self.registry = settings, repository, registry
        self.executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="road-inference")
        self._lock = threading.RLock()
        self._events: dict[str, threading.Event] = {}
        self._closed = False

    @property
    def active_count(self) -> int:
        with self._lock:
            return len(self._events)

    def submit(self, analysis: Analysis, source: Path) -> None:
        with self._lock:
            if self._closed or len(self._events) >= self.settings.max_queue:
                raise RuntimeError("La file d'attente est pleine. Réessayez après la fin d'une analyse.")
            event = threading.Event()
            self._events[analysis.id] = event
            self.repository.save(analysis)
            self.executor.submit(self._run, analysis, source, event)

    def cancel(self, analysis_id: str) -> Analysis | None:
        with self._lock:
            analysis = self.repository.get(analysis_id)
            if analysis is None or analysis.status not in {"queued", "processing"}:
                return analysis
            event = self._events.get(analysis_id)
            if event:
                event.set()
            analysis.status = "cancelled"
            analysis.stage = "Analyse arrêtée · fichiers conservés"
            analysis.updated_at = utc_now()
            self.repository.save(analysis)
            return analysis

    def close(self) -> None:
        with self._lock:
            self._closed = True
            for event in self._events.values():
                event.set()
        self.executor.shutdown(wait=True, cancel_futures=False)

    def _save(self, analysis: Analysis, event: threading.Event) -> None:
        with self._lock:
            if event.is_set():
                raise Cancelled
            analysis.updated_at = utc_now()
            self.repository.save(analysis)

    def _run(self, analysis: Analysis, source: Path, event: threading.Event) -> None:
        started = time.perf_counter()
        try:
            analysis.status = "processing"
            analysis.stage = "Chargement du modèle"
            self._save(analysis, event)
            detector = self.registry.load(analysis.model_id)
            if event.is_set():
                raise Cancelled
            model = self.registry.get(analysis.model_id)
            analysis.stage = "Détection des dommages"
            self._save(analysis, event)
            report_path = source.parent / "detections.jsonl"
            with report_path.open("x", encoding="utf-8") as report:
                if analysis.media_type == "image":
                    self._image(analysis, source, detector, model.image_size, event, report, started)
                else:
                    self._video(analysis, source, detector, model.image_size, event, report, started)
            analysis.status = "completed"
            analysis.progress = 100
            analysis.stage = "Analyse terminée"
            analysis.summary.elapsed_seconds = round(time.perf_counter() - started, 3)
            if analysis.summary.total_detections > len(analysis.detections):
                analysis.warnings.append(f"L'interface affiche les {self.settings.response_max_detections} premières détections. Les exports contiennent le relevé complet.")
            self._save(analysis, event)
        except Cancelled:
            with self._lock:
                previous = self.repository.get(analysis.id)
                if previous and previous.status != "cancelled":
                    previous.status = "cancelled"
                    previous.stage = "Analyse arrêtée · fichiers conservés"
                    previous.updated_at = utc_now()
                    self.repository.save(previous)
        except Exception as error:
            LOGGER.exception("Analysis %s failed", analysis.id)
            with self._lock:
                previous = self.repository.get(analysis.id)
                if previous and previous.status != "cancelled":
                    analysis.status = "failed"
                    analysis.stage = "L'analyse n'a pas abouti"
                    analysis.error = str(error) if isinstance(error, RuntimeError) else "Une erreur est survenue pendant l'inférence. Vérifiez les poids et le format du fichier."
                    analysis.updated_at = utc_now()
                    self.repository.save(analysis)
        finally:
            with self._lock:
                self._events.pop(analysis.id, None)

    def _record(self, analysis: Analysis, detections: list[dict], report, frame_index: int | None, timestamp: float | None) -> None:
        for detection in detections:
            number = analysis.summary.total_detections + 1
            record = Detection(id=f"{analysis.id}-{number}", frame_index=frame_index, timestamp_seconds=timestamp, **detection)
            report.write(record.model_dump_json() + "\n")
            analysis.summary.total_detections = number
            analysis.summary.counts[record.class_code] += 1
            current_average = analysis.summary.average_confidence or 0
            analysis.summary.average_confidence = current_average + (record.confidence - current_average) / number
            if len(analysis.detections) < self.settings.response_max_detections:
                analysis.detections.append(record)
        report.flush()

    def _image(self, analysis: Analysis, source: Path, detector, image_size: int, event: threading.Event, report, started: float) -> None:
        frame = load_image(source)
        inferred_start = time.perf_counter()
        detections = detector.predict(frame, analysis.confidence, image_size)
        inferred_duration = time.perf_counter() - inferred_start
        if event.is_set():
            raise Cancelled
        self._record(analysis, detections, report, None, None)
        write_jpeg(source.parent / "annotated.jpg", draw_detections(frame, detections))
        analysis.annotated_url = f"/api/files/{analysis.id}/annotated.jpg"
        analysis.annotated_playable = True
        analysis.summary.processed_frames = 1
        analysis.summary.total_frames = 1
        analysis.summary.inference_fps = round(1 / inferred_duration, 2) if inferred_duration > 0 else None

    def _video(self, analysis: Analysis, source: Path, detector, image_size: int, event: threading.Event, report, started: float) -> None:
        metadata = analysis.metadata
        frame_stride = max(1, math.ceil(metadata.total_frames / self.settings.video_max_samples))
        analysis.summary = Summary(total_frames=metadata.total_frames, sampled=frame_stride > 1, frame_stride=frame_stride)
        if frame_stride > 1:
            analysis.warnings.append(f"Vidéo échantillonnée : une image analysée toutes les {frame_stride} images. Les détections sont des observations, pas un comptage de dommages uniques.")
        else:
            analysis.warnings.append("Les détections vidéo sont des observations par image, pas un comptage de dommages uniques.")
        capture = cv2.VideoCapture(str(source))
        output = source.parent / "annotated.mp4"
        writer = cv2.VideoWriter(str(output), cv2.VideoWriter_fourcc(*"mp4v"), metadata.fps / frame_stride, (metadata.width, metadata.height))
        inference_seconds = 0.0
        frame_index, last_save = 0, 0.0
        try:
            if not capture.isOpened() or not writer.isOpened():
                raise RuntimeError("Impossible d'ouvrir le codec nécessaire à la vidéo annotée.")
            while True:
                if event.is_set():
                    raise Cancelled
                success, frame = capture.read()
                if not success:
                    break
                if frame_index >= metadata.total_frames + 2 or frame_index / metadata.fps > self.settings.video_max_seconds:
                    raise RuntimeError("La durée réelle de la vidéo dépasse les limites déclarées.")
                if frame_index % frame_stride == 0:
                    inferred_start = time.perf_counter()
                    detections = detector.predict(frame, analysis.confidence, image_size)
                    inference_seconds += time.perf_counter() - inferred_start
                    if event.is_set():
                        raise Cancelled
                    self._record(analysis, detections, report, frame_index, round(frame_index / metadata.fps, 3))
                    writer.write(draw_detections(frame, detections))
                    analysis.summary.processed_frames += 1
                frame_index += 1
                analysis.progress = round(min(93.0, frame_index / metadata.total_frames * 93), 1)
                analysis.summary.elapsed_seconds = round(time.perf_counter() - started, 3)
                if time.perf_counter() - last_save >= 0.6:
                    # Keep progress snapshots small; full records remain append-only on disk.
                    snapshot = analysis.model_copy(update={"detections": []})
                    self._save(snapshot, event)
                    last_save = time.perf_counter()
            if analysis.summary.processed_frames == 0:
                raise RuntimeError("La vidéo n'a fourni aucune image à analyser.")
            if frame_index + 1 < metadata.total_frames:
                analysis.warnings.append("La lecture s'est arrêtée avant la fin déclarée du fichier. Le résultat contient les images lisibles.")
        finally:
            capture.release()
            writer.release()
        analysis.summary.inference_fps = round(analysis.summary.processed_frames / inference_seconds, 2) if inference_seconds else None
        analysis.stage = "Préparation de la vidéo annotée"
        analysis.progress = 95
        self._save(analysis.model_copy(update={"detections": []}), event)
        browser_output = source.parent / "annotated-web.mp4"
        ffmpeg = shutil.which("ffmpeg")
        if ffmpeg and self._transcode(ffmpeg, output, browser_output, event):
            analysis.annotated_url = f"/api/files/{analysis.id}/annotated-web.mp4"
            analysis.annotated_playable = True
        else:
            analysis.annotated_url = f"/api/files/{analysis.id}/annotated.mp4"
            analysis.warnings.append("La vidéo annotée est téléchargeable. Pour la lecture dans le navigateur, installez FFmpeg avec l'encodeur H.264.")

    def _transcode(self, ffmpeg: str, source: Path, output: Path, event: threading.Event) -> bool:
        # -n rejects existing targets; never replace or remove the original MP4.
        process = subprocess.Popen([ffmpeg, "-n", "-nostdin", "-hide_banner", "-loglevel", "error", "-i", str(source), "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        deadline = time.monotonic() + 180
        while process.poll() is None:
            if event.wait(0.2) or time.monotonic() > deadline:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)
                if event.is_set():
                    raise Cancelled
                return False
        return process.returncode == 0 and output.is_file() and output.stat().st_size > 0


def iter_detections(path: Path):
    if path.is_file():
        with path.open(encoding="utf-8") as source:
            for line in source:
                if line.strip():
                    yield json.loads(line)
