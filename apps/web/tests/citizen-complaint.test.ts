import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";
import sharp from "sharp";

import {
  getCitizenComplaintByNumber,
  getCitizenComplaintFullDetail,
  isReopenableOrRatable,
  isWithdrawable,
} from "@/lib/complaints/citizen-complaint";
import { db } from "@/lib/db";
import { putObject } from "@/lib/storage/s3";

const COMPLAINT_NUMBER = "CLN-20260101-CTZN01";
let ownerId: string;
let otherId: string;
let locationId: string;
let complaintId: string;

beforeAll(async () => {
  const owner = await db
    .insertInto("users")
    .values({
      email: `citizen-complaint-owner-${Date.now()}@example.com`,
      password_hash: "x",
      full_name: "Owner",
      role: "citizen",
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  ownerId = owner.id;

  const other = await db
    .insertInto("users")
    .values({
      email: `citizen-complaint-other-${Date.now()}@example.com`,
      password_hash: "x",
      full_name: "Other",
      role: "citizen",
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  otherId = other.id;

  const location = await sql<{ id: string }>`
    INSERT INTO locations (geog, locality, city, state)
    VALUES (ST_SetSRID(ST_MakePoint(72.8347, 18.9220), 4326)::geography, 'Test Locality', 'Test City', 'Test State')
    RETURNING id
  `.execute(db);
  locationId = location.rows[0]!.id;

  const complaint = await sql<{ id: string }>`
    INSERT INTO complaints (complaint_number, citizen_id, location_id, status, description)
    VALUES (${COMPLAINT_NUMBER}, ${ownerId}::uuid, ${locationId}::uuid, 'AI_ANALYSIS_PENDING', 'Owned by owner')
    RETURNING id
  `.execute(db);
  complaintId = complaint.rows[0]!.id;
});

afterAll(async () => {
  await db.deleteFrom("complaints").where("id", "=", complaintId).execute();
  await sql`DELETE FROM locations WHERE id = ${locationId}::uuid`.execute(db);
  await db.deleteFrom("users").where("id", "in", [ownerId, otherId]).execute();
  await db.destroy();
});

describe("getCitizenComplaintByNumber", () => {
  it("returns the complaint for its owner", async () => {
    const result = await getCitizenComplaintByNumber(ownerId, COMPLAINT_NUMBER);
    expect(result).not.toBeNull();
    expect(result?.status).toBe("AI_ANALYSIS_PENDING");
    expect(result?.city).toBe("Test City");
  });

  it("returns null when a different citizen requests the same number", async () => {
    const result = await getCitizenComplaintByNumber(otherId, COMPLAINT_NUMBER);
    expect(result).toBeNull();
  });

  it("returns null for a nonexistent complaint number", async () => {
    const result = await getCitizenComplaintByNumber(ownerId, "CLN-20260101-ZZZZZZ");
    expect(result).toBeNull();
  });
});

describe("isWithdrawable / isReopenableOrRatable", () => {
  it("allows withdraw for every non-terminal status", () => {
    for (const status of ["SUBMITTED", "AI_ANALYSIS_PENDING", "UNDER_REVIEW", "ASSIGNED", "ACTION_IN_PROGRESS"] as const) {
      expect(isWithdrawable(status)).toBe(true);
    }
  });

  it("disallows withdraw once a complaint reaches a terminal status", () => {
    for (const status of ["RESOLVED", "CLOSED", "REJECTED_DUPLICATE"] as const) {
      expect(isWithdrawable(status)).toBe(false);
    }
  });

  it("only allows reopen/rate while RESOLVED", () => {
    expect(isReopenableOrRatable("RESOLVED")).toBe(true);
    expect(isReopenableOrRatable("UNDER_REVIEW")).toBe(false);
    expect(isReopenableOrRatable("CLOSED")).toBe(false);
  });
});

describe("getCitizenComplaintFullDetail", () => {
  it("includes landmark, photos (as real signed URLs), updates, and no feedback yet", async () => {
    const buffer = await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 10, g: 10, b: 10 } } })
      .jpeg()
      .toBuffer();
    const storageKey = `complaints/${complaintId}/original/0.jpg`;
    await putObject(storageKey, buffer, "image/jpeg");
    await db
      .insertInto("complaint_images")
      .values({
        complaint_id: complaintId,
        image_type: "original",
        storage_key: storageKey,
        mime_type: "image/jpeg",
        size_bytes: buffer.byteLength,
        width_px: 100,
        height_px: 100,
      })
      .execute();
    await sql`UPDATE locations SET landmark = 'Near the jetty' WHERE id = ${locationId}::uuid`.execute(db);
    await db
      .insertInto("public_updates")
      .values({ complaint_id: complaintId, message: "Test update.", created_by: null })
      .execute();

    const detail = await getCitizenComplaintFullDetail(ownerId, COMPLAINT_NUMBER);
    expect(detail).not.toBeNull();
    expect(detail?.landmark).toBe("Near the jetty");
    expect(detail?.photoUrls).toHaveLength(1);
    expect(detail?.photoUrls[0]).toMatch(/^http/);
    expect(detail?.updates.map((u) => u.message)).toContain("Test update.");
    expect(detail?.currentCycleFeedback).toBeNull();

    await db.deleteFrom("public_updates").where("complaint_id", "=", complaintId).execute();
    await db.deleteFrom("complaint_images").where("complaint_id", "=", complaintId).execute();
  });

  it("returns null for a different citizen (same not-found shape as the lighter lookup)", async () => {
    const detail = await getCitizenComplaintFullDetail(otherId, COMPLAINT_NUMBER);
    expect(detail).toBeNull();
  });

  it("only surfaces feedback created after the most recent resolution", async () => {
    const resolvedId = crypto.randomUUID();
    const location = await sql<{ id: string }>`
      INSERT INTO locations (geog, consent_given) VALUES (ST_SetSRID(ST_MakePoint(72.8, 18.9), 4326)::geography, TRUE) RETURNING id
    `.execute(db);
    const complaintNumber = "CLN-20260101-RESLV1";
    await sql`
      INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status)
      VALUES (${resolvedId}::uuid, ${complaintNumber}, ${ownerId}::uuid, ${location.rows[0]!.id}::uuid, 'RESOLVED')
    `.execute(db);

    // An old rating from BEFORE the (only, in this fixture) resolution event
    // should never surface — simulate that by inserting status_history for
    // the resolution AFTER the feedback row's timestamp.
    await db
      .insertInto("complaint_feedback")
      .values({ complaint_id: resolvedId, citizen_id: ownerId, rating: 2, comment: "old, stale rating" })
      .execute();
    await new Promise((r) => setTimeout(r, 10));
    await db
      .insertInto("status_history")
      .values({ complaint_id: resolvedId, from_status: "ACTION_IN_PROGRESS", to_status: "RESOLVED", changed_by: null, note: null })
      .execute();

    let detail = await getCitizenComplaintFullDetail(ownerId, complaintNumber);
    expect(detail?.currentCycleFeedback).toBeNull();

    await new Promise((r) => setTimeout(r, 10));
    await db
      .insertInto("complaint_feedback")
      .values({ complaint_id: resolvedId, citizen_id: ownerId, rating: 5, comment: "fresh rating" })
      .execute();

    detail = await getCitizenComplaintFullDetail(ownerId, complaintNumber);
    expect(detail?.currentCycleFeedback).toMatchObject({ rating: 5, comment: "fresh rating" });

    await db.deleteFrom("complaint_feedback").where("complaint_id", "=", resolvedId).execute();
    await db.deleteFrom("status_history").where("complaint_id", "=", resolvedId).execute();
    await db.deleteFrom("complaints").where("id", "=", resolvedId).execute();
    await sql`DELETE FROM locations WHERE id = ${location.rows[0]!.id}::uuid`.execute(db);
  });

  it("falls back to the latest feedback row when no matching status_history exists (defensive — real feedback must never appear to vanish)", async () => {
    const resolvedId = crypto.randomUUID();
    const location = await sql<{ id: string }>`
      INSERT INTO locations (geog, consent_given) VALUES (ST_SetSRID(ST_MakePoint(72.8, 18.9), 4326)::geography, TRUE) RETURNING id
    `.execute(db);
    const complaintNumber = "CLN-20260101-NOHST1";
    // Deliberately RESOLVED with no status_history row at all — simulates a
    // fixture/data gap, not a real app-created transition.
    await sql`
      INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status)
      VALUES (${resolvedId}::uuid, ${complaintNumber}, ${ownerId}::uuid, ${location.rows[0]!.id}::uuid, 'RESOLVED')
    `.execute(db);
    await db
      .insertInto("complaint_feedback")
      .values({ complaint_id: resolvedId, citizen_id: ownerId, rating: 3, comment: "no history row" })
      .execute();

    const detail = await getCitizenComplaintFullDetail(ownerId, complaintNumber);
    expect(detail?.currentCycleFeedback).toMatchObject({ rating: 3, comment: "no history row" });

    await db.deleteFrom("complaint_feedback").where("complaint_id", "=", resolvedId).execute();
    await db.deleteFrom("complaints").where("id", "=", resolvedId).execute();
    await sql`DELETE FROM locations WHERE id = ${location.rows[0]!.id}::uuid`.execute(db);
  });
});
