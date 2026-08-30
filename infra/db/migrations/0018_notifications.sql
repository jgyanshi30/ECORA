-- CLAUDE.md §5: Notifications. Provider (email/SMS) is not yet decided
-- (CLAUDE.md §13) — this table is provider-agnostic (channel + message only).
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users (id),
  complaint_id  UUID REFERENCES complaints (id) ON DELETE CASCADE,
  channel       TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'in_app')),
  type          TEXT NOT NULL,
  message       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at       TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user_id ON notifications (user_id);
CREATE INDEX idx_notifications_status ON notifications (status);
