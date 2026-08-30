-- Bug fix: the complaint wizard's location step has always collected an
-- optional "landmark / location instructions" field (CLAUDE.md's location-
-- capture requirements), but `locations` never had a column for it — the
-- value was silently dropped at submission instead of persisted. Never edit
-- an already-applied numbered migration (0005) — add the missing column here.
ALTER TABLE locations ADD COLUMN landmark TEXT;
