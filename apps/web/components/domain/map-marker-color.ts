import type { ComplaintStatus, RiskLevel } from "@ecora/shared";

/**
 * CLAUDE.md §2/§9: "Marker color follows the status/risk palette." One
 * function for both citizen/public and admin map surfaces (CLAUDE.md §12 —
 * never fork per-role variants). Risk is admin-only data (CLAUDE.md §0), so
 * `riskLevel` is only ever passed on the admin map; the public map always
 * gets status-only coloring.
 *
 * - Red — critical/high risk (admin map only, when risk data exists)
 * - Amber — pending (SUBMITTED, AI_ANALYSIS_PENDING)
 * - Blue — informational/under review (UNDER_REVIEW, ASSIGNED)
 * - Purple — action in progress (map marker only, per CLAUDE.md §2)
 * - Green — resolved
 * - Gray — closed/rejected (terminal, non-risk outcomes)
 */
export function getMarkerColor(status: ComplaintStatus, riskLevel?: RiskLevel | null): string {
  if (riskLevel === "CRITICAL" || riskLevel === "HIGH") return "#dc2626"; // red-600
  switch (status) {
    case "SUBMITTED":
    case "AI_ANALYSIS_PENDING":
      return "#d97706"; // amber-600
    case "UNDER_REVIEW":
    case "ASSIGNED":
      return "#2563eb"; // blue-600
    case "ACTION_IN_PROGRESS":
      return "#9333ea"; // purple-600
    case "RESOLVED":
      return "#16a34a"; // green-600
    case "CLOSED":
    case "REJECTED_DUPLICATE":
      return "#64748b"; // slate-500
    default:
      return "#64748b";
  }
}
