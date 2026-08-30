"use client";

import { COMPLAINT_STATUSES } from "@ecora/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormMessage } from "@/components/domain/form-message";
import { bulkUpdateComplaintStatusAction } from "@/lib/admin/actions/bulk-status";
import type { AdminComplaintRow } from "@/lib/admin/complaints";

export function ComplaintTable({ rows }: { rows: AdminComplaintRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetStatus, setTargetStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string } | null>(null);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkApply() {
    if (selected.size === 0 || !targetStatus) return;
    if (!window.confirm(`Change ${selected.size} complaint(s) to ${targetStatus.replaceAll("_", " ")}?`)) return;

    setPending(true);
    setMessage(null);
    const result = await bulkUpdateComplaintStatusAction(Array.from(selected), targetStatus);
    setPending(false);

    if (result.ok) {
      setMessage({ success: `Updated ${result.updated} complaint(s).` });
      setSelected(new Set());
      router.refresh();
    } else {
      setMessage({ error: result.error ?? "Could not update the selected complaints." });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
        <span className="text-sm font-medium">{selected.size} selected</span>
        <select
          id="bulk-status-select"
          value={targetStatus}
          onChange={(e) => setTargetStatus(e.target.value)}
          disabled={selected.size === 0}
          className="flex h-9 w-56 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none disabled:opacity-50"
        >
          <option value="">Change status to…</option>
          {COMPLAINT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          onClick={() => void handleBulkApply()}
          disabled={selected.size === 0 || !targetStatus || pending}
        >
          {pending ? "Applying…" : "Apply to selected"}
        </Button>
        <a
          href="/api/admin/complaints/export"
          className="ml-auto text-sm text-primary hover:underline"
        >
          Export current view as CSV
        </a>
      </div>

      <FormMessage error={message?.error} success={message?.success} />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-10 p-3">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
              </th>
              <th className="p-3">Complaint</th>
              <th className="p-3">Citizen</th>
              <th className="p-3">Location</th>
              <th className="p-3">Status</th>
              <th className="p-3">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-accent/50">
                <td className="p-3">
                  <Checkbox
                    checked={selected.has(row.id)}
                    onCheckedChange={() => toggleOne(row.id)}
                    aria-label={`Select ${row.complaintNumber}`}
                  />
                </td>
                <td className="p-3 font-medium">
                  <Link href={`/admin/complaints/${encodeURIComponent(row.complaintNumber)}`} className="hover:underline">
                    {row.complaintNumber}
                  </Link>
                </td>
                <td className="p-3">
                  <div>{row.citizenName}</div>
                  <div className="text-xs text-muted-foreground">{row.citizenEmail}</div>
                </td>
                <td className="p-3 text-muted-foreground">
                  {[row.locality, row.city, row.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="p-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="p-3 text-muted-foreground">{row.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
