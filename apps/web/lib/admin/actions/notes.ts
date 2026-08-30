"use server";

import { z } from "zod";

import { requireAdminAction } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { getClientIp, ipForStorage } from "@/lib/request-ip";
import { findUserById } from "@/lib/auth/users";
import { recordInAppNotification, notifyCitizenByEmail } from "@/lib/notifications/service";

export interface NoteActionResult {
  ok: boolean;
  error?: string;
}

const noteSchema = z.string().trim().min(1, "Note can't be empty.").max(2000);

/** CLAUDE.md §5: AdminNotes — confidential, excluded from every citizen-facing serializer at the schema level (never selected by any citizen-facing query in this codebase). */
export async function addAdminNoteAction(complaintId: string, note: string): Promise<NoteActionResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error };

  const ip = await getClientIp();
  if (!checkRateLimit(`admin-note:${ip}`, 40, 15 * 60 * 1000).allowed) {
    return { ok: false, error: "Too many requests. Wait a few minutes and try again." };
  }

  const parsed = noteSchema.safeParse(note);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid note." };

  await db.transaction().execute(async (trx) => {
    await trx.insertInto("admin_notes").values({ complaint_id: complaintId, admin_id: guard.session.user.id, note: parsed.data }).execute();
    await trx
      .insertInto("audit_logs")
      .values({
        actor_id: guard.session.user.id,
        action: "admin_note_added",
        entity_type: "complaint",
        entity_id: complaintId,
        before: null,
        after: JSON.stringify({ note: parsed.data }),
        ip_address: ipForStorage(ip),
      })
      .execute();
  });

  return { ok: true };
}

const messageSchema = z.string().trim().min(1, "Message can't be empty.").max(1000);

/** Admin-authored citizen-visible update — appears in the same public_updates timeline the citizen's own detail page reads (CLAUDE.md §3). */
export async function addPublicUpdateAction(complaintId: string, message: string): Promise<NoteActionResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error };

  const ip = await getClientIp();
  if (!checkRateLimit(`admin-update:${ip}`, 40, 15 * 60 * 1000).allowed) {
    return { ok: false, error: "Too many requests. Wait a few minutes and try again." };
  }

  const parsed = messageSchema.safeParse(message);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message." };

  const complaint = await db
    .selectFrom("complaints")
    .select(["citizen_id", "complaint_number"])
    .where("id", "=", complaintId)
    .executeTakeFirst();
  if (!complaint) return { ok: false, error: "Complaint not found." };

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("public_updates")
      .values({ complaint_id: complaintId, status_history_id: null, message: parsed.data, created_by: guard.session.user.id })
      .execute();
    await recordInAppNotification(trx, {
      userId: complaint.citizen_id,
      complaintId,
      type: "public_update",
      message: parsed.data,
    });
    await trx
      .insertInto("audit_logs")
      .values({
        actor_id: guard.session.user.id,
        action: "public_update_added",
        entity_type: "complaint",
        entity_id: complaintId,
        before: null,
        after: JSON.stringify({ message: parsed.data }),
        ip_address: ipForStorage(ip),
      })
      .execute();
  });

  const citizen = await findUserById(complaint.citizen_id);
  if (citizen) {
    await notifyCitizenByEmail({
      userId: complaint.citizen_id,
      complaintId,
      type: "public_update",
      message: parsed.data,
      to: citizen.email,
      complaintNumber: complaint.complaint_number,
    });
  }

  return { ok: true };
}
