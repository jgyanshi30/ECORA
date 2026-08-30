-- Auth step (CLAUDE.md §1 auth choice, §11 RBAC/security): tracks whether a
-- citizen has confirmed ownership of their email address. NULL = unverified.
-- Login is not blocked on this (product choice — see apps/web/README auth
-- notes); it's surfaced in the profile UI and reserved for gating
-- higher-trust actions later (e.g. complaint submission) if needed.
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;
