-- CLAUDE.md §6: InferenceResults — persists the full /infer response contract
-- (raw_response) plus queryable columns, so both structured queries and full
-- audit replay are possible without re-calling the model.
CREATE TABLE inference_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id        UUID NOT NULL REFERENCES complaints (id) ON DELETE CASCADE,
  model_version_id    UUID NOT NULL REFERENCES model_versions (id),
  object_count        INTEGER NOT NULL DEFAULT 0,
  annotated_image_id  UUID REFERENCES complaint_images (id),
  inference_time_ms   INTEGER,
  raw_response        JSONB NOT NULL,
  inferred_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inference_results_complaint_id ON inference_results (complaint_id);
