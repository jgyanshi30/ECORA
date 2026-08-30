"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/domain/form-message";
import { SubmitButton } from "@/components/domain/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cancelAccountDeletionAction,
  requestAccountDeletionAction,
} from "@/lib/auth/actions/profile";

/**
 * Split into two separate components — not one component branching on
 * `deletionRequestedAt` with both useActionState hooks called unconditionally
 * at the top. That earlier shape had both hooks' state persist for the life
 * of the single DeleteAccountForm instance regardless of which branch was
 * showing: after a successful cancel, the component swapped back to this
 * "not requested" branch but still read the *other* hook's stale state, so a
 * user who just cancelled saw "Account deletion requested..." — the request
 * action's leftover success message, not the cancel action's.
 *
 * Rendering one or the other as a genuinely different component (via the
 * parent's conditional below) means React unmounts the previous one and
 * mounts the other fresh on every request/cancel transition, resetting its
 * useActionState to its initial value. No shared state to go stale.
 */
function RequestDeletionForm() {
  const [state, formAction] = useActionState(requestAccountDeletionAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Requesting deletion does not remove your data immediately — it flags your account for support to
        process. Your account stays active until then.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="deleteCurrentPassword">Confirm your password</Label>
        <Input
          id="deleteCurrentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton variant="destructive" className="w-fit">
        Request account deletion
      </SubmitButton>
    </form>
  );
}

function CancelDeletionForm({ deletionRequestedAt }: { deletionRequestedAt: string }) {
  const [state, formAction] = useActionState(cancelAccountDeletionAction, undefined);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Deletion requested on {new Date(deletionRequestedAt).toLocaleDateString()}. Your account stays
        active until support processes the request.
      </p>
      <form action={formAction}>
        <FormMessage error={state?.error} success={state?.success} />
        <SubmitButton variant="outline" size="sm">
          Cancel deletion request
        </SubmitButton>
      </form>
    </div>
  );
}

export function DeleteAccountForm({ deletionRequestedAt }: { deletionRequestedAt: string | null }) {
  if (deletionRequestedAt) {
    return <CancelDeletionForm deletionRequestedAt={deletionRequestedAt} />;
  }
  return <RequestDeletionForm />;
}
