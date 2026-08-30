-- CLAUDE.md §3: every transition is written here (who, when, from->to, note).
-- `note` is internal-only and must never be included in a citizen-facing
-- serializer (CLAUDE.md §3, §5) — see public_updates for the citizen-visible
-- subset of this history.
CREATE TABLE status_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id  UUID NOT NULL REFERENCES complaints (id) ON DELETE CASCADE,
  from_status   complaint_status,
  to_status     complaint_status NOT NULL,
  changed_by    UUID REFERENCES users (id), -- NULL = system/worker-initiated transition
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_history_complaint_id ON status_history (complaint_id);
