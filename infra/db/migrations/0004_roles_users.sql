-- CLAUDE.md §5: Roles + Users.
CREATE TABLE roles (
  name TEXT PRIMARY KEY CHECK (name IN ('citizen', 'admin'))
);

INSERT INTO roles (name) VALUES ('citizen'), ('admin');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, -- bcrypt/argon2 (CLAUDE.md §11) — hashed at the app layer, never plaintext
  role          TEXT NOT NULL DEFAULT 'citizen' REFERENCES roles (name),
  full_name     TEXT NOT NULL,
  phone         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at    TIMESTAMPTZ, -- soft delete, supports the account-deletion request flow (CLAUDE.md §11)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON users (role);
