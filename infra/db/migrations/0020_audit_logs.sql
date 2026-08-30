-- CLAUDE.md §5, §11: AuditLogs — every admin mutation (status change, risk
-- override, note added, assignment, detection correction), with actor,
-- timestamp, and before/after snapshots.
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES users (id), -- NULL = system-initiated action
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  before      JSONB,
  after       JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs (actor_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);
