"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/domain/form-message";
import { SubmitButton } from "@/components/domain/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction } from "@/lib/auth/actions/profile";

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton variant="outline">Change password</SubmitButton>
    </form>
  );
}
