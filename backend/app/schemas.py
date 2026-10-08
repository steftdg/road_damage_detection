"""Stable API response contract."""

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ModelInfo(BaseModel):
    id: str
    name: str
    filename: str
    architecture: str
    epochs: int
    image_size: int
    map50: float
    description: str
    recommended: bool = False
    available: bool = False


class MediaMetadata(BaseModel):
    width: int
    height: int
    fps: float | None = None
    total_frames: int | None = None
    duration_seconds: float | None = None


class Detection(BaseModel):
    id: str
    class_id: int
    class_code: Literal["D20", "D40"]
    label: str
    confidence: float
    bbox: list[float]
    frame_index: int | None = None
    timestamp_seconds: float | None = None


class Summary(BaseModel):
    total_detections: int = 0
    counts: dict[str, int] = Field(default_factory=lambda: {"D20": 0, "D40": 0})
    average_confidence: float | None = None
    processed_frames: int = 0
    total_frames: int | None = None
    elapsed_seconds: float = 0
    inference_fps: float | None = None
    sampled: bool = False
    frame_stride: int = 1


class Analysis(BaseModel):
    id: str
    filename: str
    media_type: Literal["image", "video"]
    status: Literal["queued", "processing", "completed", "failed", "cancelled"] = "queued"
    progress: float = 0
    stage: str = "En attente"
    model_id: str
    model_name: str
    confidence: float
    created_at: str = Field(default_factory=utc_now)
    updated_at: str = Field(default_factory=utc_now)
    error: str | None = None
    source_url: str
    preview_url: str | None = None
    annotated_url: str | None = None
    annotated_playable: bool = False
    metadata: MediaMetadata
    summary: Summary = Field(default_factory=Summary)
    detections: list[Detection] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class AnalysisList(BaseModel):
    items: list[Analysis]
    total: int
