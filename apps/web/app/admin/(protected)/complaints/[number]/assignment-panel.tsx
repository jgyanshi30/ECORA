"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/domain/form-message";
import { assignComplaintAction } from "@/lib/admin/actions/assignment";
import type { AdminAssignmentRow } from "@/lib/admin/complaint-detail";
import type { AdminUserOption } from "@/lib/admin/complaint-detail";

export function AssignmentPanel({
  complaintId,
  current,
  admins,
}: {
  complaintId: string;
  current: AdminAssignmentRow | null;
  admins: AdminUserOption[];
}) {
  const router = useRouter();
  const [assigneeId, setAssigneeId] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    if (!assigneeId) return;
    setPending(true);
    setError(null);
    const result = await assignComplaintAction(complaintId, assigneeId, note);
    setPending(false);
    if (result.ok) {
      setNote("");
      router.refresh();
    } else {
      setError(result.error ?? "Could not assign this complaint.");
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold uppercase text-muted-foreground">Assignment</h3>
      {current ? (
        <p className="text-sm">
          Assigned to <span className="font-medium">{current.assigneeName}</span> by {current.assignedByName} on{" "}
          {current.assignedAt.toLocaleDateString()}
          {current.note && <span className="block text-muted-foreground">{current.note}</span>}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Not yet assigned.</p>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
        >
          <option value="">{current ? "Reassign to…" : "Assign to…"}</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
        />
        <FormMessage error={error ?? undefined} />
        <Button type="button" size="sm" onClick={() => void handleAssign()} disabled={!assigneeId || pending}>
          {pending ? "Assigning…" : current ? "Reassign" : "Assign"}
        </Button>
      </div>
    </div>
  );
}
