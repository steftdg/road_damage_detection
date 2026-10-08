"""FastAPI entry point. Run with one Uvicorn worker on the local machine."""

import csv
import io
import json
import re
import shutil
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Literal
from uuid import uuid4

import cv2
from fastapi import FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from starlette.concurrency import run_in_threadpool

from .config import Settings
from .media import InvalidMedia, load_image, media_kind, validate_media, write_jpeg
from .registry import ModelRegistry
from .repository import AnalysisRepository
from .schemas import Analysis, AnalysisList
from .service import JobService, iter_detections

UUID_PATTERN = re.compile(r"^[a-f0-9]{32}$")


def problem(status_code: int, code: str, message: str, **details) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "message": message, **details})


def create_app(settings: Settings | None = None, registry: ModelRegistry | None = None) -> FastAPI:
    configuration = settings or Settings()
    model_registry = registry or ModelRegistry(configuration.models_dir)

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        repository = AnalysisRepository(configuration.data_dir)
        repository.recover_interrupted()
        jobs = JobService(configuration, repository, model_registry)
        application.state.repository, application.state.jobs = repository, jobs
        yield
        await run_in_threadpool(jobs.close)

    application = FastAPI(title="STRATA · Détection de dommages routiers", version="1.0.0", lifespan=lifespan)
    application.add_middleware(CORSMiddleware, allow_origins=list(configuration.cors_origins), allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

    @application.middleware("http")
    async def limit_request(request: Request, call_next):
        if request.method == "POST" and request.url.path == "/api/analyses":
            length = request.headers.get("content-length")
            if length:
                try:
                    too_large = int(length) > configuration.video_max_bytes + 1024 * 1024
                except ValueError:
                    return JSONResponse(status_code=400, content={"detail": {"code": "invalid_length", "message": "Taille de requête invalide."}})
                if too_large:
                    return JSONResponse(status_code=413, content={"detail": {"code": "file_too_large", "message": "La taille maximale d'une vidéo est de 250 Mo."}})
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    def find_analysis(analysis_id: str) -> Analysis:
        if not UUID_PATTERN.fullmatch(analysis_id):
            raise problem(404, "analysis_not_found", "Analyse introuvable.")
        result = application.state.repository.get(analysis_id)
        if result is None:
            raise problem(404, "analysis_not_found", "Analyse introuvable.")
        return result

    @application.get("/api/health")
    def health():
        models_available = sum(model.available for model in model_registry.list())
        runtime_available = model_registry.runtime_available
        return {"status": "ok", "inference_ready": models_available > 0 and runtime_available, "models_available": models_available, "inference_runtime_available": runtime_available, "ffmpeg_available": bool(shutil.which("ffmpeg")), "limits": {"image_max_mb": configuration.image_max_bytes // (1024 * 1024), "video_max_mb": configuration.video_max_bytes // (1024 * 1024), "video_max_seconds": configuration.video_max_seconds, "max_queue": configuration.max_queue}}

    @application.get("/api/models")
    def models():
        return {"models": model_registry.list(), "default_model_id": "final"}

    @application.post("/api/analyses", response_model=Analysis, status_code=202)
    async def analyse(file: Annotated[UploadFile, File()], model_id: Annotated[str, Form()] = "final", confidence: Annotated[float, Form(ge=0.05, le=0.95)] = 0.25):
        model = model_registry.get(model_id)
        if model is None:
            raise problem(422, "unknown_model", "Le modèle choisi n'existe pas.")
        original_name = (file.filename or "fichier").replace("\\", "/").rsplit("/", 1)[-1]
        original_name = "".join(character for character in original_name if ord(character) >= 32)[:200]
        try:
            kind = media_kind(original_name)
        except InvalidMedia as error:
            raise problem(415, "unsupported_media", str(error)) from error
        if not model.available:
            raise problem(409, "model_unavailable", f"Les poids {model.filename} sont absents. Déposez le modèle entraîné dans le dossier models/ pour lancer une analyse.", filename=model.filename, model_id=model.id)
        if not model_registry.runtime_available:
            raise problem(409, "runtime_unavailable", "Le moteur d'inférence n'est pas installé. Installez les dépendances de requirements.txt puis redémarrez le service.")
        if application.state.jobs.active_count >= configuration.max_queue:
            raise problem(429, "queue_full", "La file d'attente est pleine. Réessayez après la fin d'une analyse.")
        maximum = configuration.image_max_bytes if kind == "image" else configuration.video_max_bytes
        if file.size is not None and file.size > maximum:
            raise problem(413, "file_too_large", f"Ce fichier dépasse la limite de {maximum // (1024 * 1024)} Mo.")
        analysis_id = uuid4().hex
        directory = configuration.data_dir.resolve() / "analyses" / analysis_id
        directory.mkdir(parents=True, exist_ok=False)
        source = directory / f"source{Path(original_name).suffix.lower()}"
        size = 0
        # Invalid uploads remain at this unique path for recovery; nothing is deleted.
        with source.open("xb") as destination:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > maximum:
                    raise problem(413, "file_too_large", f"Ce fichier dépasse la limite de {maximum // (1024 * 1024)} Mo.")
                destination.write(chunk)
        if not size:
            raise problem(422, "empty_file", "Le fichier est vide. Choisissez une image ou une vidéo lisible.")
        try:
            metadata = await run_in_threadpool(validate_media, source, kind, configuration)
        except InvalidMedia as error:
            raise problem(422, "invalid_media", str(error)) from error
        preview = directory / "preview.jpg"

        def make_preview():
            if kind == "image":
                frame = load_image(source)
            else:
                capture = cv2.VideoCapture(str(source))
                try:
                    success, frame = capture.read()
                    if not success:
                        raise InvalidMedia("Impossible de créer l'aperçu de la vidéo.")
                finally:
                    capture.release()
            write_jpeg(preview, frame, thumbnail=True)

        try:
            await run_in_threadpool(make_preview)
        except InvalidMedia as error:
            raise problem(422, "invalid_media", str(error)) from error
        analysis = Analysis(id=analysis_id, filename=original_name, media_type=kind, model_id=model.id, model_name=model.name, confidence=confidence, source_url=f"/api/files/{analysis_id}/{source.name}", preview_url=f"/api/files/{analysis_id}/preview.jpg", metadata=metadata)
        response = analysis.model_copy(deep=True)
        try:
            application.state.jobs.submit(analysis, source)
        except RuntimeError as error:
            raise problem(429, "queue_full", str(error)) from error
        return response

    @application.get("/api/analyses", response_model=AnalysisList)
    def history(limit: Annotated[int, Query(ge=1, le=100)] = 50, offset: Annotated[int, Query(ge=0)] = 0):
        items, total = application.state.repository.list(limit, offset)
        # Full detection arrays are unnecessary when listing a history page.
        return AnalysisList(items=[item.model_copy(update={"detections": []}) for item in items], total=total)

    @application.get("/api/analyses/{analysis_id}", response_model=Analysis)
    def detail(analysis_id: str):
        return find_analysis(analysis_id)

    @application.post("/api/analyses/{analysis_id}/cancel", response_model=Analysis)
    def cancel(analysis_id: str):
        find_analysis(analysis_id)
        return application.state.jobs.cancel(analysis_id)

    @application.get("/api/analyses/{analysis_id}/export")
    def export(analysis_id: str, format: Literal["json", "csv"] = "json"):
        analysis = find_analysis(analysis_id)
        if analysis.status != "completed":
            raise problem(409, "analysis_incomplete", "Les exports sont disponibles lorsque l'analyse est terminée.")
        report_path = configuration.data_dir.resolve() / "analyses" / analysis_id / "detections.jsonl"

        def json_stream():
            payload = analysis.model_dump(exclude={"detections"})
            yield json.dumps(payload, ensure_ascii=False)[:-1] + ', "detections": ['
            first = True
            for detection in iter_detections(report_path):
                if not first:
                    yield ","
                yield json.dumps(detection, ensure_ascii=False)
                first = False
            yield "]}"

        def csv_stream():
            buffer = io.StringIO(newline="")
            writer = csv.writer(buffer)
            writer.writerow(["detection_id", "class_code", "label", "confidence", "x1", "y1", "x2", "y2", "frame_index", "timestamp_seconds"])
            yield "\ufeff" + buffer.getvalue()
            for detection in iter_detections(report_path):
                buffer.seek(0)
                buffer.truncate(0)
                writer.writerow([detection["id"], detection["class_code"], detection["label"], detection["confidence"], *detection["bbox"], detection["frame_index"], detection["timestamp_seconds"]])
                yield buffer.getvalue()

        return StreamingResponse(json_stream() if format == "json" else csv_stream(), media_type="application/json" if format == "json" else "text/csv; charset=utf-8", headers={"Content-Disposition": f'attachment; filename="strata-{analysis_id}.{format}"'})

    @application.get("/api/files/{analysis_id}/{filename}")
    def asset(analysis_id: str, filename: str):
        analysis = find_analysis(analysis_id)
        allowed = {Path(analysis.source_url).name, "preview.jpg", "annotated.jpg", "annotated.mp4", "annotated-web.mp4"}
        if filename not in allowed:
            raise problem(404, "file_not_found", "Fichier introuvable.")
        directory = configuration.data_dir.resolve() / "analyses" / analysis_id
        path = (directory / filename).resolve()
        if path.parent != directory or not path.is_file():
            raise problem(404, "file_not_found", "Fichier introuvable.")
        return FileResponse(path, headers={"Cache-Control": "private, max-age=3600"})

    return application


app = create_app()
