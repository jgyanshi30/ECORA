"""Runner interface — CLAUDE.md §6 treats .pt (ultralytics) and .onnx
(onnxruntime) as two different code paths, not interchangeable pre/post-
processing. Both implementations return the same normalized shape so
app/main.py doesn't need to know which runtime is active.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from PIL.Image import Image


@dataclass(frozen=True)
class RawDetection:
    class_id: int
    class_name: str
    confidence: float
    x1: float
    y1: float
    x2: float
    y2: float


class InferenceRunner(Protocol):
    """Implemented by PtRunner and OnnxRunner."""

    def infer(self, image: Image, confidence_threshold: float) -> list[RawDetection]:
        """Runs the model on a PIL image (original resolution, RGB) and
        returns detections with bbox coordinates already rescaled back to
        that image's coordinate space."""
        ...
