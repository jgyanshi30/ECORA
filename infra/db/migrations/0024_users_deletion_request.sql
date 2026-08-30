-- CLAUDE.md §11: account-deletion request flow. Separate from `deleted_at`
-- (which marks the account as actually, finally deleted/soft-deleted) — this
-- column only records that the citizen has asked for deletion. Acting on the
-- request (data purge/anonymization, an ops/admin process) is out of scope
-- here; this migration only adds the durable record of the request itself.
ALTER TABLE users ADD COLUMN deletion_requested_at TIMESTAMPTZ;
