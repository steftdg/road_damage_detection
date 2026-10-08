"""Explicit local weight registry and a lazy, serial YOLO adapter."""

import importlib.util
from pathlib import Path
from typing import Protocol

from .schemas import ModelInfo

MODELS = (
    ModelInfo(id="baseline", name="YOLOv8n · Baseline", filename="yolov8n_baseline.pt", architecture="YOLOv8n", epochs=15, image_size=640, map50=0.515, description="Validation du pipeline · 15 epochs"),
    ModelInfo(id="final", name="YOLOv8n · Référence", filename="yolov8n_final.pt", architecture="YOLOv8n", epochs=80, image_size=640, map50=0.599, description="Le compromis retenu entre précision et vitesse", recommended=True),
    ModelInfo(id="small", name="YOLOv8s · Précision", filename="yolov8s.pt", architecture="YOLOv8s", epochs=80, image_size=640, map50=0.606, description="Une architecture plus lourde pour comparaison"),
    ModelInfo(id="high-resolution", name="YOLOv8n · Haute résolution", filename="yolov8n_imgsz960.pt", architecture="YOLOv8n", epochs=80, image_size=960, map50=0.606, description="Résolution de 960 px pour les détails fins"),
)
LABELS = {"D20": "Fissure alligator", "D40": "Nid-de-poule"}


def canonical_class(name: str) -> str | None:
    normalized = "".join(character for character in name.upper() if character.isalnum())
    aliases = {"D20": "D20", "ALLIGATORCRACK": "D20", "ALLIGATORCRACKS": "D20", "FISSUREALLIGATOR": "D20", "D40": "D40", "POTHOLE": "D40", "POTHOLES": "D40", "NIDDEPOULE": "D40"}
    return aliases.get(normalized)


class Detector(Protocol):
    def predict(self, frame, confidence: float, image_size: int) -> list[dict]: ...


class YoloDetector:
    def __init__(self, path: Path):
        # An absolute existing path prevents Ultralytics auto-downloading another model.
        if not path.is_file():
            raise RuntimeError("Le fichier de poids du modèle n'est plus disponible.")
        from ultralytics import YOLO

        self.model = YOLO(str(path.resolve()), task="detect")
        raw_names = self.model.names
        self.classes = {int(key): canonical_class(str(value)) for key, value in raw_names.items()}
        if set(self.classes.values()) != {"D20", "D40"} or len(self.classes) != 2:
            raise RuntimeError("Les poids ne correspondent pas aux deux classes entraînées D20/D40. Vérifiez le fichier .pt.")

    def predict(self, frame, confidence: float, image_size: int) -> list[dict]:
        result = self.model.predict(frame, conf=confidence, imgsz=image_size, max_det=100, verbose=False, save=False)[0]
        detections = []
        if result.boxes is None:
            return detections
        for box in result.boxes:
            class_id = int(box.cls.item())
            class_code = self.classes[class_id]
            detections.append({"class_id": class_id, "class_code": class_code, "label": LABELS[class_code], "confidence": round(float(box.conf.item()), 6), "bbox": [round(float(value), 2) for value in box.xyxy[0].tolist()]})
        return detections


class ModelRegistry:
    def __init__(self, models_dir: Path):
        self.models_dir = models_dir.resolve()
        self._loaded: dict[str, Detector] = {}

    def list(self) -> list[ModelInfo]:
        return [model.model_copy(update={"available": (self.models_dir / model.filename).is_file()}) for model in MODELS]

    def get(self, model_id: str) -> ModelInfo | None:
        return next((model for model in self.list() if model.id == model_id), None)

    @property
    def runtime_available(self) -> bool:
        return importlib.util.find_spec("ultralytics") is not None

    def load(self, model_id: str) -> Detector:
        model = self.get(model_id)
        if model is None or not model.available:
            raise RuntimeError("Modèle indisponible. Déposez les poids entraînés dans models/.")
        if model_id not in self._loaded:
            # Retain one model at a time, keeping memory bounded for CPU deployments.
            self._loaded.clear()
            self._loaded[model_id] = YoloDetector(self.models_dir / model.filename)
        return self._loaded[model_id]
