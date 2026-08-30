-- CLAUDE.md §5, §9: GeneratedReports — admin-only region export / analytics reports.
CREATE TABLE generated_reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by   UUID NOT NULL REFERENCES users (id),
  report_type    TEXT NOT NULL,
  filter_params  JSONB NOT NULL DEFAULT '{}'::JSONB,
  region_geog    GEOGRAPHY(Polygon, 4326), -- admin region-select export (CLAUDE.md §9)
  storage_key    TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ
);

CREATE INDEX idx_generated_reports_requested_by ON generated_reports (requested_by);
