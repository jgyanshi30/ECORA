import sharp from "sharp";
import { z } from "zod";

import { db } from "@/lib/db";
import { ensureModelVersion, fetchInferenceServiceHealth } from "@/lib/inference/model-versions";
import { computeAndStoreRiskAssessment } from "@/lib/risk/assess";
import { getObjectBuffer, putObject } from "@/lib/storage/s3";
import { findUserById } from "@/lib/auth/users";
import { recordInAppNotification, notifyCitizenByEmail } from "@/lib/notifications/service";

const AI_COMPLETE_MESSAGE = "Automated analysis is complete. Your report is now under review by our team.";

/** Mirrors services/inference/app/schemas.py's InferResponse (CLAUDE.md §6) — validated, not blindly trusted, since it crosses a network/process boundary. */
const inferResponseSchema = z.object({
  complaint_id: z.string(),
  model_version: z.string(),
  detections: z.array(
    z.object({
      class_id: z.number().int(),
      class_name: z.string(),
      confidence: z.number().min(0).max(1),
      bbox: z.object({ x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number() }),
    })
  ),
  object_count: z.number().int(),
  annotated_image_url: z.string(),
  inference_time_ms: z.number().int(),
  inference_timestamp: z.string(),
});

export class InferenceJobError extends Error {}

/**
 * The authoritative post-submission pipeline (CLAUDE.md §6): calls the
 * FastAPI inference service for a complaint's stored original photo,
 * persists InferenceResults + Detections, re-uploads the annotated image to
 * our own object storage (the Python service's local /results is never the
 * public-facing host — CLAUDE.md §5, §11), and advances
 * AI_ANALYSIS_PENDING -> UNDER_REVIEW. The citizen-visible public_updates
 * message never mentions detected classes/counts — CLAUDE.md §0/§6: AI
 * results are never presented to a citizen as fact.
 *
 * Scope for this sub-step: only the FIRST submitted photo is sent for
 * analysis (multi-image aggregation is a real design decision — one
 * InferenceResults per image vs. one combined result — deliberately left for
 * a dedicated future sub-step rather than rushed here; see PROGRESS.md).
 *
 * Idempotent: a complaint no longer sitting at AI_ANALYSIS_PENDING (already
 * processed by an earlier delivery of the same job) is a silent no-op, not
 * an error — the queue makes no exactly-once guarantee.
 */
export async function processInferenceJob(complaintId: string): Promise<void> {
  const baseUrl = process.env.INFERENCE_SERVICE_URL;
  if (!baseUrl) throw new InferenceJobError("INFERENCE_SERVICE_URL is not configured.");

  const complaint = await db
    .selectFrom("complaints")
    .select(["id", "complaint_number", "status", "location_id", "citizen_id"])
    .where("id", "=", complaintId)
    .executeTakeFirst();
  if (!complaint) throw new InferenceJobError(`Complaint not found: ${complaintId}`);
  if (complaint.status !== "AI_ANALYSIS_PENDING") return;

  const originalImage = await db
    .selectFrom("complaint_images")
    .select(["id", "storage_key", "width_px", "height_px"])
    .where("complaint_id", "=", complaintId)
    .where("image_type", "=", "original")
    .orderBy("created_at", "asc")
    .executeTakeFirst();
  if (!originalImage) throw new InferenceJobError(`No original image found for complaint ${complaintId}`);

  const imageBuffer = await getObjectBuffer(originalImage.storage_key);

  const form = new FormData();
  form.set("complaint_id", complaint.complaint_number);
  form.set("image", new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" }), "original.jpg");

  const inferResponse = await fetch(`${baseUrl}/infer`, { method: "POST", body: form });
  if (!inferResponse.ok) {
    throw new InferenceJobError(`Inference service returned ${inferResponse.status} for ${complaint.complaint_number}`);
  }
  const parsed = inferResponseSchema.safeParse(await inferResponse.json());
  if (!parsed.success) {
    throw new InferenceJobError(`Inference service returned an unexpected response shape: ${parsed.error.message}`);
  }
  const result = parsed.data;

  const health = await fetchInferenceServiceHealth(baseUrl);
  const modelVersionId = await ensureModelVersion(health);

  const annotatedResponse = await fetch(`${baseUrl}${result.annotated_image_url}`);
  if (!annotatedResponse.ok) {
    throw new InferenceJobError(`Could not fetch annotated image for ${complaint.complaint_number}`);
  }
  const annotatedBuffer = Buffer.from(await annotatedResponse.arrayBuffer());
  const annotatedMeta = await sharp(annotatedBuffer).metadata();
  const annotatedKey = `complaints/${complaintId}/annotated/0.jpg`;
  await putObject(annotatedKey, annotatedBuffer, "image/jpeg");

  await db.transaction().execute(async (trx) => {
    const annotatedImageRow = await trx
      .insertInto("complaint_images")
      .values({
        complaint_id: complaintId,
        image_type: "annotated",
        storage_key: annotatedKey,
        mime_type: "image/jpeg",
        size_bytes: annotatedBuffer.byteLength,
        width_px: annotatedMeta.width ?? null,
        height_px: annotatedMeta.height ?? null,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    const inferenceResultRow = await trx
      .insertInto("inference_results")
      .values({
        complaint_id: complaintId,
        model_version_id: modelVersionId,
        object_count: result.object_count,
        annotated_image_id: annotatedImageRow.id,
        inference_time_ms: result.inference_time_ms,
        raw_response: JSON.stringify(result),
        inferred_at: result.inference_timestamp,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    if (result.detections.length > 0) {
      await trx
        .insertInto("detections")
        .values(
          result.detections.map((d) => ({
            inference_result_id: inferenceResultRow.id,
            ai_class_id: d.class_id,
            ai_class_name: d.class_name,
            ai_confidence: d.confidence,
            ai_bbox_x1: d.bbox.x1,
            ai_bbox_y1: d.bbox.y1,
            ai_bbox_x2: d.bbox.x2,
            ai_bbox_y2: d.bbox.y2,
          }))
        )
        .execute();
    }

    await trx
      .updateTable("complaints")
      .set({ status: "UNDER_REVIEW", updated_at: new Date().toISOString() })
      .where("id", "=", complaintId)
      .execute();

    const historyRow = await trx
      .insertInto("status_history")
      .values({
        complaint_id: complaintId,
        from_status: "AI_ANALYSIS_PENDING",
        to_status: "UNDER_REVIEW",
        changed_by: null,
        note: `Automated analysis complete (${result.object_count} object(s) flagged for review).`,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    // Citizen-visible — deliberately generic. Never states what was
    // detected or how many objects; CLAUDE.md §0/§6 forbid presenting a raw
    // model verdict to a citizen as fact.
    await trx
      .insertInto("public_updates")
      .values({
        complaint_id: complaintId,
        status_history_id: historyRow.id,
        message: AI_COMPLETE_MESSAGE,
        created_by: null,
      })
      .execute();

    await recordInAppNotification(trx, {
      userId: complaint.citizen_id,
      complaintId,
      type: "ai_analysis_complete",
      message: AI_COMPLETE_MESSAGE,
    });

    // CLAUDE.md §7: computed as soon as enough data exists to score (the
    // detections just persisted above) — admin-only until an admin views it;
    // never surfaced to the citizen (see CLAUDE.md §0's "AI results never
    // presented as fact" rule, which extends to risk level too).
    const imageAreaPx = (originalImage.width_px ?? 0) * (originalImage.height_px ?? 0);
    await computeAndStoreRiskAssessment(trx, {
      complaintId,
      locationId: complaint.location_id,
      detections: result.detections.map((d) => ({
        className: d.class_name,
        bboxAreaPx: Math.max(0, d.bbox.x2 - d.bbox.x1) * Math.max(0, d.bbox.y2 - d.bbox.y1),
      })),
      imageAreaPx,
    });
  });

  const citizen = await findUserById(complaint.citizen_id);
  if (citizen) {
    await notifyCitizenByEmail({
      userId: complaint.citizen_id,
      complaintId,
      type: "ai_analysis_complete",
      message: AI_COMPLETE_MESSAGE,
      to: citizen.email,
      complaintNumber: complaint.complaint_number,
    });
  }
}
