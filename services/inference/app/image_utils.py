"""Upload validation + annotated-image rendering (CLAUDE.md §11)."""

from __future__ import annotations

import io
from pathlib import Path

from PIL import Image, ImageDraw

from app.config import settings
from app.inference.base import RawDetection

# CLAUDE.md §2 primary brand color, reused for detection boxes.
_BOX_COLOR = (15, 92, 78)


class InvalidUploadError(ValueError):
    pass


def load_and_validate_image(raw_bytes: bytes, declared_content_type: str | None) -> Image.Image:
    """Server-side file-type + size validation (CLAUDE.md §11). Never trusts
    the declared content-type alone — Pillow must also be able to decode the
    bytes as one of the allowed formats."""
    if len(raw_bytes) > settings.max_upload_size_bytes:
        raise InvalidUploadError(
            f"File too large: {len(raw_bytes)} bytes (max {settings.max_upload_size_bytes})"
        )
    if declared_content_type not in settings.allowed_mime_types:
        raise InvalidUploadError(f"Unsupported content type: {declared_content_type}")

    try:
        image = Image.open(io.BytesIO(raw_bytes))
        image.verify()
        # verify() leaves the file unusable for further ops — reopen to actually load pixels.
        image = Image.open(io.BytesIO(raw_bytes))
        image.load()
    except Exception as exc:  # noqa: BLE001 - any decode failure means "not a real image"
        raise InvalidUploadError("File is not a valid JPEG/PNG/WEBP image") from exc

    if image.format not in {"JPEG", "PNG", "WEBP"}:
        raise InvalidUploadError(f"Unsupported image format: {image.format}")

    return image


def render_annotated_image(image: Image.Image, detections: list[RawDetection], complaint_id: str) -> str:
    """Draws bounding boxes + labels and writes the result under RESULTS_DIR.
    Returns the relative URL path (CLAUDE.md §6 contract's
    `annotated_image_url`) — in production the Celery worker fetches this and
    re-uploads it to S3-compatible storage behind a signed URL; this service
    is not the public-facing image host (CLAUDE.md §5, §11)."""
    annotated = image.convert("RGB").copy()
    draw = ImageDraw.Draw(annotated)
    for det in detections:
        draw.rectangle([det.x1, det.y1, det.x2, det.y2], outline=_BOX_COLOR, width=3)
        label = f"{det.class_name} {det.confidence:.2f}"
        draw.text((det.x1 + 2, max(det.y1 - 14, 0)), label, fill=_BOX_COLOR)

    results_dir = Path(settings.results_dir)
    results_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{complaint_id}.jpg"
    annotated.save(results_dir / filename, format="JPEG", quality=90)
    return f"/results/{filename}"
