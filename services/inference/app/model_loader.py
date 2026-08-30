"""Loads whichever of .pt/.onnx fits YOLO_RUNTIME (CLAUDE.md §6). Keeps the
two runtimes as genuinely separate code paths rather than a shared abstraction
that papers over their different pre/post-processing needs.
"""

from __future__ import annotations

from functools import lru_cache

from app.config import settings
from app.inference.base import InferenceRunner


@lru_cache(maxsize=1)
def get_runner() -> InferenceRunner:
    if settings.yolo_runtime == "onnx":
        from app.inference.onnx_runner import OnnxRunner

        return OnnxRunner(settings.yolo_model_path)
    elif settings.yolo_runtime == "pt":
        from app.inference.pt_runner import PtRunner

        return PtRunner(settings.yolo_model_path)
    raise ValueError(f"Unknown YOLO_RUNTIME: {settings.yolo_runtime!r}")
