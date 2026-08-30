"use server";

import { isDebrisClassName } from "@ecora/shared";
import { z } from "zod";

import { requireAdminAction } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { getClientIp, ipForStorage } from "@/lib/request-ip";

export interface DetectionReviewResult {
  ok: boolean;
  error?: string;
}

const noteSchema = z.string().trim().max(1000).optional();

/**
 * A detection can only be reviewed through the complaint it actually
 * belongs to — `detectionId` alone isn't trusted to imply `complaintId`,
 * even though this is admin-only (defense in depth, and it keeps the
 * audit_logs entity_id — the complaint — always correct).
 */
async function loadDetectionForComplaint(complaintId: string, detectionId: string) {
  return db
    .selectFrom("detections")
    .innerJoin("inference_results", "inference_results.id", "detections.inference_result_id")
    .select(["detections.id", "detections.ai_class_name", "detections.admin_corrected_class_name"])
    .where("detections.id", "=", detectionId)
    .where("inference_results.complaint_id", "=", complaintId)
    .executeTakeFirst();
}

/**
 * CLAUDE.md §6: "Admins can correct the category ... — both the original AI
 * output and the admin's corrected output remain in history (never
 * destructive-overwrite)." `ai_class_name` is never touched — only the
 * separate `admin_*` columns change.
 */
export async function correctDetectionAction(
  complaintId: string,
  detectionId: string,
  correctedClassName: string,
  note?: string
): Promise<DetectionReviewResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error };

  const ip = await getClientIp();
  if (!checkRateLimit(`admin-detection-review:${ip}`, 40, 15 * 60 * 1000).allowed) {
    return { ok: false, error: "Too many requests. Wait a few minutes and try again." };
  }

  if (!isDebrisClassName(correctedClassName)) {
    return { ok: false, error: "Invalid debris class." };
  }
  const parsedNote = noteSchema.safeParse(note);
  if (!parsedNote.success) return { ok: false, error: "Note is too long." };

  const detection = await loadDetectionForComplaint(complaintId, detectionId);
  if (!detection) return { ok: false, error: "Detection not found for this complaint." };

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("detections")
      .set({
        admin_reviewed: true,
        admin_rejected: false,
        admin_corrected_class_name: correctedClassName,
        admin_note: parsedNote.data ?? null,
        admin_reviewed_by: guard.session.user.id,
        admin_reviewed_at: new Date().toISOString(),
      })
      .where("id", "=", detectionId)
      .execute();

    await trx
      .insertInto("audit_logs")
      .values({
        actor_id: guard.session.user.id,
        action: "detection_corrected",
        entity_type: "complaint",
        entity_id: complaintId,
        before: JSON.stringify({ detectionId, aiClassName: detection.ai_class_name, priorCorrectedClassName: detection.admin_corrected_class_name }),
        after: JSON.stringify({ detectionId, correctedClassName, note: parsedNote.data ?? null }),
        ip_address: ipForStorage(ip),
      })
      .execute();
  });

  return { ok: true };
}

/**
 * CLAUDE.md §6: "Admins can ... reject a detection" (e.g. a false positive).
 * Rejecting never deletes the row — the AI's original output stays intact
 * for audit; only `admin_rejected`/`admin_reviewed` flip.
 */
export async function rejectDetectionAction(complaintId: string, detectionId: string, note?: string): Promise<DetectionReviewResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error };

  const ip = await getClientIp();
  if (!checkRateLimit(`admin-detection-review:${ip}`, 40, 15 * 60 * 1000).allowed) {
    return { ok: false, error: "Too many requests. Wait a few minutes and try again." };
  }

  const parsedNote = noteSchema.safeParse(note);
  if (!parsedNote.success) return { ok: false, error: "Note is too long." };

  const detection = await loadDetectionForComplaint(complaintId, detectionId);
  if (!detection) return { ok: false, error: "Detection not found for this complaint." };

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("detections")
      .set({
        admin_reviewed: true,
        admin_rejected: true,
        admin_corrected_class_name: null,
        admin_note: parsedNote.data ?? null,
        admin_reviewed_by: guard.session.user.id,
        admin_reviewed_at: new Date().toISOString(),
      })
      .where("id", "=", detectionId)
      .execute();

    await trx
      .insertInto("audit_logs")
      .values({
        actor_id: guard.session.user.id,
        action: "detection_rejected",
        entity_type: "complaint",
        entity_id: complaintId,
        before: JSON.stringify({ detectionId, aiClassName: detection.ai_class_name }),
        after: JSON.stringify({ detectionId, rejected: true, note: parsedNote.data ?? null }),
        ip_address: ipForStorage(ip),
      })
      .execute();
  });

  return { ok: true };
}
