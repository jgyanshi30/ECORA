-- CLAUDE.md §3: PublicUpdates — the curated, citizen-visible timeline.
-- Only a subset of status_history transitions produce a public update; a
-- purely internal touch (e.g. reassigning between admins, or a note-only
-- entry) is logged in status_history/admin_notes without one.
CREATE TABLE public_updates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id       UUID NOT NULL REFERENCES complaints (id) ON DELETE CASCADE,
  status_history_id  UUID REFERENCES status_history (id),
  message            TEXT NOT NULL, -- citizen-friendly text only, no internal detail
  created_by         UUID REFERENCES users (id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_public_updates_complaint_id ON public_updates (complaint_id);
