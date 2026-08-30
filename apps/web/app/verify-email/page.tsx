import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { consumeEmailVerificationToken } from "@/lib/auth/verify-email";

export const metadata: Metadata = { title: "Verify email — Ecora" };

const COPY: Record<string, { title: string; description: string }> = {
  verified: { title: "Email verified", description: "Your email address has been confirmed." },
  "already-verified": {
    title: "Already verified",
    description: "This link was already used — your email is confirmed.",
  },
  expired: {
    title: "Link expired",
    description: "This verification link has expired. Request a new one from your profile page.",
  },
  invalid: {
    title: "Invalid link",
    description: "This verification link isn't valid. Request a new one from your profile page.",
  },
};

// Next.js 16: searchParams is a Promise — must be awaited, never read synchronously.
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await consumeEmailVerificationToken(token) : "invalid";
  const copy = COPY[result] ?? COPY.invalid!;

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/">Continue</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
