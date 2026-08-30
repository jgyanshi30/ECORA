-- One-time email verification links. Only a SHA-256 hash of the token is
-- stored (same reasoning as password storage) — the raw token exists only in
-- the emailed URL, never persisted, so a DB leak alone can't be used to
-- verify arbitrary accounts.
CREATE TABLE email_verification_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens (user_id);
