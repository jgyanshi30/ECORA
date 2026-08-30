"""Env-driven configuration (CLAUDE.md §6, §10). The model path/runtime must
never be hardcoded — YOLO_MODEL_PATH + YOLO_RUNTIME select which weights and
which code path (ultralytics vs onnxruntime) load at startup.
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    yolo_model_path: str = Field(default="./models/best.pt", alias="YOLO_MODEL_PATH")
    yolo_runtime: Literal["pt", "onnx"] = Field(default="pt", alias="YOLO_RUNTIME")
    model_version: str = Field(default="yolo26s-underwater-v1", alias="MODEL_VERSION")

    # Confidence threshold applied when filtering raw model output. Not part
    # of the CLAUDE.md §6 contract explicitly, but required to turn a raw
    # detection tensor into the response's `detections` list.
    confidence_threshold: float = Field(default=0.25, alias="YOLO_CONFIDENCE_THRESHOLD")

    # CLAUDE.md §11: server-side file-type + size validation on upload.
    max_upload_size_bytes: int = Field(default=15 * 1024 * 1024, alias="MAX_UPLOAD_SIZE_BYTES")
    allowed_mime_types: tuple[str, ...] = ("image/jpeg", "image/png", "image/webp")

    # Where annotated images are written for this service to serve locally.
    # In production the Celery worker fetches this and re-uploads to the
    # S3-compatible object store behind a signed URL (CLAUDE.md §5, §11) —
    # this service is not the public-facing image host.
    results_dir: str = Field(default="./results", alias="RESULTS_DIR")

    @field_validator("yolo_model_path")
    @classmethod
    def _resolve_path(cls, v: str) -> str:
        return str(Path(v))


settings = Settings()
