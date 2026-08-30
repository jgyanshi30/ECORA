"use client";

import { DEBRIS_CLASS_NAMES } from "@ecora/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/domain/form-message";
import { correctDetectionAction, rejectDetectionAction } from "@/lib/admin/actions/detection-review";
import type { AdminDetectionRow } from "@/lib/admin/complaint-detail";

/**
 * CLAUDE.md §6: "Admins can correct the category, reject a detection, or
 * trigger a rerun — both the original AI output and the admin's corrected
 * output remain in history (never destructive-overwrite)." This panel is
 * the correct/reject half of that (rerun is a separate, not-yet-built
 * capability — see PROGRESS.md). `d.className`/`d.confidence` are always the
 * untouched AI output; the admin's verdict renders alongside it, never in
 * place of it.
 */
export function DetectionsPanel({ complaintId, detections }: { complaintId: string; detections: AdminDetectionRow[] }) {
  const router = useRouter();

  if (detections.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-2">AI-detected class</th>
            <th className="p-2">Confidence</th>
            <th className="p-2">Admin review</th>
            <th className="p-2">Treatment recommendation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {detections.map((d) => (
            <DetectionRow key={d.id} complaintId={complaintId} detection={d} onSaved={() => router.refresh()} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetectionRow({
  complaintId,
  detection: d,
  onSaved,
}: {
  complaintId: string;
  detection: AdminDetectionRow;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [correctedClass, setCorrectedClass] = useState(d.adminCorrectedClassName ?? d.className);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCorrect() {
    setPending(true);
    setError(null);
    const result = await correctDetectionAction(complaintId, d.id, correctedClass, note || undefined);
    setPending(false);
    if (result.ok) {
      setEditing(false);
      setNote("");
      onSaved();
    } else {
      setError(result.error ?? "Could not save the correction.");
    }
  }

  async function handleReject() {
    setPending(true);
    setError(null);
    const result = await rejectDetectionAction(complaintId, d.id, note || undefined);
    setPending(false);
    if (result.ok) {
      setEditing(false);
      setNote("");
      onSaved();
    } else {
      setError(result.error ?? "Could not reject the detection.");
    }
  }

  return (
    <tr>
      <td className="p-2 align-top">{d.className}</td>
      <td className="p-2 align-top tabular-nums">{(d.confidence * 100).toFixed(1)}%</td>
      <td className="p-2 align-top">
        {!d.adminReviewed && !editing && (
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            Review
          </Button>
        )}

        {d.adminReviewed && !editing && (
          <div className="flex flex-col gap-1 text-xs">
            {d.adminRejected ? (
              <p className="font-medium text-destructive">Rejected</p>
            ) : (
              <p className="font-medium text-foreground">Corrected to: {d.adminCorrectedClassName}</p>
            )}
            {d.adminNote && <p className="text-muted-foreground">{d.adminNote}</p>}
            <p className="text-muted-foreground">
              {d.adminReviewedByName ?? "Admin"} · {d.adminReviewedAt?.toLocaleString()}
            </p>
            <Button type="button" size="sm" variant="ghost" className="w-fit" onClick={() => setEditing(true)}>
              Change review
            </Button>
          </div>
        )}

        {editing && (
          <div className="flex flex-col gap-2">
            <select
              value={correctedClass}
              onChange={(e) => setCorrectedClass(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
            >
              {DEBRIS_CLASS_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Optional note"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none"
            />
            <FormMessage error={error ?? undefined} />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => void handleCorrect()} disabled={pending}>
                {pending ? "Saving…" : "Save as this class"}
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => void handleReject()} disabled={pending}>
                {pending ? "Saving…" : "Reject detection"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </td>
      <td className="p-2 align-top max-w-xs">
        {d.treatmentRecommendation ? (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{d.treatmentRecommendation}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
              Operational recommendation — requires admin verification, not an automatic instruction
            </p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
