-- CLAUDE.md §5: Assignments — admin-to-complaint assignment history.
CREATE TABLE assignments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id   UUID NOT NULL REFERENCES complaints (id) ON DELETE CASCADE,
  assigned_to    UUID NOT NULL REFERENCES users (id),
  assigned_by    UUID NOT NULL REFERENCES users (id),
  note           TEXT,
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at  TIMESTAMPTZ
);

CREATE INDEX idx_assignments_complaint_id ON assignments (complaint_id);
CREATE INDEX idx_assignments_assigned_to ON assignments (assigned_to);
