"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/domain/form-message";
import { SubmitButton } from "@/components/domain/submit-button";
import { resendVerificationEmailAction } from "@/lib/auth/actions/profile";

export function ResendVerificationForm() {
  const [state, formAction] = useActionState(resendVerificationEmailAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton variant="outline" size="sm" className="w-fit">
        Resend verification email
      </SubmitButton>
    </form>
  );
}
