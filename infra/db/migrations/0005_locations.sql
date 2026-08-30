-- CLAUDE.md §5: Locations — geography(Point,4326) plus accuracy, altitude,
-- EXIF-derived coords (kept separate from the user-confirmed/dragged pin),
-- and full address fields.
--
-- Privacy note (CLAUDE.md §0, §9): `geog` is the exact, admin-only point.
-- Public-facing views must never serve it directly — the app layer derives a
-- jittered/generalized display point at serialization time (deterministically
-- seeded off the complaint id, so it doesn't jump between loads). We do not
-- persist a second "jittered" column: storing two coordinates for the same
-- fact invites drift, and the exact point must remain the single source of
-- truth. Citizen-facing DTOs must omit `geog`/`exif_lat`/`exif_lng` at the
-- schema level, not by ad hoc per-route filtering (CLAUDE.md §5).
CREATE TABLE locations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geog                 GEOGRAPHY(Point, 4326) NOT NULL,
  accuracy_meters      NUMERIC,
  altitude_meters      NUMERIC,
  exif_lat             DOUBLE PRECISION,
  exif_lng             DOUBLE PRECISION,
  locality             TEXT,
  city                 TEXT,
  district             TEXT,
  state                TEXT,
  pin_code             TEXT,
  consent_given        BOOLEAN NOT NULL DEFAULT FALSE, -- per-complaint location-collection consent (CLAUDE.md §11)
  consent_captured_at  TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_locations_geog ON locations USING GIST (geog);
