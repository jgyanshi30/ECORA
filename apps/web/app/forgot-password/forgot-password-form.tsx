"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/domain/form-message";
import { SubmitButton } from "@/components/domain/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction } from "@/lib/auth/actions/password-reset";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton className="w-full">Send reset link</SubmitButton>
    </form>
  );
}
