from __future__ import annotations

import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.config import settings
from app.main import app

client = TestClient(app)

VALID_COMPLAINT_ID = "CLN-20260829-A4B721"


def _sample_jpeg_bytes(size: tuple[int, int] = (320, 240)) -> bytes:
    image = Image.new("RGB", size, color=(30, 120, 90))
    buf = io.BytesIO()
    image.save(buf, format="JPEG")
    return buf.getvalue()


def test_health_reports_active_runtime():
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["runtime"] == "onnx"
    assert body["model_version"] == settings.model_version
    assert body["model_path"] == settings.yolo_model_path
    assert body["model_loaded"] is True


def test_infer_returns_contract_shaped_response():
    files = {"image": ("sample.jpg", _sample_jpeg_bytes(), "image/jpeg")}
    data = {"complaint_id": VALID_COMPLAINT_ID}

    resp = client.post("/infer", files=files, data=data)

    assert resp.status_code == 200
    body = resp.json()

    # CLAUDE.md §6 contract fields
    assert body["complaint_id"] == VALID_COMPLAINT_ID
    assert body["model_version"] == settings.model_version
    assert isinstance(body["detections"], list)
    assert body["object_count"] == len(body["detections"])
    assert body["annotated_image_url"] == f"/results/{VALID_COMPLAINT_ID}.jpg"
    assert isinstance(body["inference_time_ms"], int)
    assert body["inference_time_ms"] >= 0
    assert "inference_timestamp" in body

    for det in body["detections"]:
        assert set(det.keys()) == {"class_id", "class_name", "confidence", "bbox"}
        assert 0 <= det["confidence"] <= 1
        assert set(det["bbox"].keys()) == {"x1", "y1", "x2", "y2"}


def test_infer_serves_the_annotated_image_over_http():
    files = {"image": ("sample.jpg", _sample_jpeg_bytes(), "image/jpeg")}
    data = {"complaint_id": VALID_COMPLAINT_ID}
    resp = client.post("/infer", files=files, data=data)
    annotated_url = resp.json()["annotated_image_url"]

    fetched = client.get(annotated_url)
    assert fetched.status_code == 200
    assert fetched.headers["content-type"] == "image/jpeg"


def test_infer_rejects_invalid_complaint_id_format():
    files = {"image": ("sample.jpg", _sample_jpeg_bytes(), "image/jpeg")}
    data = {"complaint_id": "not-a-complaint-id"}

    resp = client.post("/infer", files=files, data=data)

    assert resp.status_code == 422


def test_infer_rejects_disallowed_content_type():
    files = {"image": ("sample.gif", _sample_jpeg_bytes(), "image/gif")}
    data = {"complaint_id": VALID_COMPLAINT_ID}

    resp = client.post("/infer", files=files, data=data)

    assert resp.status_code == 422


def test_infer_rejects_content_that_is_not_actually_an_image():
    files = {"image": ("sample.jpg", b"this is not image data", "image/jpeg")}
    data = {"complaint_id": VALID_COMPLAINT_ID}

    resp = client.post("/infer", files=files, data=data)

    assert resp.status_code == 422


def test_infer_rejects_oversized_upload(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "max_upload_size_bytes", 100)
    files = {"image": ("sample.jpg", _sample_jpeg_bytes(), "image/jpeg")}
    data = {"complaint_id": VALID_COMPLAINT_ID}

    resp = client.post("/infer", files=files, data=data)

    assert resp.status_code == 422
