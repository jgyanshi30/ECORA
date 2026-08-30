import { COMPLAINT_STATUSES, type ComplaintStatus } from "@ecora/shared";

import { StatusBadge } from "@/components/domain/status-badge";

export function StatusCounts({ counts }: { counts: Record<ComplaintStatus, number> }) {
  return (
    <div className="flex flex-wrap gap-3">
      {COMPLAINT_STATUSES.map((status) => (
        <div key={status} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <StatusBadge status={status} />
          <span className="text-sm font-semibold tabular-nums">{counts[status] ?? 0}</span>
        </div>
      ))}
    </div>
  );
}
