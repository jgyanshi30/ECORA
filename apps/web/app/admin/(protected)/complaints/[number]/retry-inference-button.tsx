"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/domain/form-message";
import { retryInferenceAction } from "@/lib/admin/actions/retry-inference";

/**
 * CLAUDE.md §13 (hackathon deployment): the only recovery path for a
 * complaint stuck at AI_ANALYSIS_PENDING after a transient inference
 * failure during submission — there's no queue/worker retrying it in the
 * background anymore, so this button is it. See PROGRESS.md for why this
 * was the chosen retry story.
 */
export function RetryInferenceButton({ complaintId }: { complaintId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRetry() {
    setPending(true);
    setError(null);
    const result = await retryInferenceAction(complaintId);
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error ?? "Could not retry analysis.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm text-muted-foreground">Analysis not complete yet.</p>
      <Button type="button" size="sm" variant="outline" onClick={() => void handleRetry()} disabled={pending}>
        {pending ? "Retrying…" : "Retry AI analysis"}
      </Button>
      <FormMessage error={error ?? undefined} />
    </div>
  );
}
