/** Risk levels (CLAUDE.md §7). Order below is severity-ascending, useful for sorting/comparison. */
export const RiskLevel = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;

export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

export const RISK_LEVELS: readonly RiskLevel[] = Object.values(RiskLevel);

/** Severity rank for sorting/comparison — not a score, just ordering. */
export const RISK_LEVEL_SEVERITY: Record<RiskLevel, number> = {
  [RiskLevel.LOW]: 0,
  [RiskLevel.MEDIUM]: 1,
  [RiskLevel.HIGH]: 2,
  [RiskLevel.CRITICAL]: 3,
};

export function isRiskLevel(value: string): value is RiskLevel {
  return (RISK_LEVELS as readonly string[]).includes(value);
}
