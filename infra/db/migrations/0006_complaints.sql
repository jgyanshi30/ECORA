-- CLAUDE.md §5: Complaints — internal PK is UUID; the human-readable
-- complaint_number (CLAUDE.md §4) is the only user-facing identifier.
-- complaint_number is generated server-side by the app (with a DB uniqueness
-- retry loop) — the CHECK below only enforces the format contract, it does
-- not generate values.
CREATE TABLE complaints (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_number TEXT NOT NULL UNIQUE
    CHECK (complaint_number ~ '^CLN-[0-9]{8}-[A-Z0-9]{6}$'),
  citizen_id       UUID NOT NULL REFERENCES users (id),
  location_id      UUID NOT NULL REFERENCES locations (id),
  status           complaint_status NOT NULL DEFAULT 'SUBMITTED',
  description      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_complaints_status ON complaints (status);
CREATE INDEX idx_complaints_citizen_id ON complaints (citizen_id);
CREATE INDEX idx_complaints_created_at ON complaints (created_at);
