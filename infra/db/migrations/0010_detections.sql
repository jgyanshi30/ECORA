-- CLAUDE.md §0, §6: Detections — one row per bounding box from a single
-- InferenceResults response.
--
-- The ai_* columns are the original model output and are NEVER overwritten.
-- An admin correction (recategorize/reject) is recorded in the admin_* columns
-- alongside the untouched original, plus a full before/after row in
-- audit_logs (CLAUDE.md §5) for every mutation. "Rerun" creates a brand new
-- InferenceResults + Detections set rather than mutating this row.
CREATE TABLE detections (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inference_result_id       UUID NOT NULL REFERENCES inference_results (id) ON DELETE CASCADE,

  ai_class_id               SMALLINT NOT NULL REFERENCES debris_classes (class_id),
  ai_class_name             TEXT NOT NULL, -- denormalized snapshot; immutable even if debris_classes changes later
  ai_confidence             NUMERIC(5, 4) NOT NULL CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  ai_bbox_x1                NUMERIC NOT NULL,
  ai_bbox_y1                NUMERIC NOT NULL,
  ai_bbox_x2                NUMERIC NOT NULL,
  ai_bbox_y2                NUMERIC NOT NULL,

  admin_reviewed            BOOLEAN NOT NULL DEFAULT FALSE,
  admin_rejected            BOOLEAN NOT NULL DEFAULT FALSE,
  admin_corrected_class_name TEXT REFERENCES debris_classes (class_name),
  admin_note                TEXT,
  admin_reviewed_by         UUID REFERENCES users (id),
  admin_reviewed_at         TIMESTAMPTZ,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (admin_reviewed_at IS NULL OR admin_reviewed = TRUE)
);

CREATE INDEX idx_detections_inference_result_id ON detections (inference_result_id);
CREATE INDEX idx_detections_ai_class_id ON detections (ai_class_id);
