"""Small Python mirror of packages/shared (CLAUDE.md §1: "mirrored in Python
via a small constants module in services/inference"). This is NOT imported
from the TypeScript package — it's a separate runtime, kept in sync by hand.
A class-list change requires updating all three copies:
  - packages/shared/src/debris-classes.ts
  - infra/db/migrations/0003_debris_classes.sql
  - this file

Confirmed model class list (CLAUDE.md §6), verified directly against
services/inference/models/best.onnx embedded Ultralytics metadata
(`names` property) at build time — id-ordered, do not reorder.
"""

from __future__ import annotations

import re

DEBRIS_CLASSES: dict[int, str] = {
    0: "Mask",
    1: "can",
    2: "cellphone",
    3: "electronics",
    4: "gbottle",
    5: "glove",
    6: "metal",
    7: "misc",
    8: "net",
    9: "pbag",
    10: "pbottle",
    11: "plastic",
    12: "rod",
    13: "sunglasses",
    14: "tire",
}

DEBRIS_CLASS_NAMES: tuple[str, ...] = tuple(DEBRIS_CLASSES.values())

# CLAUDE.md §4: CLN-YYYYMMDD-XXXXXX. This service only validates the format
# (a complaint_id must already exist, minted server-side by apps/web) — it
# never generates complaint numbers itself.
COMPLAINT_NUMBER_REGEX = re.compile(r"^CLN-\d{8}-[A-Z0-9]{6}$")


def is_valid_complaint_number(value: str) -> bool:
    return bool(COMPLAINT_NUMBER_REGEX.match(value))


# Model I/O facts (CLAUDE.md §6), verified at load time against best.onnx —
# see app/model_loader.py. Declared here as the expected/asserted values.
EXPECTED_IMGSZ = (640, 640)
EXPECTED_CHANNELS = 3
