"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormMessage } from "@/components/domain/form-message";
import { SubmitButton } from "@/components/domain/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAction } from "@/lib/auth/actions/register";

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        <p className="text-xs text-muted-foreground">At least 8 characters, with a letter and a number.</p>
      </div>
      <FormMessage error={state?.error} />
      <SubmitButton className="w-full">Create account</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
