"""Synthetic fixtures exercise plumbing only; they never claim model accuracy."""

import io
import json
import sqlite3
import threading
import time
from pathlib import Path
from uuid import uuid4

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.app.config import PROJECT_ROOT, Settings
from backend.app.main import create_app
from backend.app.registry import ModelRegistry, canonical_class


class SyntheticDetector:
    """Only tests inject this adapter; the application has no fake detector path."""

    def __init__(self):
        self.started = threading.Event()
        self.block: threading.Event | None = None

    def predict(self, frame, confidence, image_size):
        self.started.set()
        if self.block:
            self.block.wait(timeout=5)
        return [{"class_id": 0, "class_code": "D20", "label": "Fissure alligator", "confidence": 0.88, "bbox": [3.0, 4.0, 30.0, 28.0]}]


class SyntheticRegistry(ModelRegistry):
    def __init__(self, models_dir):
        super().__init__(models_dir)
        self.detector = SyntheticDetector()

    @property
    def runtime_available(self):
        return True

    def list(self):
        return [model.model_copy(update={"available": True}) for model in super().list()]

    def load(self, model_id):
        return self.detector


@pytest.fixture
def settings():
    # Retain test artifacts instead of using auto-cleaned temporary directories.
    directory = PROJECT_ROOT / "runtime" / "test-runs" / uuid4().hex
    directory.mkdir(parents=True, exist_ok=False)
    return Settings(data_dir=directory, models_dir=directory / "weights")


@pytest.fixture
def image_bytes():
    buffer = io.BytesIO()
    Image.new("RGB", (64, 48), "#6b7862").save(buffer, format="PNG")
    return buffer.getvalue()


def wait_terminal(client, analysis_id):
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        analysis = client.get(f"/api/analyses/{analysis_id}").json()
        if analysis["status"] in {"completed", "failed", "cancelled"}:
            return analysis
        time.sleep(0.02)
    pytest.fail("The synthetic inference job did not finish")


def test_health_and_missing_weights_are_honest(settings, image_bytes):
    with TestClient(create_app(settings)) as client:
        health = client.get("/api/health").json()
        assert health["status"] == "ok"
        assert health["inference_ready"] is False
        models = client.get("/api/models").json()
        assert models["default_model_id"] == "final"
        assert len(models["models"]) == 4
        assert all(model["available"] is False for model in models["models"])
        response = client.post("/api/analyses", files={"file": ("route.png", image_bytes, "image/png")})
        assert response.status_code == 409
        assert response.json()["detail"]["code"] == "model_unavailable"
        assert client.get("/api/analyses").json() == {"items": [], "total": 0}


def test_invalid_media_and_parameters_do_not_create_results(settings, image_bytes):
    registry = SyntheticRegistry(settings.models_dir)
    with TestClient(create_app(settings, registry)) as client:
        invalid = client.post("/api/analyses", files={"file": ("broken.png", b"not a PNG", "image/png")})
        assert invalid.status_code == 422
        assert invalid.json()["detail"]["code"] == "invalid_media"
        unsupported = client.post("/api/analyses", files={"file": ("route.svg", b"<svg/>", "image/svg+xml")})
        assert unsupported.status_code == 415
        for data in [{"model_id": "unknown"}, {"confidence": "0.99"}, {"confidence": "nan"}]:
            assert client.post("/api/analyses", data=data, files={"file": ("route.png", image_bytes)}).status_code == 422
        assert client.get("/api/analyses").json()["total"] == 0
    assert list((settings.data_dir / "analyses").glob("*/source.png")), "Rejected received files must be retained"


def test_image_size_limit_rejects_before_storing(settings, image_bytes):
    settings = Settings(data_dir=settings.data_dir, models_dir=settings.models_dir, image_max_bytes=32)
    registry = SyntheticRegistry(settings.models_dir)
    with TestClient(create_app(settings, registry)) as client:
        response = client.post("/api/analyses", files={"file": ("route.png", image_bytes, "image/png")})
        assert response.status_code == 413
        assert response.json()["detail"]["code"] == "file_too_large"
        assert client.get("/api/analyses").json()["total"] == 0
    assert not (settings.data_dir / "analyses").exists()


def test_real_api_plumbing_with_explicit_synthetic_detector(settings, image_bytes):
    registry = SyntheticRegistry(settings.models_dir)
    with TestClient(create_app(settings, registry)) as client:
        response = client.post("/api/analyses", data={"confidence": "0.3"}, files={"file": ("../../route.png", image_bytes, "image/png")})
        assert response.status_code == 202
        analysis_id = response.json()["id"]
        analysis = wait_terminal(client, analysis_id)
        assert analysis["status"] == "completed", analysis
        assert analysis["filename"] == "route.png"
        assert analysis["summary"]["counts"] == {"D20": 1, "D40": 0}
        assert analysis["summary"]["processed_frames"] == 1
        assert analysis["annotated_playable"] is True
        assert client.get(analysis["annotated_url"]).headers["content-type"] == "image/jpeg"
        assert client.get(f"/api/files/{analysis_id}/history.sqlite3").status_code == 404
        exported = client.get(f"/api/analyses/{analysis_id}/export?format=json")
        assert exported.json()["detections"] == analysis["detections"]
        csv = client.get(f"/api/analyses/{analysis_id}/export?format=csv")
        assert "class_code" in csv.text and "D20" in csv.text
        assert "attachment" in csv.headers["content-disposition"]
        history = client.get("/api/analyses").json()
        assert history["total"] == 1 and history["items"][0]["detections"] == []
    # Reopening the service retains completed results and the original upload.
    with TestClient(create_app(settings, registry)) as client:
        assert client.get(f"/api/analyses/{analysis_id}").json()["status"] == "completed"
    with sqlite3.connect(settings.data_dir / "history.sqlite3") as connection:
        assert connection.execute("SELECT COUNT(*) FROM snapshots").fetchone()[0] >= 3


def test_cancellation_retains_original_upload(settings, image_bytes):
    registry = SyntheticRegistry(settings.models_dir)
    registry.detector.block = threading.Event()
    with TestClient(create_app(settings, registry)) as client:
        response = client.post("/api/analyses", files={"file": ("route.png", image_bytes)})
        analysis_id = response.json()["id"]
        assert registry.detector.started.wait(timeout=3)
        cancelled = client.post(f"/api/analyses/{analysis_id}/cancel")
        assert cancelled.json()["status"] == "cancelled"
        registry.detector.block.set()
        assert client.get(response.json()["source_url"]).status_code == 200
        assert client.get(f"/api/analyses/{analysis_id}/export").status_code == 409
    assert (settings.data_dir / "analyses" / analysis_id / "source.png").is_file()


def test_video_sampling_metadata_and_complete_export(settings):
    settings = Settings(data_dir=settings.data_dir, models_dir=settings.models_dir, video_max_samples=2)
    video = settings.data_dir / "synthetic-source.avi"
    writer = cv2.VideoWriter(str(video), cv2.VideoWriter_fourcc(*"MJPG"), 10, (64, 48))
    assert writer.isOpened()
    for value in [40, 70, 100, 130, 160]:
        writer.write(np.full((48, 64, 3), value, dtype=np.uint8))
    writer.release()
    registry = SyntheticRegistry(settings.models_dir)
    with TestClient(create_app(settings, registry)) as client:
        with video.open("rb") as source:
            response = client.post("/api/analyses", files={"file": ("synthetic.avi", source, "video/x-msvideo")})
        assert response.status_code == 202, response.text
        analysis = wait_terminal(client, response.json()["id"])
        assert analysis["status"] == "completed", analysis
        assert analysis["summary"]["sampled"] is True
        assert analysis["summary"]["frame_stride"] == 3
        assert analysis["summary"]["processed_frames"] == 2
        assert [d["frame_index"] for d in analysis["detections"]] == [0, 3]
        assert analysis["metadata"]["duration_seconds"] == 0.5
        exported = client.get(f'/api/analyses/{analysis["id"]}/export').json()
        assert len(exported["detections"]) == 2
        assert client.get(analysis["annotated_url"]).status_code == 200


def test_model_names_are_not_guessed_from_class_indices():
    assert canonical_class("D20") == "D20"
    assert canonical_class("pothole") == "D40"
    assert canonical_class("alligator_crack") == "D20"
    assert canonical_class("person") is None
    assert canonical_class("0") is None
