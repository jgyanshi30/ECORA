import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isValidComplaintNumber } from "@ecora/shared";

import { auth } from "@/auth";
import { ReopenAndRate, WithdrawButton } from "@/components/complaints/complaint-actions";
import { StatusBadge } from "@/components/domain/status-badge";
import { EmptyState } from "@/components/domain/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCitizenComplaintFullDetail,
  isReopenableOrRatable,
  isWithdrawable,
} from "@/lib/complaints/citizen-complaint";

export const metadata: Metadata = { title: "Complaint details — Ecora" };

export default async function ComplaintDetailPage({ params }: { params: Promise<{ number: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { number } = await params;
  const normalized = number?.trim().toUpperCase();

  if (!normalized || !isValidComplaintNumber(normalized)) {
    return (
      <main className="container py-16">
        <EmptyState
          title="That doesn't look like a complaint number"
          description="Complaint numbers look like CLN-20260829-A4B721."
          action={
            <Button asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          }
        />
      </main>
    );
  }

  const complaint = await getCitizenComplaintFullDetail(session.user.id, normalized);

  if (!complaint) {
    return (
      <main className="container py-16">
        <EmptyState
          title="Complaint not found"
          description="We couldn't find that complaint on your account."
          action={
            <Button asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          }
        />
      </main>
    );
  }

  const addressLine = [complaint.locality, complaint.city, complaint.district, complaint.state, complaint.pinCode]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="container flex flex-col gap-6 py-12">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          &larr; Back to dashboard
        </Link>
        <Link href={`/track?number=${encodeURIComponent(complaint.complaintNumber)}`} className="text-sm text-primary hover:underline">
          Public tracking link
        </Link>
      </div>

      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>{complaint.complaintNumber}</span>
            <StatusBadge status={complaint.status} />
          </CardTitle>
          <CardDescription>
            Reported {complaint.createdAt.toLocaleString()}
            {addressLine && ` · ${addressLine}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {complaint.description && (
            <section className="space-y-1">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">Description</h3>
              <p className="text-sm">{complaint.description}</p>
            </section>
          )}

          {complaint.landmark && (
            <section className="space-y-1">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">Landmark</h3>
              <p className="text-sm">{complaint.landmark}</p>
            </section>
          )}

          {complaint.photoUrls.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">Your photos</h3>
              <div className="flex flex-wrap gap-3">
                {complaint.photoUrls.map((url, i) => (
                  <div key={i} className="h-28 w-28 overflow-hidden rounded-lg border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element -- a time-limited signed S3 URL, not an optimizable static asset */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">Status timeline</h3>
            {complaint.updates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No updates yet — check back soon.</p>
            ) : (
              <ul className="space-y-2">
                {complaint.updates.map((update, i) => (
                  <li key={i} className="border-l-2 border-primary/30 pl-3 text-sm">
                    <p>{update.message}</p>
                    <p className="text-xs text-muted-foreground">{update.createdAt.toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {isReopenableOrRatable(complaint.status) && (
            <section className="border-t border-border pt-4">
              <ReopenAndRate complaintNumber={complaint.complaintNumber} currentFeedback={complaint.currentCycleFeedback} />
            </section>
          )}

          {isWithdrawable(complaint.status) && (
            <section className="border-t border-border pt-4">
              <WithdrawButton complaintNumber={complaint.complaintNumber} />
            </section>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
