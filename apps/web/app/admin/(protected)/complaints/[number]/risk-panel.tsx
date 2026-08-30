"use client";

import { RISK_LEVELS } from "@ecora/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RiskBadge } from "@/components/domain/risk-badge";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/domain/form-message";
import { overrideRiskAction } from "@/lib/admin/actions/risk-override";
import type { AdminRiskAssessment } from "@/lib/admin/complaint-detail";

export function RiskPanel({ complaintId, current }: { complaintId: string; current: AdminRiskAssessment | null }) {
  const router = useRouter();
  const [showOverride, setShowOverride] = useState(false);
  const [level, setLevel] = useState(current?.level ?? "LOW");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setPending(true);
    setError(null);
    const result = await overrideRiskAction(complaintId, level, reason);
    setPending(false);
    if (result.ok) {
      setShowOverride(false);
      setReason("");
      router.refresh();
    } else {
      setError(result.error ?? "Could not override risk level.");
    }
  }

  const rawBreakdown = current?.factorBreakdown && typeof current.factorBreakdown === "object" ? current.factorBreakdown : null;

  // An admin override's factor_breakdown is deliberately just { note: string }
  // — the original AI-computed factor map is preserved on the prior, now
  // non-current row, not recomputed (lib/admin/actions/risk-override.ts).
  // That's a different shape from the AI-computed Record<string, {score,
  // weight, detail}> map below, so it needs its own render path rather than
  // being iterated as if it were scored factors.
  const overrideNote =
    rawBreakdown && typeof (rawBreakdown as Record<string, unknown>).note === "string"
      ? (rawBreakdown as { note: string }).note
      : null;

  const breakdown =
    rawBreakdown && overrideNote === null ? (rawBreakdown as Record<string, { score: number; weight: number; detail: string }>) : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground">Risk assessment</h3>
        {current && <RiskBadge level={current.level} source={current.isAdminOverride ? "admin" : "ai"} />}
      </div>

      {!current ? (
        <p className="text-sm text-muted-foreground">No risk assessment yet — analysis may still be pending.</p>
      ) : (
        <>
          <p className="text-sm">
            Score: <span className="font-medium tabular-nums">{current.score.toFixed(1)}</span>/100
            {current.isAdminOverride && <span className="ml-2 text-xs text-muted-foreground">(admin override)</span>}
          </p>
          {current.isAdminOverride && current.overrideReason && (
            <p className="text-sm text-muted-foreground">
              Reason: {current.overrideReason} — {current.overriddenByName}
            </p>
          )}
          {overrideNote && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Why this score? (factor breakdown)</summary>
              <p className="mt-2 text-xs text-muted-foreground">{overrideNote}</p>
            </details>
          )}
          {breakdown && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Why this score? (factor breakdown)</summary>
              <ul className="mt-2 space-y-1">
                {Object.entries(breakdown).map(([key, factor]) => (
                  <li key={key} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{key}:</span> {factor.detail} (score{" "}
                    {factor.score?.toFixed?.(0)}, weight {factor.weight})
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {!showOverride ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowOverride(true)}>
          Override risk level
        </Button>
      ) : (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as typeof level)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
          >
            {RISK_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Mandatory reason for this override (min. 10 characters)"
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none"
          />
          <FormMessage error={error ?? undefined} />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => void handleSubmit()} disabled={pending}>
              {pending ? "Saving…" : "Save override"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowOverride(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
