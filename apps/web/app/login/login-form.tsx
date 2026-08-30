"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormMessage } from "@/components/domain/form-message";
import { SubmitButton } from "@/components/domain/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/lib/auth/actions/login";

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <FormMessage error={state?.error} />
      <SubmitButton className="w-full">Log in</SubmitButton>
      <div className="flex justify-between text-sm text-muted-foreground">
        <Link href="/register" className="hover:text-foreground">
          Create an account
        </Link>
        <Link href="/forgot-password" className="hover:text-foreground">
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
