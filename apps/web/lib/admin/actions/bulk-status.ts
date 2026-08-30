"use server";

import { isComplaintStatus, type ComplaintStatus } from "@ecora/shared";

import { checkRateLimit } from "@/lib/auth/rate-limit";
import { requireAdminAction } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { getClientIp, ipForStorage } from "@/lib/request-ip";
import { findUserById } from "@/lib/auth/users";
import { recordInAppNotification, notifyCitizenByEmail } from "@/lib/notifications/service";

export interface BulkStatusResult {
  ok: boolean;
  error?: string;
  updated?: number;
}

/** Citizen-visible text for an admin-driven bulk status change — never the internal audit note, never AI/risk detail (CLAUDE.md §0). */
const PUBLIC_MESSAGE: Partial<Record<ComplaintStatus, string>> = {
  UNDER_REVIEW: "Your report is under review by our team.",
  ASSIGNED: "Your report has been assigned to a team for action.",
  ACTION_IN_PROGRESS: "Action is now in progress on your report.",
  RESOLVED: "Your report has been marked resolved.",
  CLOSED: "Your report has been closed.",
  REJECTED_DUPLICATE: "Your report was identified as a duplicate of an existing one.",
};

/**
 * Bulk admin status transition from the complaint management table
 * (CLAUDE.md §5: every admin mutation goes to audit_logs with before/after;
 * CLAUDE.md §3: every transition goes to status_history). Complaints already
 * at the target status are skipped, not double-logged.
 */
export async function bulkUpdateComplaintStatusAction(
  complaintIds: string[],
  newStatus: string
): Promise<BulkStatusResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error };

  if (!isComplaintStatus(newStatus)) {
    return { ok: false, error: "Invalid status." };
  }
  if (complaintIds.length === 0) {
    return { ok: false, error: "Select at least one complaint." };
  }
  if (complaintIds.length > 200) {
    return { ok: false, error: "Too many complaints selected at once (max 200)." };
  }

  const ip = await getClientIp();
  if (!checkRateLimit(`admin-bulk-status:${ip}`, 30, 15 * 60 * 1000).allowed) {
    return { ok: false, error: "Too many requests. Wait a few minutes and try again." };
  }

  const targets = await db
    .selectFrom("complaints")
    .select(["id", "status", "citizen_id", "complaint_number"])
    .where("id", "in", complaintIds)
    .execute();

  let updated = 0;
  for (const target of targets) {
    if (target.status === newStatus) continue;

    const message = PUBLIC_MESSAGE[newStatus];

    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable("complaints")
        .set({ status: newStatus, updated_at: new Date().toISOString() })
        .where("id", "=", target.id)
        .execute();

      const historyRow = await trx
        .insertInto("status_history")
        .values({
          complaint_id: target.id,
          from_status: target.status,
          to_status: newStatus,
          changed_by: guard.session.user.id,
          note: `Bulk status update by admin.`,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      if (message) {
        await trx
          .insertInto("public_updates")
          .values({
            complaint_id: target.id,
            status_history_id: historyRow.id,
            message,
            created_by: guard.session.user.id,
          })
          .execute();

        await recordInAppNotification(trx, {
          userId: target.citizen_id,
          complaintId: target.id,
          type: "status_change",
          message,
        });
      }

      await trx
        .insertInto("audit_logs")
        .values({
          actor_id: guard.session.user.id,
          action: "bulk_status_update",
          entity_type: "complaint",
          entity_id: target.id,
          before: JSON.stringify({ status: target.status }),
          after: JSON.stringify({ status: newStatus }),
          ip_address: ipForStorage(ip),
        })
        .execute();
    });

    if (message) {
      const citizen = await findUserById(target.citizen_id);
      if (citizen) {
        await notifyCitizenByEmail({
          userId: target.citizen_id,
          complaintId: target.id,
          type: "status_change",
          message,
          to: citizen.email,
          complaintNumber: target.complaint_number,
        });
      }
    }

    updated++;
  }

  return { ok: true, updated };
}
