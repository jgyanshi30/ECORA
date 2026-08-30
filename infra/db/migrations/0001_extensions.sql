-- Extensions required by the schema.
-- pgcrypto: gen_random_uuid() for UUID primary keys everywhere (CLAUDE.md §5).
-- postgis:  geography(Point,4326) for lat/lng + PostGIS proximity/region queries (CLAUDE.md §5, §9).
-- citext:   case-insensitive unique emails without hand-rolled lower() indexes.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS citext;
