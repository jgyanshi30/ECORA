-- Canonical enums mirrored 1:1 from packages/shared (CLAUDE.md §3, §5, §7).
-- A value change here requires the matching change in:
--   packages/shared/src/enums/*.ts

-- Note: Roles (citizen | admin) is intentionally NOT a Postgres enum here —
-- CLAUDE.md §5 lists Roles as its own entity, so it is a real lookup table
-- (see 0004_roles_users.sql) that users.role foreign-keys against, checked
-- server-side on every protected route (never a UI-only distinction).

-- CLAUDE.md §3: canonical complaint status lifecycle.
CREATE TYPE complaint_status AS ENUM (
  'SUBMITTED',
  'AI_ANALYSIS_PENDING',
  'UNDER_REVIEW',
  'ASSIGNED',
  'ACTION_IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'REJECTED_DUPLICATE'
);

-- CLAUDE.md §7: risk levels.
CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
