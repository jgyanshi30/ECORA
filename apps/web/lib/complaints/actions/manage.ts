"use server";

import { z } from "zod";

import { auth } from "@/auth";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { getOwnComplaintIdAndStatus, isReopenableOrRatable, isWithdrawable } from "@/lib/complaints/citizen-complaint";
import { getClientIp } from "@/lib/request-ip";

export interface ManageActionResult {
  ok: boolean;
  error?: string;
}

const commentSchema = z.string().trim().max(1000).optional();

/**
 * Citizen-initiated withdrawal (CLAUDE.md's complaint-detail requirements).
 * Reuses the existing CLOSED status rather than adding a new lifecycle value
 * to CLAUDE.md §3's canonical enum — the status_history/public_updates note
 * distinguishes "withdrawn by citizen" from any other CLOSED reason, without
 * a schema-level change to the authoritative status lifecycle (see
 * PROGRESS.md for the full reasoning).
 */
export async function withdrawComplaintAction(complaintNumber: string): Promise<ManageActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "You must be signed in." };

  const ip = await getClientIp();
  if (!checkRateLimit(`complaint-manage:${ip}`, 20, 15 * 60 * 1000).allowed) {
    return { ok: false, error: "Too many requests. Wait a few minutes and try again." };
  }

  const complaint = await getOwnComplaintIdAndStatus(session.user.id, complaintNumber);
  if (!complaint) return { ok: false, error: "Complaint not found." };
  if (!isWithdrawable(complaint.status)) {
    return { ok: false, error: "This complaint can no longer be withdrawn." };
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("complaints")
      .set({ status: "CLOSED", updated_at: new Date().toISOString() })
      .where("id", "=", complaint.id)
      .execute();

    const historyRow = await trx
      .insertInto("status_history")
      .values({
        complaint_id: complaint.id,
        from_status: complaint.status,
        to_status: "CLOSED",
        changed_by: session.user.id,
        note: "Withdrawn by citizen.",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("public_updates")
      .values({
        complaint_id: complaint.id,
        status_history_id: historyRow.id,
        message: "You withdrew this report.",
        created_by: session.user.id,
      })
      .execute();
  });

  return { ok: true };
}

/** Citizen reopens a RESOLVED complaint they're not satisfied with — sends it back to UNDER_REVIEW. */
export async function reopenComplaintAction(complaintNumber: string, note?: string): Promise<ManageActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "You must be signed in." };

  const ip = await getClientIp();
  if (!checkRateLimit(`complaint-manage:${ip}`, 20, 15 * 60 * 1000).allowed) {
    return { ok: false, error: "Too many requests. Wait a few minutes and try again." };
  }

  const noteParsed = commentSchema.safeParse(note);
  const citizenNote = noteParsed.success && noteParsed.data ? noteParsed.data : null;

  const complaint = await getOwnComplaintIdAndStatus(session.user.id, complaintNumber);
  if (!complaint) return { ok: false, error: "Complaint not found." };
  if (!isReopenableOrRatable(complaint.status)) {
    return { ok: false, error: "Only a resolved complaint can be reopened." };
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("complaints")
      .set({ status: "UNDER_REVIEW", updated_at: new Date().toISOString() })
      .where("id", "=", complaint.id)
      .execute();

    const historyRow = await trx
      .insertInto("status_history")
      .values({
        complaint_id: complaint.id,
        from_status: "RESOLVED",
        to_status: "UNDER_REVIEW",
        changed_by: session.user.id,
        note: citizenNote ? `Reopened by citizen: ${citizenNote}` : "Reopened by citizen.",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("public_updates")
      .values({
        complaint_id: complaint.id,
        status_history_id: historyRow.id,
        message: "You reopened this report — it's back under review.",
        created_by: session.user.id,
      })
      .execute();
  });

  return { ok: true };
}

const ratingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: commentSchema,
});

/** Citizen satisfaction rating after resolution — only while the complaint is currently RESOLVED (CLAUDE.md's complaint-detail requirements). */
export async function rateComplaintAction(
  complaintNumber: string,
  rating: number,
  comment?: string
): Promise<ManageActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "You must be signed in." };

  const ip = await getClientIp();
  if (!checkRateLimit(`complaint-manage:${ip}`, 20, 15 * 60 * 1000).allowed) {
    return { ok: false, error: "Too many requests. Wait a few minutes and try again." };
  }

  const parsed = ratingSchema.safeParse({ rating, comment });
  if (!parsed.success) return { ok: false, error: "Enter a rating between 1 and 5." };

  const complaint = await getOwnComplaintIdAndStatus(session.user.id, complaintNumber);
  if (!complaint) return { ok: false, error: "Complaint not found." };
  if (!isReopenableOrRatable(complaint.status)) {
    return { ok: false, error: "You can only rate a resolved complaint." };
  }

  await db
    .insertInto("complaint_feedback")
    .values({
      complaint_id: complaint.id,
      citizen_id: session.user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
    })
    .execute();

  return { ok: true };
}
