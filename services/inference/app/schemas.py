"""Pydantic models for the /infer contract (CLAUDE.md §6)."""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field


class BBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class Detection(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    bbox: BBox


class InferResponse(BaseModel):
    """Matches the exact contract in CLAUDE.md §6, plus `inference_timestamp`
    (additive — the prose separately requires persisting the inference
    timestamp, and this service is the only place that knows it precisely)."""

    complaint_id: str
    model_version: str
    detections: list[Detection]
    object_count: int
    annotated_image_url: str
    inference_time_ms: int
    inference_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class HealthResponse(BaseModel):
    status: str
    model_version: str
    runtime: str
    model_loaded: bool
    # Additive: the Next.js inference pipeline reads this once to upsert its
    # own `model_versions` row (version/runtime/model_path) rather than
    # duplicating YOLO_MODEL_PATH/YOLO_RUNTIME as separately-configured env
    # vars in apps/web — this service is the single source of truth for what
    # it's actually running.
    model_path: str
