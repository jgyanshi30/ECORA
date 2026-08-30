"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/domain/form-message";
import { SubmitButton } from "@/components/domain/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "@/lib/auth/actions/profile";

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string | null }) {
  const [state, formAction] = useActionState(updateProfileAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" defaultValue={fullName} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} />
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}
