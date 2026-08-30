-- CLAUDE.md §5: AdminNotes — excluded from every citizen-facing serializer at
-- the schema/DTO level (app layer), not filtered ad hoc per route.
CREATE TABLE admin_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id  UUID NOT NULL REFERENCES complaints (id) ON DELETE CASCADE,
  admin_id      UUID NOT NULL REFERENCES users (id),
  note          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_notes_complaint_id ON admin_notes (complaint_id);
