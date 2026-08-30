-- CLAUDE.md §5: ResolutionEvidence — proof of cleanup/treatment submitted by an admin.
CREATE TABLE resolution_evidence (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id  UUID NOT NULL REFERENCES complaints (id) ON DELETE CASCADE,
  storage_key   TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  description   TEXT,
  submitted_by  UUID NOT NULL REFERENCES users (id),
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resolution_evidence_complaint_id ON resolution_evidence (complaint_id);
