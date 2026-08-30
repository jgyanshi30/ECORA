"use server";

import { z } from "zod";

import { requireAdminAction } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { getClientIp, ipForStorage } from "@/lib/request-ip";

export interface AssignmentResult {
  ok: boolean;
  error?: string;
}

const noteSchema = z.string().trim().max(500).optional();

/** CLAUDE.md §5: Assignments — admin-to-complaint assignment history. Closes any active assignment before opening a new one; also advances status to ASSIGNED so the citizen-visible timeline reflects it. */
export async function assignComplaintAction(
  complaintId: string,
  assigneeUserId: string,
  note?: string
): Promise<AssignmentResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error };

  const ip = await getClientIp();
  if (!checkRateLimit(`admin-assign:${ip}`, 30, 15 * 60 * 1000).allowed) {
    return { ok: false, error: "Too many requests. Wait a few minutes and try again." };
  }

  const parsedNote = noteSchema.safeParse(note);
  const cleanNote = parsedNote.success && parsedNote.data ? parsedNote.data : null;

  const assignee = await db.selectFrom("users").select(["id", "role", "full_name"]).where("id", "=", assigneeUserId).executeTakeFirst();
  if (!assignee || assignee.role !== "admin") {
    return { ok: false, error: "Select a valid admin to assign this to." };
  }

  const complaint = await db.selectFrom("complaints").select(["id", "status"]).where("id", "=", complaintId).executeTakeFirst();
  if (!complaint) return { ok: false, error: "Complaint not found." };

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("assignments")
      .set({ unassigned_at: new Date().toISOString() })
      .where("complaint_id", "=", complaintId)
      .where("unassigned_at", "is", null)
      .execute();

    await trx
      .insertInto("assignments")
      .values({
        complaint_id: complaintId,
        assigned_to: assigneeUserId,
        assigned_by: guard.session.user.id,
        note: cleanNote,
      })
      .execute();

    if (complaint.status !== "ASSIGNED" && complaint.status !== "ACTION_IN_PROGRESS") {
      await trx
        .updateTable("complaints")
        .set({ status: "ASSIGNED", updated_at: new Date().toISOString() })
        .where("id", "=", complaintId)
        .execute();

      const historyRow = await trx
        .insertInto("status_history")
        .values({
          complaint_id: complaintId,
          from_status: complaint.status,
          to_status: "ASSIGNED",
          changed_by: guard.session.user.id,
          note: `Assigned to ${assignee.full_name}.`,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      await trx
        .insertInto("public_updates")
        .values({
          complaint_id: complaintId,
          status_history_id: historyRow.id,
          message: "Your report has been assigned to a team for action.",
          created_by: guard.session.user.id,
        })
        .execute();
    }

    await trx
      .insertInto("audit_logs")
      .values({
        actor_id: guard.session.user.id,
        action: "assignment",
        entity_type: "complaint",
        entity_id: complaintId,
        before: null,
        after: JSON.stringify({ assignedTo: assigneeUserId, note: cleanNote }),
        ip_address: ipForStorage(ip),
      })
      .execute();
  });

  return { ok: true };
}
