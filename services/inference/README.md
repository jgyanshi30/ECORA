---
title: Ecora Inference
emoji: 🌊
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
---

# services/inference

FastAPI microservice wrapping the YOLO26 underwater-debris detector.
Independent of the Next.js app so the model can be swapped without a frontend rebuild.

The YAML frontmatter above is Hugging Face Spaces' own required Docker-SDK
metadata (title/emoji/colors are cosmetic; `sdk: docker` and `app_port: 7860`
are load-bearing) — see DEPLOY.md at the repo root for the full deployment
walkthrough. It's inert everywhere else this file is read (local dev, this
monorepo's own docs).

## Setup

```bash
cd services/inference
python -m venv .venv
.venv/Scripts/activate        # Windows; `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
cp .env.example .env           # defaults to YOLO_RUNTIME=pt
```

`services/inference/models/best.pt` and `best.onnx` are already in place.
`.pt` and `.onnx` are two genuinely different code paths (`app/inference/pt_runner.py`
vs `app/inference/onnx_runner.py`), not interchangeable pre/post-processing —
see the comments in each for why. Switch via `YOLO_RUNTIME=pt|onnx` in `.env`.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

- `GET /health` — reports the active runtime/model version and whether the
  model loaded successfully.
- `POST /infer` — multipart form: `complaint_id` (must already match
  `CLN-YYYYMMDD-XXXXXX`), `image` (JPEG/PNG/WEBP file), optional
  `confidence_threshold` (float, default from `YOLO_CONFIDENCE_THRESHOLD`).
  Returns detected debris category, confidence score, bounding-box
  coordinates, object count, an annotated-image URL, model version,
  inference time, and an `inference_timestamp` field. This endpoint is
  internal — called synchronously from the Next.js submission server
  action (`apps/web/lib/inference/process-job.ts`), not directly by a
  citizen's browser. The current deployment calls it in-request rather
  than through an async queue/worker, a deliberate simplification for a
  $0, no-sustained-load deployment — see the root README's "Architecture
  notes" section.

This service does not generate complaint numbers and does not persist
anything to Postgres; it only validates the format of the `complaint_id` it's
given and returns detections. Persistence (InferenceResults, Detections,
status transition to UNDER_REVIEW) is the caller's job.

The annotated image is written locally under `RESULTS_DIR` (default
`./results`) and served at `/results/<complaint_id>.jpg` for the caller to
fetch. The caller re-uploads it to the app's own S3-compatible object store
behind a signed URL — this service is never the public-facing image host.

## Tests

```bash
pytest
```

Tests force `YOLO_RUNTIME=onnx` (see `tests/conftest.py`) since it has no
heavy GPU/torch dependency at test time and is fully deterministic given the
same input bytes.

## Model I/O facts (verified against best.onnx metadata, not guessed)

- Input: `imgsz=[640,640]`, 3 channels, RGB (no grayscale conversion).
- Output: `output0` shape `(batch, 300, 6)`, each row
  `[x1, y1, x2, y2, confidence, class_id]` in absolute pixel coordinates of
  the 640x640 input space, pre-sorted by descending confidence.
- `end2end: True` in the export args — the graph's own top-300 selection is
  final. The ONNX path applies only a confidence threshold; it does **not**
  run a second NMS pass (that would double-suppress/mis-filter already-final
  boxes). The `.pt` path via `ultralytics.YOLO().predict()` always returns
  final NMS'd `Results` regardless of architecture — Ultralytics handles that
  internally, so no manual NMS call is needed there either, for a different
  reason.
