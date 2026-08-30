import Link from "next/link";

import { StatusBadge } from "@/components/domain/status-badge";
import type { CitizenComplaintRow, ComplaintUpdateRow } from "@/lib/complaints/citizen-dashboard";

export interface ComplaintListProps {
  complaints: CitizenComplaintRow[];
  updatesByComplaintId: Map<string, ComplaintUpdateRow[]>;
}

/** Number / date / location / status columns, each row expandable to its status timeline
 * (native <details>, same zero-JS pattern as the landing page's FAQ). */
export function ComplaintList({ complaints, updatesByComplaintId }: ComplaintListProps) {
  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-card">
      {complaints.map((complaint) => {
        const updates = updatesByComplaintId.get(complaint.id) ?? [];
        return (
          <details key={complaint.id} className="group p-4">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">{complaint.complaintNumber}</span>
                <span className="text-sm text-muted-foreground">{complaint.createdAt.toLocaleDateString()}</span>
                <span className="text-sm text-muted-foreground">
                  {complaint.locality ?? complaint.city ?? "Location not set"}
                </span>
              </div>
              <StatusBadge status={complaint.status} />
            </summary>
            <div className="mt-3 border-l-2 border-primary/30 pl-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Status timeline</h4>
              {updates.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">No updates yet — check back soon.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {updates.map((update, i) => (
                    <li key={i} className="text-sm">
                      <p>{update.message}</p>
                      <p className="text-xs text-muted-foreground">{update.createdAt.toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/complaints/${encodeURIComponent(complaint.complaintNumber)}`}
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                View full details &rarr;
              </Link>
            </div>
          </details>
        );
      })}
    </div>
  );
}
