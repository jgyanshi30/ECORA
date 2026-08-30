# Deploys services/inference as a Hugging Face Spaces "Docker" Space
# (CLAUDE.md §13 — free hackathon hosting; see the root DEPLOY.md for the
# full deployment walkthrough, including why best.onnx/best.pt aren't in
# this git history and how to get them into the Space separately).
#
# Runs the ONNX path only (YOLO_RUNTIME=onnx) — CLAUDE.md §6 calls this "the
# lighter-weight/CPU-friendly deployment option", which matters here: HF
# Spaces' free tier is CPU-only, and app/model_loader.py's runtime selection
# is a lazy import (only the branch matching YOLO_RUNTIME actually imports
# its module), so the .pt path's `ultralytics` (and the multi-hundred-MB
# `torch` it pulls in) is never touched and doesn't need to be installed at
# all for this image — see requirements-deploy.txt.
FROM python:3.11-slim

# HF Spaces containers run as uid 1000 — create that user and switch to it
# before any COPY/RUN, matching Hugging Face's own documented pattern, or
# later file-permission errors are hard to diagnose from the build log alone.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH
WORKDIR $HOME/app

RUN pip install --no-cache-dir --upgrade pip

COPY --chown=user requirements-deploy.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=user app ./app
# best.onnx must exist here at build time — it is NOT in this git history
# (see .gitignore) and must be added to the Space repo separately (git-lfs
# push or the Hub web UI's file upload). See DEPLOY.md.
COPY --chown=user models ./models

ENV YOLO_MODEL_PATH=./models/best.onnx \
    YOLO_RUNTIME=onnx \
    MODEL_VERSION=yolo26s-underwater-v1 \
    RESULTS_DIR=./results

# Ephemeral by design — process-job.ts fetches the annotated image and
# re-uploads it to R2 immediately after each /infer call, so losing this
# directory's contents on a Space restart (HF Spaces' documented behavior
# for anything outside an attached Storage Bucket) never loses real data.
RUN mkdir -p results

EXPOSE 7860
# Shell-form CMD (not exec-form) so ${PORT} actually expands: Hugging Face
# Spaces expects a fixed 7860 (this README's app_port) and never sets
# $PORT, so the fallback applies there; Render's free web service injects
# $PORT itself (commonly 10000) and requires binding to it — one Dockerfile
# works for both documented targets without an if/else.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}
