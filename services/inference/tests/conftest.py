import os
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent

# Must be set before `app.config.settings` (a module-level singleton) is
# first imported by any test module.
os.environ.setdefault("YOLO_RUNTIME", "onnx")
os.environ.setdefault("YOLO_MODEL_PATH", str(_ROOT / "models" / "best.onnx"))
os.environ.setdefault("RESULTS_DIR", str(_ROOT / "results" / "_test"))
