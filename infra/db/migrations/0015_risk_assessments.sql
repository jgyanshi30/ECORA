-- CLAUDE.md §7: RiskAssessments — append-only history. Always stores the
-- factor breakdown (why), never just the final level. An admin override
-- requires a mandatory reason (enforced below) and never overwrites a prior
-- assessment row — it supersedes it by inserting a new row and flipping
-- is_current on the old one in the same transaction.
CREATE TABLE risk_assessments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id     UUID NOT NULL REFERENCES complaints (id) ON DELETE CASCADE,
  risk_level       risk_level NOT NULL,
  score            NUMERIC(6, 3) NOT NULL,
  factor_breakdown JSONB NOT NULL, -- weighted per-factor contributions (CLAUDE.md §7)
  is_admin_override BOOLEAN NOT NULL DEFAULT FALSE,
  override_reason  TEXT,
  overridden_by    UUID REFERENCES users (id),
  is_current       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (NOT is_admin_override OR override_reason IS NOT NULL)
);

CREATE INDEX idx_risk_assessments_complaint_id ON risk_assessments (complaint_id);

-- At most one "current" risk assessment per complaint at any time.
CREATE UNIQUE INDEX uq_risk_assessments_current_per_complaint
  ON risk_assessments (complaint_id)
  WHERE is_current;
