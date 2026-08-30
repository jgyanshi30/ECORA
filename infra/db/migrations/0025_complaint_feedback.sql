-- Citizen satisfaction rating after a complaint is RESOLVED. Not in
-- CLAUDE.md §5's original entity list — added for the citizen complaint-
-- detail page's "reopen/satisfaction-rating after resolution" requirement.
-- A dedicated append-only table (not columns on `complaints`) matches this
-- schema's existing style (status_history, risk_assessments) and allows a
-- complaint that gets reopened and resolved again to be rated more than
-- once without losing the earlier rating.
CREATE TABLE complaint_feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints (id) ON DELETE CASCADE,
  citizen_id   UUID NOT NULL REFERENCES users (id),
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_complaint_feedback_complaint_id ON complaint_feedback (complaint_id);
