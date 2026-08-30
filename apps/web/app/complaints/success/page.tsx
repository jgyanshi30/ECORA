import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isValidComplaintNumber } from "@ecora/shared";

import { auth } from "@/auth";
import { StatusBadge } from "@/components/domain/status-badge";
import { DownloadAcknowledgementButton } from "@/components/complaints/download-acknowledgement-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCitizenComplaintByNumber } from "@/lib/complaints/citizen-complaint";

export const metadata: Metadata = { title: "Complaint submitted — Ecora" };

// Next.js 16: searchParams is a Promise — must be awaited, never read synchronously.
export default async function ComplaintSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ number?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { number } = await searchParams;
  const normalized = number?.trim().toUpperCase();

  const complaint =
    normalized && isValidComplaintNumber(normalized)
      ? await getCitizenComplaintByNumber(session.user.id, normalized)
      : null;

  if (!complaint) {
    return (
      <main className="container flex flex-col items-center gap-6 py-16 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Complaint not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          We couldn&apos;t find that complaint on your account. If you just submitted a report, check your
          dashboard instead.
        </p>
        <Button asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </main>
    );
  }

  const addressLine = [complaint.locality, complaint.city, complaint.state].filter(Boolean).join(", ") || null;
  const createdAtDisplay = complaint.createdAt.toLocaleString();

  return (
    <main className="container flex flex-col items-center gap-8 py-16">
      <div className="max-w-lg space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Thank you — your report was submitted</h1>
        <p className="text-sm text-muted-foreground">
          Keep your complaint number to track progress. Automated analysis has run; an administrator will
          review the results before any action is taken.
        </p>
      </div>

      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>{complaint.complaintNumber}</span>
            <StatusBadge status={complaint.status} />
          </CardTitle>
          <CardDescription>
            Submitted {createdAtDisplay}
            {addressLine && ` · ${addressLine}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/track?number=${encodeURIComponent(complaint.complaintNumber)}`}>Track complaint</Link>
          </Button>
          <DownloadAcknowledgementButton
            complaintNumber={complaint.complaintNumber}
            createdAt={createdAtDisplay}
            status={complaint.status}
            addressLine={addressLine}
          />
          <Button asChild variant="ghost">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
