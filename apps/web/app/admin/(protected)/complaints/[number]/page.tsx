import type { Metadata } from "next";
import Link from "next/link";
import { isValidComplaintNumber } from "@ecora/shared";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/domain/empty-state";
import { getAdminComplaintDetail, getAdminUserOptions } from "@/lib/admin/complaint-detail";

import { AssignmentPanel } from "./assignment-panel";
import { DetectionsPanel } from "./detections-panel";
import { NotesPanel } from "./notes-panel";
import { RetryInferenceButton } from "./retry-inference-button";
import { RiskPanel } from "./risk-panel";
import { StatusPanel } from "./status-panel";

export const metadata: Metadata = { title: "Complaint review — Ecora admin" };

// This page's RetryInferenceButton calls retryInferenceAction, which runs
// the same synchronous inference call as the citizen submission path (see
// app/complaints/new/page.tsx's maxDuration comment for why this has to be
// set on the route segment, not the server action file).
export const maxDuration = 60;

export default async function AdminComplaintReviewPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const normalized = number?.trim().toUpperCase();

  if (!normalized || !isValidComplaintNumber(normalized)) {
    return (
      <main className="container py-12">
        <EmptyState title="That doesn't look like a complaint number" />
      </main>
    );
  }

  const [complaint, admins] = await Promise.all([getAdminComplaintDetail(normalized), getAdminUserOptions()]);

  if (!complaint) {
    return (
      <main className="container py-12">
        <EmptyState
          title="Complaint not found"
          action={
            <Button asChild>
              <Link href="/admin/complaints">Back to management</Link>
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
        <Link href="/admin/complaints" className="text-sm text-muted-foreground hover:underline">
          &larr; Back to management
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{complaint.complaintNumber}</CardTitle>
          <CardDescription>
            Reported {complaint.createdAt.toLocaleString()} · Last updated {complaint.updatedAt.toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1 text-sm">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Citizen</h3>
            <p>{complaint.citizenName}</p>
            <p className="text-muted-foreground">{complaint.citizenEmail}</p>
            {complaint.citizenPhone && <p className="text-muted-foreground">{complaint.citizenPhone}</p>}
          </div>
          <div className="space-y-1 text-sm">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Location (admin-only exact detail)</h3>
            <p>{addressLine || "—"}</p>
            {complaint.landmark && <p className="text-muted-foreground">Landmark: {complaint.landmark}</p>}
            {complaint.lat !== null && complaint.lng !== null && (
              <p className="text-muted-foreground">
                {complaint.lat.toFixed(6)}, {complaint.lng.toFixed(6)}
                {complaint.accuracyMeters !== null && ` · accuracy ±${Math.round(complaint.accuracyMeters)}m`}
              </p>
            )}
          </div>
          {complaint.description && (
            <div className="space-y-1 text-sm sm:col-span-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Description</h3>
              <p>{complaint.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Original vs. annotated</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Original ({complaint.originalPhotoUrls.length})</p>
            <div className="flex flex-wrap gap-2">
              {complaint.originalPhotoUrls.length === 0 ? (
                <p className="text-sm text-muted-foreground">No photos.</p>
              ) : (
                complaint.originalPhotoUrls.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element -- a time-limited signed S3 URL, not an optimizable static asset
                  <img key={i} src={url} alt="" className="h-48 w-48 rounded-lg border border-border object-cover" />
                ))
              )}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Annotated (AI-suggested detections)</p>
            {complaint.annotatedPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a time-limited signed S3 URL, not an optimizable static asset
              <img src={complaint.annotatedPhotoUrl} alt="" className="h-48 w-48 rounded-lg border border-border object-cover" />
            ) : complaint.status === "AI_ANALYSIS_PENDING" ? (
              <RetryInferenceButton complaintId={complaint.id} />
            ) : (
              <p className="text-sm text-muted-foreground">Analysis not complete yet.</p>
            )}
          </div>
        </div>

        <DetectionsPanel complaintId={complaint.id} detections={complaint.detections} />
      </section>

      <div className="grid gap-6 sm:grid-cols-3">
        <StatusPanel complaintId={complaint.id} status={complaint.status} />
        <RiskPanel complaintId={complaint.id} current={complaint.currentRisk} />
        <AssignmentPanel complaintId={complaint.id} current={complaint.currentAssignment} admins={admins} />
      </div>

      <NotesPanel complaintId={complaint.id} adminNotes={complaint.adminNotes} publicUpdates={complaint.publicUpdates} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Full status history</h2>
        <ul className="space-y-2">
          {complaint.statusHistory.map((h, i) => (
            <li key={i} className="border-l-2 border-primary/30 pl-3 text-sm">
              <p>
                {h.fromStatus ? h.fromStatus.replaceAll("_", " ") : "—"} &rarr; {h.toStatus.replaceAll("_", " ")}
                {h.note && ` — ${h.note}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {h.changedByName ?? "System"} · {h.createdAt.toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Audit log</h2>
        {complaint.auditLog.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audited actions yet.</p>
        ) : (
          <ul className="space-y-2">
            {complaint.auditLog.map((a) => (
              <li key={a.id} className="text-sm">
                <p>
                  <span className="font-medium">{a.action.replaceAll("_", " ")}</span> by {a.actorName ?? "System"}
                </p>
                <p className="text-xs text-muted-foreground">{a.createdAt.toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
