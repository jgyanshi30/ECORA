import type { Metadata } from "next";
import { isValidComplaintNumber } from "@ecora/shared";

import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findPublicComplaintByNumber } from "@/lib/complaints/public-lookup";

export const metadata: Metadata = { title: "Track your complaint — Ecora" };

// Next.js 16: searchParams is a Promise — must be awaited, never read synchronously.
export default async function TrackComplaintPage({
  searchParams,
}: {
  searchParams: Promise<{ number?: string }>;
}) {
  const { number } = await searchParams;
  const normalized = number?.trim().toUpperCase();

  let notFound = false;
  let invalidFormat = false;
  let complaint: Awaited<ReturnType<typeof findPublicComplaintByNumber>> = null;

  if (normalized) {
    if (!isValidComplaintNumber(normalized)) {
      invalidFormat = true;
    } else {
      complaint = await findPublicComplaintByNumber(normalized);
      notFound = complaint === null;
    }
  }

  return (
    <main className="container flex flex-col items-center gap-8 py-16">
      <div className="w-full max-w-lg space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Track your complaint</h1>
        <p className="text-sm text-muted-foreground">
          Enter the complaint number you received when you reported debris — no account needed.
        </p>
      </div>

      <form method="get" className="flex w-full max-w-lg items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="number">Complaint number</Label>
          <Input
            id="number"
            name="number"
            placeholder="CLN-20260829-A4B721"
            defaultValue={number ?? ""}
            autoComplete="off"
          />
        </div>
        <Button type="submit">Track</Button>
      </form>

      {invalidFormat && (
        <p className="text-sm text-muted-foreground">
          That doesn&apos;t look like a complaint number. It should look like{" "}
          <code className="rounded bg-muted px-1 py-0.5">CLN-20260829-A4B721</code>.
        </p>
      )}

      {notFound && (
        <p className="text-sm text-muted-foreground">
          No complaint found with that number. Double-check it and try again.
        </p>
      )}

      {complaint && (
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>{complaint.complaintNumber}</span>
              <StatusBadge status={complaint.status} />
            </CardTitle>
            <CardDescription>
              Reported {complaint.createdAt.toLocaleDateString()}
              {(complaint.locality ?? complaint.city) &&
                ` near ${complaint.locality ?? complaint.city}${complaint.state ? `, ${complaint.state}` : ""}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {complaint.description && <p className="text-sm">{complaint.description}</p>}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Updates</h3>
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
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
