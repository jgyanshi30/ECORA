import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Reset password — Ecora" };

// Next.js 16: searchParams is a Promise — must be awaited, never read synchronously.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>Choose a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <p className="text-sm text-muted-foreground">
              This link is missing a reset token.{" "}
              <Link href="/forgot-password" className="text-primary hover:underline">
                Request a new one
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
