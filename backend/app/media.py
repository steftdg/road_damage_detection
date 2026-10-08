"""Decode uploads instead of trusting browser MIME types or file extensions."""

import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from .config import Settings
from .schemas import MediaMetadata

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


class InvalidMedia(ValueError):
    pass


def media_kind(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix in IMAGE_EXTENSIONS:
        return "image"
    if suffix in VIDEO_EXTENSIONS:
        return "video"
    raise InvalidMedia("Format non pris en charge. Utilisez JPG, PNG, WebP, MP4, MOV, AVI, MKV ou WebM.")


def load_image(path: Path):
    with Image.open(path) as image:
        return cv2.cvtColor(np.asarray(ImageOps.exif_transpose(image).convert("RGB")), cv2.COLOR_RGB2BGR)


def validate_media(path: Path, kind: str, settings: Settings) -> MediaMetadata:
    if kind == "image":
        try:
            with Image.open(path) as image:
                if image.format not in {"JPEG", "PNG", "WEBP"}:
                    raise InvalidMedia("Le contenu du fichier n'est pas une image JPG, PNG ou WebP.")
                if image.width * image.height > settings.image_max_pixels:
                    raise InvalidMedia("Image trop grande : 40 millions de pixels maximum.")
                image.verify()
            frame = load_image(path)
            return MediaMetadata(width=frame.shape[1], height=frame.shape[0])
        except InvalidMedia:
            raise
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning, ValueError) as error:
            raise InvalidMedia("L'image est endommagée ou illisible.") from error
    capture = cv2.VideoCapture(str(path))
    try:
        if not capture.isOpened():
            raise InvalidMedia("La vidéo est illisible ou son codec n'est pas pris en charge.")
        success, frame = capture.read()
        if not success or frame is None:
            raise InvalidMedia("La vidéo ne contient aucune image lisible.")
        width, height = frame.shape[1], frame.shape[0]
        fps = float(capture.get(cv2.CAP_PROP_FPS))
        total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
        if not math.isfinite(fps) or not 0 < fps <= 240 or total_frames <= 0:
            raise InvalidMedia("La cadence ou la durée de la vidéo ne peut pas être déterminée.")
        duration = total_frames / fps
        if duration > settings.video_max_seconds:
            raise InvalidMedia(f"La vidéo dépasse la limite de {settings.video_max_seconds // 60} minutes.")
        if width * height > 9_000_000 or max(width, height) > 4096:
            raise InvalidMedia("Résolution vidéo trop grande. Utilisez une vidéo de 4K maximum.")
        return MediaMetadata(width=width, height=height, fps=round(fps, 4), total_frames=total_frames, duration_seconds=round(duration, 3))
    finally:
        capture.release()


def write_jpeg(path: Path, frame, *, thumbnail: bool = False) -> None:
    image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    if thumbnail:
        image.thumbnail((1440, 900))
    # Exclusive mode makes an accidental overwrite impossible.
    with path.open("xb") as destination:
        image.save(destination, format="JPEG", quality=92, optimize=True)


def draw_detections(frame, detections: list[dict]):
    annotated = frame.copy()
    scale = max(0.45, min(1.2, frame.shape[1] / 1600))
    thickness = max(2, round(frame.shape[1] / 600))
    for detection in detections:
        x1, y1, x2, y2 = (round(value) for value in detection["bbox"])
        x1, x2 = max(0, x1), min(frame.shape[1] - 1, x2)
        y1, y2 = max(0, y1), min(frame.shape[0] - 1, y2)
        color = (116, 210, 78) if detection["class_code"] == "D20" else (65, 172, 255)
        label = f'{detection["class_code"]}  {detection["confidence"]:.0%}'
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, thickness)
        (label_width, label_height), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, scale, thickness)
        label_top = max(0, y1 - label_height - baseline - 12)
        cv2.rectangle(annotated, (x1, label_top), (min(frame.shape[1] - 1, x1 + label_width + 14), label_top + label_height + baseline + 12), color, -1)
        cv2.putText(annotated, label, (x1 + 7, label_top + label_height + 5), cv2.FONT_HERSHEY_SIMPLEX, scale, (14, 26, 18), thickness, cv2.LINE_AA)
    return annotated
