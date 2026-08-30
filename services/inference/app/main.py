"""FastAPI inference microservice (CLAUDE.md §1, §6).

Deliberately independent of the Next.js web app so the model can be swapped
without a frontend rebuild. Called synchronously from the submission server
action (apps/web/lib/inference/process-job.ts) for this hackathon deployment
(CLAUDE.md §13 — no queue/worker; §6 documents the production-shaped async
design this simplifies), never directly by a citizen's browser — this
service trusts its caller for authn/authz; it only guards its own input
contract. Deploy it on a private/internal network, not a publicly reachable
address (see the root README's deployment section).
"""

from __future__ import annotations

import os
import time

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.constants import is_valid_complaint_number
from app.image_utils import InvalidUploadError, load_and_validate_image, render_annotated_image
from app.model_loader import get_runner
from app.schemas import BBox, Detection, HealthResponse, InferResponse

app = FastAPI(title="Ecora — Inference Service", version="0.1.0")

os.makedirs(settings.results_dir, exist_ok=True)
app.mount("/results", StaticFiles(directory=settings.results_dir), name="results")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    model_loaded = True
    try:
        get_runner()
    except Exception:  # noqa: BLE001 - health check reports load failure, doesn't crash
        model_loaded = False
    return HealthResponse(
        status="ok" if model_loaded else "degraded",
        model_version=settings.model_version,
        runtime=settings.yolo_runtime,
        model_loaded=model_loaded,
        model_path=settings.yolo_model_path,
    )


@app.post("/infer", response_model=InferResponse)
async def infer(
    complaint_id: str = Form(...),
    image: UploadFile = File(...),
    confidence_threshold: float | None = Form(default=None),
) -> InferResponse:
    if not is_valid_complaint_number(complaint_id):
        raise HTTPException(status_code=422, detail=f"Invalid complaint_id format: {complaint_id!r}")

    raw_bytes = await image.read()
    try:
        pil_image = load_and_validate_image(raw_bytes, image.content_type)
    except InvalidUploadError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    threshold = confidence_threshold if confidence_threshold is not None else settings.confidence_threshold

    runner = get_runner()
    start = time.perf_counter()
    detections = runner.infer(pil_image, threshold)
    inference_time_ms = int((time.perf_counter() - start) * 1000)

    annotated_image_url = render_annotated_image(pil_image, detections, complaint_id)

    return InferResponse(
        complaint_id=complaint_id,
        model_version=settings.model_version,
        detections=[
            Detection(
                class_id=d.class_id,
                class_name=d.class_name,
                confidence=d.confidence,
                bbox=BBox(x1=d.x1, y1=d.y1, x2=d.x2, y2=d.y2),
            )
            for d in detections
        ],
        object_count=len(detections),
        annotated_image_url=annotated_image_url,
        inference_time_ms=inference_time_ms,
    )
