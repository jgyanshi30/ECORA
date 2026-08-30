"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/domain/form-message";
import { updateTreatmentRecommendationAction } from "@/lib/admin/actions/treatment-recommendations";

export function RecommendationRow({
  className,
  recommendation,
  updatedByName,
  updatedAt,
}: {
  className: string;
  recommendation: string;
  updatedByName: string | null;
  updatedAt: Date;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(recommendation);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setPending(true);
    setError(null);
    const result = await updateTreatmentRecommendationAction(className, value);
    setPending(false);
    if (result.ok) {
      setEditing(false);
      router.refresh();
    } else {
      setError(result.error ?? "Could not save the recommendation.");
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-medium">{className}</span>
        {!editing && (
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={2}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none"
          />
          <FormMessage error={error ?? undefined} />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => void handleSave()} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setValue(recommendation);
                setError(null);
                setEditing(false);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{recommendation}</p>
      )}

      <p className="text-xs text-muted-foreground">
        Last updated {updatedAt.toLocaleString()}
        {updatedByName ? ` by ${updatedByName}` : " (default)"}
      </p>
    </div>
  );
}
