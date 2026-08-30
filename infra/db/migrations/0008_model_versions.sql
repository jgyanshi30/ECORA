-- CLAUDE.md §5, §6: ModelVersions — one row per deployed inference model.
-- class_map snapshots the id->name mapping active for that version, so a
-- future model with reordered/changed class ids can never corrupt how past
-- Detections rows are interpreted.
CREATE TABLE model_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version     TEXT NOT NULL UNIQUE, -- e.g. 'yolo26s-underwater-v1', matches MODEL_VERSION env var
  runtime     TEXT NOT NULL CHECK (runtime IN ('pt', 'onnx')),
  model_path  TEXT NOT NULL,
  class_map   JSONB NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
