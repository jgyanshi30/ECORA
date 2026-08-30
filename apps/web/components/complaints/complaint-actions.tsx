"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/domain/form-message";
import {
  reopenComplaintAction,
  withdrawComplaintAction,
  rateComplaintAction,
} from "@/lib/complaints/actions/manage";

export function WithdrawButton({ complaintNumber }: { complaintNumber: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!window.confirm("Withdraw this report? This can't be undone, and admins will stop working on it.")) return;
    setPending(true);
    setError(null);
    const result = await withdrawComplaintAction(complaintNumber);
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error ?? "Could not withdraw this report.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="destructive" onClick={() => void handleClick()} disabled={pending}>
        {pending ? "Withdrawing…" : "Withdraw report"}
      </Button>
      <FormMessage error={error ?? undefined} />
    </div>
  );
}

export interface ReopenAndRateProps {
  complaintNumber: string;
  currentFeedback: { rating: number; comment: string | null } | null;
}

/** Shown only while a complaint is RESOLVED — a citizen can rate the resolution, reopen it if unsatisfied, or both. */
export function ReopenAndRate({ complaintNumber, currentFeedback }: ReopenAndRateProps) {
  const router = useRouter();
  const [rating, setRating] = useState(currentFeedback?.rating ?? 0);
  const [comment, setComment] = useState(currentFeedback?.comment ?? "");
  const [ratingStatus, setRatingStatus] = useState<"idle" | "submitting" | "done">(
    currentFeedback ? "done" : "idle"
  );
  const [ratingError, setRatingError] = useState<string | null>(null);

  const [reopenNote, setReopenNote] = useState("");
  const [reopenPending, setReopenPending] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [showReopenNote, setShowReopenNote] = useState(false);

  async function handleRate() {
    if (rating < 1) {
      setRatingError("Choose a rating first.");
      return;
    }
    setRatingStatus("submitting");
    setRatingError(null);
    const result = await rateComplaintAction(complaintNumber, rating, comment);
    if (result.ok) {
      setRatingStatus("done");
      router.refresh();
    } else {
      setRatingStatus("idle");
      setRatingError(result.error ?? "Could not submit your rating.");
    }
  }

  async function handleReopen() {
    if (!window.confirm("Reopen this report? It will go back under review.")) return;
    setReopenPending(true);
    setReopenError(null);
    const result = await reopenComplaintAction(complaintNumber, reopenNote);
    setReopenPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setReopenError(result.error ?? "Could not reopen this report.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">How did we do?</h3>
        <div className="flex gap-1" role="radiogroup" aria-label="Satisfaction rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} star${value > 1 ? "s" : ""}`}
              onClick={() => {
                setRating(value);
                setRatingStatus("idle");
              }}
              className={`h-9 w-9 rounded-md border text-sm font-medium ${
                value <= rating ? "border-primary bg-primary text-primary-foreground" : "border-input"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            setRatingStatus("idle");
          }}
          rows={2}
          maxLength={1000}
          placeholder="Anything you'd like to add (optional)"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none"
        />
        <FormMessage error={ratingError ?? undefined} />
        <Button
          type="button"
          size="sm"
          onClick={() => void handleRate()}
          disabled={ratingStatus === "submitting" || ratingStatus === "done"}
        >
          {ratingStatus === "done" ? "Thanks for your feedback" : ratingStatus === "submitting" ? "Submitting…" : "Submit rating"}
        </Button>
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Not actually resolved?</h3>
        {showReopenNote ? (
          <>
            <textarea
              value={reopenNote}
              onChange={(e) => setReopenNote(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="What's still wrong? (optional)"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none"
            />
            <FormMessage error={reopenError ?? undefined} />
            <Button type="button" variant="outline" size="sm" onClick={() => void handleReopen()} disabled={reopenPending}>
              {reopenPending ? "Reopening…" : "Confirm reopen"}
            </Button>
          </>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowReopenNote(true)}>
            Reopen this report
          </Button>
        )}
      </div>
    </div>
  );
}
