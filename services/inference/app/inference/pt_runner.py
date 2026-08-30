"""PyTorch path via ultralytics — dev/GPU-friendly (CLAUDE.md §6).

Unlike the raw ONNX Runtime path, `ultralytics.YOLO(...).predict()` always
returns final, already-non-max-suppressed `Results` regardless of whether the
underlying architecture is end2end — Ultralytics' standard postprocessing
handles this internally, so we must NOT re-implement or second-guess NMS
here (CLAUDE.md §6). This is a genuinely different code path from
onnx_runner.py, not a shared pre/post-processing helper.
"""

from __future__ import annotations

from PIL.Image import Image
from ultralytics import YOLO

from app.constants import DEBRIS_CLASSES, EXPECTED_IMGSZ
from app.inference.base import RawDetection


class PtRunner:
    def __init__(self, model_path: str) -> None:
        self._model = YOLO(model_path)

    def infer(self, image: Image, confidence_threshold: float) -> list[RawDetection]:
        image = image.convert("RGB")
        results = self._model.predict(
            source=image,
            imgsz=EXPECTED_IMGSZ[0],
            conf=confidence_threshold,
            verbose=False,
        )

        detections: list[RawDetection] = []
        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue
            for box in boxes:
                class_id = int(box.cls[0])
                class_name = DEBRIS_CLASSES.get(class_id, result.names.get(class_id, str(class_id)))
                x1, y1, x2, y2 = (float(v) for v in box.xyxy[0])
                detections.append(
                    RawDetection(
                        class_id=class_id,
                        class_name=class_name,
                        confidence=float(box.conf[0]),
                        x1=x1,
                        y1=y1,
                        x2=x2,
                        y2=y2,
                    )
                )
        return detections
