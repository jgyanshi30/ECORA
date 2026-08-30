"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/domain/form-message";
import { SubmitButton } from "@/components/domain/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction } from "@/lib/auth/actions/password-reset";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        <p className="text-xs text-muted-foreground">At least 8 characters, with a letter and a number.</p>
      </div>
      <FormMessage error={state?.error} />
      <SubmitButton className="w-full">Reset password</SubmitButton>
    </form>
  );
}
