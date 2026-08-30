"use server";

import { sql } from "kysely";

import { auth } from "@/auth";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { insertComplaintWithUniqueNumber } from "@/lib/complaints/complaint-number";
import { MAX_PHOTOS } from "@/lib/complaints/constants";
import { db } from "@/lib/db";
import { processComplaintImage } from "@/lib/images/process";
import { processInferenceJob } from "@/lib/inference/process-job";
import { getClientIp } from "@/lib/request-ip";
import { putObject } from "@/lib/storage/s3";
import { complaintDescriptionSchema, locationSubmissionSchema } from "@/lib/validation/complaint";

export interface SubmitComplaintResult {
  ok: boolean;
  error?: string;
  complaintNumber?: string;
}

/**
 * The authoritative submission path (CLAUDE.md §0, §6). Every check the
 * wizard already ran client-side (image validity, consent, location
 * presence) is re-run here against the real File objects and the real
 * session — the wizard's own "valid" state is a UX convenience, never a
 * trust boundary.
 *
 * CLAUDE.md §13 (hackathon deployment): inference runs synchronously,
 * in-request, via a direct `processInferenceJob` call after the DB
 * transaction commits — not enqueued for a separate worker. The citizen
 * waits ~7-10s on submit for this; §6 above documents the production-shaped
 * async design this simplifies. See PROGRESS.md for the retry story if
 * inference fails.
 */
export async function submitComplaintAction(formData: FormData): Promise<SubmitComplaintResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "You must be signed in." };

  const ip = await getClientIp();
  // Submission does real work (image processing + object storage writes) —
  // a lower ceiling than geocode's lookup-only rate limit is appropriate.
  if (!checkRateLimit(`submit:${ip}`, 10, 15 * 60 * 1000).allowed) {
    return { ok: false, error: "Too many submissions. Wait a few minutes and try again." };
  }

  const photoFiles = formData.getAll("photos").filter((v): v is File => v instanceof File);
  if (photoFiles.length === 0) {
    return { ok: false, error: "Add at least one photo before submitting." };
  }
  if (photoFiles.length > MAX_PHOTOS) {
    return { ok: false, error: `Too many photos — up to ${MAX_PHOTOS} are allowed.` };
  }

  const locationRaw = formData.get("location");
  if (typeof locationRaw !== "string") {
    return { ok: false, error: "Missing location data." };
  }
  let locationJson: unknown;
  try {
    locationJson = JSON.parse(locationRaw);
  } catch {
    return { ok: false, error: "Invalid location data." };
  }
  const locationParsed = locationSubmissionSchema.safeParse(locationJson);
  if (!locationParsed.success) {
    return {
      ok: false,
      error:
        locationParsed.error.issues[0]?.message === "Location consent is required."
          ? "Location consent is required before you can submit."
          : "Set a valid location before submitting.",
    };
  }
  const location = locationParsed.data;

  const descriptionParsed = complaintDescriptionSchema.safeParse(String(formData.get("description") ?? ""));
  const description = descriptionParsed.success && descriptionParsed.data.length > 0 ? descriptionParsed.data : null;

  // Re-process every photo from its real bytes — never trust the client's
  // earlier "ok" status (validateComplaintImageAction was advisory feedback
  // only, see that module's own docstring).
  const processed: { buffer: Buffer; contentType: string; width?: number; height?: number }[] = [];
  for (const [index, file] of photoFiles.entries()) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await processComplaintImage(buffer, file.type);
    if (!result.ok || !result.buffer) {
      return { ok: false, error: `Photo ${index + 1}: ${result.errors.join(" ") || "could not be processed."}` };
    }
    processed.push({ buffer: result.buffer, contentType: "image/jpeg", width: result.width, height: result.height });
  }

  const complaintId = crypto.randomUUID();

  // Object storage is written before the DB transaction: if a PUT fails,
  // nothing has been committed to Postgres to clean up. If the transaction
  // below fails after these succeed, the uploaded objects are orphaned in
  // the bucket — harmless clutter (nothing references them), not a broken
  // reference — which is the safer failure mode than the reverse order.
  const uploadedImages: { storageKey: string; sizeBytes: number; width: number | null; height: number | null }[] = [];
  try {
    for (const [index, image] of processed.entries()) {
      const storageKey = `complaints/${complaintId}/original/${index}.jpg`;
      await putObject(storageKey, image.buffer, image.contentType);
      uploadedImages.push({
        storageKey,
        sizeBytes: image.buffer.byteLength,
        width: image.width ?? null,
        height: image.height ?? null,
      });
    }
  } catch (err) {
    // Was previously swallowed silently — undiagnosable from Vercel's
    // function logs alone (found on a real deployment where "Could not
    // upload photos" was the only symptom, with no way to tell whether it
    // was bad credentials, a wrong bucket/region, or a network failure).
    console.error("Complaint image upload failed:", err);
    return { ok: false, error: "Could not upload photos. Try again." };
  }

  try {
    const complaintNumber = await db.transaction().execute(async (trx) => {
      const insertedLocation = await trx
        .insertInto("locations")
        .values({
          geog: sql`ST_SetSRID(ST_MakePoint(${location.lng}, ${location.lat}), 4326)::geography`,
          accuracy_meters: location.accuracyMeters,
          altitude_meters: location.altitudeMeters,
          exif_lat: location.exifLat,
          exif_lng: location.exifLng,
          locality: location.locality || null,
          city: location.city || null,
          district: location.district || null,
          state: location.state || null,
          pin_code: location.pinCode || null,
          landmark: location.landmark || null,
          consent_given: true,
          consent_captured_at: new Date().toISOString(),
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      const number = await insertComplaintWithUniqueNumber(trx, {
        id: complaintId,
        citizen_id: session.user.id,
        location_id: insertedLocation.id,
        description,
      });

      if (uploadedImages.length > 0) {
        await trx
          .insertInto("complaint_images")
          .values(
            uploadedImages.map((img) => ({
              complaint_id: complaintId,
              image_type: "original" as const,
              storage_key: img.storageKey,
              mime_type: "image/jpeg" as const,
              size_bytes: img.sizeBytes,
              width_px: img.width,
              height_px: img.height,
            }))
          )
          .execute();
      }

      await trx
        .insertInto("status_history")
        .values({
          complaint_id: complaintId,
          from_status: null,
          to_status: "SUBMITTED",
          changed_by: session.user.id,
          note: "Complaint submitted by citizen.",
        })
        .execute();

      await trx
        .updateTable("complaints")
        .set({ status: "AI_ANALYSIS_PENDING", updated_at: new Date().toISOString() })
        .where("id", "=", complaintId)
        .execute();

      await trx
        .insertInto("status_history")
        .values({
          complaint_id: complaintId,
          from_status: "SUBMITTED",
          to_status: "AI_ANALYSIS_PENDING",
          changed_by: null,
          note: "Awaiting automated debris detection.",
        })
        .execute();

      return number;
    });

    // Run only after the transaction commits — inference must never run
    // against a complaint that isn't durably persisted yet. CLAUDE.md §13:
    // called synchronously here (no queue/worker in this deployment), so the
    // citizen genuinely waits through this — the wizard's ReviewStep shows a
    // distinct "running automatic debris detection" phase for it, not just a
    // bare spinner. A failure here (the inference service down, a timeout,
    // an unexpected response) is logged, not surfaced to the citizen: the
    // complaint itself was created successfully (they have a real number),
    // so this must never turn into a citizen-facing submission failure. It
    // leaves the complaint at AI_ANALYSIS_PENDING — retryable via the admin
    // "Retry AI analysis" action (lib/admin/actions/retry-inference.ts) since
    // processInferenceJob is safe to call again for any complaint still at
    // that status. See PROGRESS.md for why this is the chosen retry story.
    try {
      await processInferenceJob(complaintId);
    } catch (error) {
      console.error(`Inference failed for complaint ${complaintNumber}:`, error);
    }

    return { ok: true, complaintNumber };
  } catch (err) {
    console.error("Complaint submission transaction failed:", err);
    return { ok: false, error: "Could not submit your complaint. Try again." };
  }
}
