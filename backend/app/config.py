"""Local deployment settings; importing the API never imports Torch."""

import os
from dataclasses import dataclass, field
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    models_dir: Path = field(default_factory=lambda: Path(os.getenv("RDD_MODELS_DIR", PROJECT_ROOT / "models")))
    data_dir: Path = field(default_factory=lambda: Path(os.getenv("RDD_DATA_DIR", PROJECT_ROOT / "runtime")))
    image_max_bytes: int = 25 * 1024 * 1024
    video_max_bytes: int = 250 * 1024 * 1024
    image_max_pixels: int = 40_000_000
    video_max_seconds: int = 300
    video_max_samples: int = 1800
    response_max_detections: int = 2000
    max_queue: int = 12
    cors_origins: tuple[str, ...] = ("http://localhost:5173", "http://127.0.0.1:5173")
