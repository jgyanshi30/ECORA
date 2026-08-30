import { isComplaintStatus, type ComplaintStatus } from "@ecora/shared";

import { db } from "@/lib/db";
import { getSignedGetUrl } from "@/lib/storage/s3";

export interface CitizenComplaintDetail {
  complaintNumber: string;
  status: ComplaintStatus;
  createdAt: Date;
  locality: string | null;
  city: string | null;
  state: string | null;
}

/**
 * Scoped to citizen_id — a citizen can only ever look up their own complaint
 * by number this way (CLAUDE.md §0). Used by the post-submit success page;
 * deliberately returns the same "not found" shape whether the number doesn't
 * exist at all or belongs to someone else, so this endpoint can't be used to
 * probe for the existence of other citizens' complaint numbers.
 */
export async function getCitizenComplaintByNumber(
  citizenId: string,
  complaintNumber: string
): Promise<CitizenComplaintDetail | null> {
  const row = await db
    .selectFrom("complaints")
    .innerJoin("locations", "locations.id", "complaints.location_id")
    .select([
      "complaints.complaint_number",
      "complaints.status",
      "complaints.created_at",
      "locations.locality",
      "locations.city",
      "locations.state",
    ])
    .where("complaints.citizen_id", "=", citizenId)
    .where("complaints.complaint_number", "=", complaintNumber)
    .executeTakeFirst();

  if (!row) return null;
  if (!isComplaintStatus(row.status)) {
    throw new Error(`Unexpected complaint status in DB: ${row.status}`);
  }

  return {
    complaintNumber: row.complaint_number,
    status: row.status,
    createdAt: row.created_at,
    locality: row.locality,
    city: row.city,
    state: row.state,
  };
}

/** Statuses a citizen can still withdraw from — anything not already a terminal outcome. */
const WITHDRAWABLE_STATUSES: ComplaintStatus[] = [
  "SUBMITTED",
  "AI_ANALYSIS_PENDING",
  "UNDER_REVIEW",
  "ASSIGNED",
  "ACTION_IN_PROGRESS",
];

export function isWithdrawable(status: ComplaintStatus): boolean {
  return WITHDRAWABLE_STATUSES.includes(status);
}

export function isReopenableOrRatable(status: ComplaintStatus): boolean {
  return status === "RESOLVED";
}

export interface CitizenComplaintUpdate {
  message: string;
  createdAt: Date;
}

export interface CitizenComplaintFeedback {
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export interface CitizenComplaintFullDetail {
  id: string;
  complaintNumber: string;
  status: ComplaintStatus;
  createdAt: Date;
  updatedAt: Date;
  description: string | null;
  locality: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pinCode: string | null;
  landmark: string | null;
  updates: CitizenComplaintUpdate[];
  photoUrls: string[];
  /** Feedback for the CURRENT resolution cycle only — null if never rated, or if reopened since the last rating (see getComplaintFullDetailForCitizen for why). */
  currentCycleFeedback: CitizenComplaintFeedback | null;
}

/**
 * Full detail for the authenticated citizen's own complaint page. Never
 * selects `geog`/exact coordinates or admin_notes (CLAUDE.md §0, §5) — only
 * ever exposes what the citizen themselves already knows: their own address
 * fields, their own uploaded photos (never the AI-annotated image — CLAUDE.md
 * §0 forbids presenting a raw model verdict to a citizen as fact, and a
 * bounding-box overlay would do exactly that), and the citizen-curated
 * `public_updates` timeline (never internal `status_history` notes or
 * `admin_notes`).
 */
export async function getCitizenComplaintFullDetail(
  citizenId: string,
  complaintNumber: string
): Promise<CitizenComplaintFullDetail | null> {
  const row = await db
    .selectFrom("complaints")
    .innerJoin("locations", "locations.id", "complaints.location_id")
    .select([
      "complaints.id",
      "complaints.complaint_number",
      "complaints.status",
      "complaints.created_at",
      "complaints.updated_at",
      "complaints.description",
      "locations.locality",
      "locations.city",
      "locations.district",
      "locations.state",
      "locations.pin_code",
      "locations.landmark",
    ])
    .where("complaints.citizen_id", "=", citizenId)
    .where("complaints.complaint_number", "=", complaintNumber)
    .executeTakeFirst();

  if (!row) return null;
  if (!isComplaintStatus(row.status)) {
    throw new Error(`Unexpected complaint status in DB: ${row.status}`);
  }

  const [updates, images, latestResolution] = await Promise.all([
    db
      .selectFrom("public_updates")
      .select(["message", "created_at"])
      .where("complaint_id", "=", row.id)
      .orderBy("created_at", "asc")
      .execute(),
    db
      .selectFrom("complaint_images")
      .select(["storage_key"])
      .where("complaint_id", "=", row.id)
      .where("image_type", "=", "original")
      .orderBy("created_at", "asc")
      .execute(),
    db
      .selectFrom("status_history")
      .select(["created_at"])
      .where("complaint_id", "=", row.id)
      .where("to_status", "=", "RESOLVED")
      .orderBy("created_at", "desc")
      .executeTakeFirst(),
  ]);

  // Feedback only counts for the CURRENT resolution cycle — a complaint that
  // was rated, then reopened, then resolved again should prompt for a fresh
  // rating, not show the stale one. Every real RESOLVED transition goes
  // through the transaction in lib/complaints/actions/manage.ts (or the
  // future admin resolve action) and always writes a matching status_history
  // row, so `latestResolution` should never be missing in practice — but if
  // it somehow is, fall back to the single most recent feedback row rather
  // than silently hiding a real rating (a citizen's own submitted feedback
  // must never appear to have vanished).
  let feedbackQuery = db
    .selectFrom("complaint_feedback")
    .select(["rating", "comment", "created_at"])
    .where("complaint_id", "=", row.id)
    .orderBy("created_at", "desc");
  if (latestResolution) {
    feedbackQuery = feedbackQuery.where("created_at", ">=", latestResolution.created_at);
  }
  const feedbackRow = await feedbackQuery.executeTakeFirst();

  const photoUrls = await Promise.all(images.map((img) => getSignedGetUrl(img.storage_key)));

  return {
    id: row.id,
    complaintNumber: row.complaint_number,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    description: row.description,
    locality: row.locality,
    city: row.city,
    district: row.district,
    state: row.state,
    pinCode: row.pin_code,
    landmark: row.landmark,
    updates: updates.map((u) => ({ message: u.message, createdAt: u.created_at })),
    photoUrls,
    currentCycleFeedback: feedbackRow
      ? { rating: feedbackRow.rating, comment: feedbackRow.comment, createdAt: feedbackRow.created_at }
      : null,
  };
}

/** Scoped lookup used by the withdraw/reopen/rate actions — returns the complaint id + current status only if it belongs to this citizen. */
export async function getOwnComplaintIdAndStatus(
  citizenId: string,
  complaintNumber: string
): Promise<{ id: string; status: ComplaintStatus } | null> {
  const row = await db
    .selectFrom("complaints")
    .select(["id", "status"])
    .where("citizen_id", "=", citizenId)
    .where("complaint_number", "=", complaintNumber)
    .executeTakeFirst();
  if (!row) return null;
  if (!isComplaintStatus(row.status)) throw new Error(`Unexpected complaint status in DB: ${row.status}`);
  return { id: row.id, status: row.status };
}
