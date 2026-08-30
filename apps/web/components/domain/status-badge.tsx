import { ComplaintStatus } from "@ecora/shared";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * CLAUDE.md §2 status palette: red/amber/blue/green (+ purple, reserved for
 * the map marker only — see MapMarker, not built yet). ACTION_IN_PROGRESS
 * uses blue here since purple is scoped to the map spec, not "everywhere".
 * CLOSED / REJECTED_DUPLICATE are terminal administrative outcomes, not risk
 * signals, so they get a neutral treatment rather than reusing a risk color.
 */
const STATUS_CONFIG: Record<ComplaintStatus, { label: string; className: string }> = {
  SUBMITTED: { label: "Submitted", className: "bg-amber-100 text-amber-800 border-amber-200" },
  AI_ANALYSIS_PENDING: {
    label: "AI Analysis Pending",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  UNDER_REVIEW: { label: "Under Review", className: "bg-blue-100 text-blue-800 border-blue-200" },
  ASSIGNED: { label: "Assigned", className: "bg-blue-100 text-blue-800 border-blue-200" },
  ACTION_IN_PROGRESS: {
    label: "Action In Progress",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  RESOLVED: { label: "Resolved", className: "bg-green-100 text-green-800 border-green-200" },
  CLOSED: { label: "Closed", className: "bg-slate-100 text-slate-700 border-slate-200" },
  REJECTED_DUPLICATE: {
    label: "Rejected — Duplicate",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export interface StatusBadgeProps {
  status: ComplaintStatus;
  className?: string;
}

/** One StatusBadge for both citizen and admin surfaces (CLAUDE.md §12) — never fork per-role variants. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
