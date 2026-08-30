import type { Transaction } from "kysely";

import { db } from "@/lib/db";
import type { Database } from "@/lib/db-types";
import { sendComplaintUpdateEmail } from "@/lib/email/complaint-emails";

/**
 * In-app notification for a citizen-visible event (CLAUDE.md §5's
 * Notifications entity). Always written inside the same transaction as the
 * event it records (status change / public update / AI analysis complete) —
 * it's a plain DB row, no external call, so "sent" is immediate and true.
 */
export async function recordInAppNotification(
  trx: Transaction<Database>,
  params: { userId: string; complaintId: string; type: string; message: string }
): Promise<void> {
  await trx
    .insertInto("notifications")
    .values({
      user_id: params.userId,
      complaint_id: params.complaintId,
      channel: "in_app",
      type: params.type,
      message: params.message,
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .execute();
}

/**
 * Records + attempts a citizen email notification, tracking delivery via the
 * same `notifications` row (pending -> sent/failed) rather than a bare
 * fire-and-forget call. Called only AFTER the triggering DB transaction has
 * committed — a failed or slow email must never roll back or block the
 * status/update mutation that triggered it, so this never throws.
 */
export async function notifyCitizenByEmail(params: {
  userId: string;
  complaintId: string;
  type: string;
  message: string;
  to: string;
  complaintNumber: string;
}): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const row = await db
    .insertInto("notifications")
    .values({
      user_id: params.userId,
      complaint_id: params.complaintId,
      channel: "email",
      type: params.type,
      message: params.message,
      status: "pending",
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  try {
    await sendComplaintUpdateEmail(params.to, params.complaintNumber, params.message, `${baseUrl}/complaints/${params.complaintNumber}`);
    await db.updateTable("notifications").set({ status: "sent", sent_at: new Date().toISOString() }).where("id", "=", row.id).execute();
  } catch (err) {
    await db.updateTable("notifications").set({ status: "failed" }).where("id", "=", row.id).execute();
    console.error(`Failed to send ${params.type} email for ${params.complaintNumber}:`, err);
  }
}
