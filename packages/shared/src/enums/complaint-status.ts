/**
 * Canonical complaint status lifecycle (CLAUDE.md §3).
 * Mirrored 1:1 as the Postgres enum `complaint_status` in
 * infra/db/migrations/0002_enums.sql — a new value requires updating both.
 */
export const ComplaintStatus = {
  SUBMITTED: "SUBMITTED",
  AI_ANALYSIS_PENDING: "AI_ANALYSIS_PENDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  ASSIGNED: "ASSIGNED",
  ACTION_IN_PROGRESS: "ACTION_IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
  REJECTED_DUPLICATE: "REJECTED_DUPLICATE",
} as const;

export type ComplaintStatus = (typeof ComplaintStatus)[keyof typeof ComplaintStatus];

export const COMPLAINT_STATUSES: readonly ComplaintStatus[] = Object.values(ComplaintStatus);

export function isComplaintStatus(value: string): value is ComplaintStatus {
  return (COMPLAINT_STATUSES as readonly string[]).includes(value);
}
