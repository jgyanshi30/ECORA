"use client";

import { COMPLAINT_STATUSES, type ComplaintStatus } from "@ecora/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/domain/form-message";
import { bulkUpdateComplaintStatusAction } from "@/lib/admin/actions/bulk-status";

/** Single-complaint status change, reusing the same audited bulk-status action a management-table selection of one row would use. */
export function StatusPanel({ complaintId, status }: { complaintId: string; status: ComplaintStatus }) {
  const router = useRouter();
  const [target, setTarget] = useState<string>(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange() {
    if (target === status) return;
    setPending(true);
    setError(null);
    const result = await bulkUpdateComplaintStatusAction([complaintId], target);
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error ?? "Could not change status.");
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground">Status</h3>
        <StatusBadge status={status} />
      </div>
      <div className="flex gap-2">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
        >
          {COMPLAINT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" onClick={() => void handleChange()} disabled={target === status || pending}>
          {pending ? "Saving…" : "Change"}
        </Button>
      </div>
      <FormMessage error={error ?? undefined} />
    </div>
  );
}
