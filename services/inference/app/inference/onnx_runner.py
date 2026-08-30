"""ONNX Runtime path — CPU-friendly deployment option (CLAUDE.md §6).

Verified empirically against services/inference/models/best.onnx
(onnxruntime, CPUExecutionProvider) before writing this decode logic:
  - Input:  "images", dynamic batch/height/width, float32, NCHW, RGB, no
            grayscale conversion (per CLAUDE.md §6 upload-pipeline note).
  - Output: "output0", shape (1, 300, 6), float32. Each row is
            [x1, y1, x2, y2, confidence, class_id] in absolute pixel
            coordinates of the network's 640x640 input space. Rows arrive
            pre-sorted by descending confidence.

Export metadata shows `end2end: True` (one-to-one head, no duplicate boxes
to suppress) — the graph's own top-300 selection is the final output. We
apply only a confidence-threshold filter here; running a second NMS pass
would double-suppress/mis-filter already-final boxes (CLAUDE.md §6).
"""

from __future__ import annotations

import numpy as np
import onnxruntime as ort
from PIL.Image import Image

from app.constants import DEBRIS_CLASSES, EXPECTED_CHANNELS, EXPECTED_IMGSZ
from app.inference.base import RawDetection

_INPUT_SIZE = EXPECTED_IMGSZ[0]  # square input, e.g. 640


class OnnxRunner:
    def __init__(self, model_path: str) -> None:
        self._session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        self._input_name = self._session.get_inputs()[0].name
        self._validate_io()

    def _validate_io(self) -> None:
        """Verify model I/O facts at load time rather than assume them (CLAUDE.md §6)."""
        inp = self._session.get_inputs()[0]
        # dims: [batch, channels, height, width] — batch/height/width are dynamic ('batch' etc.)
        dims = inp.shape
        if len(dims) != 4:
            raise RuntimeError(f"Unexpected ONNX input rank: {dims!r}")
        channels = dims[1]
        if isinstance(channels, int) and channels != EXPECTED_CHANNELS:
            raise RuntimeError(f"Unexpected ONNX input channels: {channels} (expected {EXPECTED_CHANNELS})")

    def _letterbox(self, image: Image) -> tuple[np.ndarray, float, int, int]:
        """Resize preserving aspect ratio onto a square _INPUT_SIZE canvas,
        padding with mid-gray. Returns (chw_float32_normalized, scale, pad_x, pad_y)."""
        w, h = image.size
        scale = min(_INPUT_SIZE / w, _INPUT_SIZE / h)
        new_w, new_h = round(w * scale), round(h * scale)
        resized = image.resize((new_w, new_h))

        canvas = np.full((_INPUT_SIZE, _INPUT_SIZE, 3), 114, dtype=np.uint8)
        pad_x = (_INPUT_SIZE - new_w) // 2
        pad_y = (_INPUT_SIZE - new_h) // 2
        canvas[pad_y : pad_y + new_h, pad_x : pad_x + new_w] = np.array(resized)

        chw = canvas.astype(np.float32).transpose(2, 0, 1) / 255.0
        return chw[np.newaxis, ...], scale, pad_x, pad_y

    def infer(self, image: Image, confidence_threshold: float) -> list[RawDetection]:
        image = image.convert("RGB")
        batch, scale, pad_x, pad_y = self._letterbox(image)

        (output0,) = self._session.run(None, {self._input_name: batch})
        rows = output0[0]  # (300, 6)

        # Rows are typically pre-sorted by descending confidence (the export's
        # internal TopK), but correctness here doesn't depend on that — filter
        # the full (small, fixed 300-row) array rather than assume order and
        # break early.
        detections: list[RawDetection] = []
        for x1, y1, x2, y2, conf, cls in rows[rows[:, 4] >= confidence_threshold]:
            class_id = int(round(float(cls)))
            class_name = DEBRIS_CLASSES.get(class_id)
            if class_name is None:
                continue
            detections.append(
                RawDetection(
                    class_id=class_id,
                    class_name=class_name,
                    confidence=float(conf),
                    x1=(float(x1) - pad_x) / scale,
                    y1=(float(y1) - pad_y) / scale,
                    x2=(float(x2) - pad_x) / scale,
                    y2=(float(y2) - pad_y) / scale,
                )
            )
        return detections
