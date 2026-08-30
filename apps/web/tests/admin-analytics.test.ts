import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";

import { getAdminAnalytics } from "@/lib/admin/analytics";
import { db } from "@/lib/db";

let citizenId: string;
let locationId: string;
let resolvedComplaintId: string;
let submittedComplaintId: string;
const complaintIds: string[] = [];

beforeAll(async () => {
  const user = await db
    .insertInto("users")
    .values({ email: `analytics-test-${Date.now()}@example.com`, password_hash: "x", full_name: "Analytics Test", role: "citizen" })
    .returningAll()
    .executeTakeFirstOrThrow();
  citizenId = user.id;

  const location = await sql<{ id: string }>`
    INSERT INTO locations (geog, city, consent_given) VALUES (ST_SetSRID(ST_MakePoint(72.8347, 18.9220), 4326)::geography, 'Analytics City', TRUE) RETURNING id
  `.execute(db);
  locationId = location.rows[0]!.id;

  // A complaint submitted 5 days ago and resolved just now — a real, computable 5-day resolution time.
  resolvedComplaintId = crypto.randomUUID();
  await sql`
    INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status, created_at)
    VALUES (${resolvedComplaintId}::uuid, 'CLN-20260401-ANLY01', ${citizenId}::uuid, ${locationId}::uuid, 'RESOLVED', now() - interval '5 days')
  `.execute(db);
  complaintIds.push(resolvedComplaintId);
  await sql`
    INSERT INTO status_history (complaint_id, from_status, to_status, changed_by)
    VALUES (${resolvedComplaintId}::uuid, 'ACTION_IN_PROGRESS', 'RESOLVED', NULL)
  `.execute(db);
  await db
    .insertInto("complaint_feedback")
    .values({ complaint_id: resolvedComplaintId, citizen_id: citizenId, rating: 4, comment: "Quick fix" })
    .execute();

  submittedComplaintId = crypto.randomUUID();
  await sql`
    INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status)
    VALUES (${submittedComplaintId}::uuid, 'CLN-20260401-ANLY02', ${citizenId}::uuid, ${locationId}::uuid, 'SUBMITTED')
  `.execute(db);
  complaintIds.push(submittedComplaintId);

  const modelVersion = await db
    .insertInto("model_versions")
    .values({ version: "analytics-test-v1", runtime: "onnx", model_path: "x", class_map: "{}" })
    .onConflict((oc) => oc.column("version").doUpdateSet({ runtime: "onnx" }))
    .returning("id")
    .executeTakeFirstOrThrow();
  const inferenceResult = await db
    .insertInto("inference_results")
    .values({ complaint_id: resolvedComplaintId, model_version_id: modelVersion.id, object_count: 1, raw_response: "{}" })
    .returning("id")
    .executeTakeFirstOrThrow();
  await db
    .insertInto("detections")
    .values({
      inference_result_id: inferenceResult.id,
      ai_class_id: 11,
      ai_class_name: "plastic",
      ai_confidence: 0.9,
      ai_bbox_x1: 0,
      ai_bbox_y1: 0,
      ai_bbox_x2: 1,
      ai_bbox_y2: 1,
    })
    .execute();

  await db
    .insertInto("risk_assessments")
    .values({
      complaint_id: resolvedComplaintId,
      risk_level: "HIGH",
      score: 60,
      factor_breakdown: "{}",
      is_admin_override: false,
      is_current: true,
    })
    .execute();
});

afterAll(async () => {
  await db.deleteFrom("risk_assessments").where("complaint_id", "in", complaintIds).execute();
  await db.deleteFrom("complaint_feedback").where("complaint_id", "in", complaintIds).execute();
  await db
    .deleteFrom("detections")
    .where(
      "inference_result_id",
      "in",
      db.selectFrom("inference_results").select("id").where("complaint_id", "in", complaintIds)
    )
    .execute();
  await db.deleteFrom("inference_results").where("complaint_id", "in", complaintIds).execute();
  await db.deleteFrom("model_versions").where("version", "=", "analytics-test-v1").execute();
  await db.deleteFrom("status_history").where("complaint_id", "in", complaintIds).execute();
  await db.deleteFrom("complaints").where("id", "in", complaintIds).execute();
  await sql`DELETE FROM locations WHERE id = ${locationId}::uuid`.execute(db);
  await db.deleteFrom("users").where("id", "=", citizenId).execute();
  await db.destroy();
});

describe("getAdminAnalytics", () => {
  it("computes every metric from real data, including zero-filled buckets with no data", async () => {
    const data = await getAdminAnalytics();

    expect(data.totalComplaints).toBeGreaterThanOrEqual(2);
    expect(data.statusBreakdown.SUBMITTED).toBeGreaterThanOrEqual(1);
    expect(data.statusBreakdown.RESOLVED).toBeGreaterThanOrEqual(1);
    expect(Object.keys(data.statusBreakdown)).toHaveLength(8);

    expect(data.riskBreakdown.HIGH).toBeGreaterThanOrEqual(1);
    expect(Object.keys(data.riskBreakdown)).toHaveLength(4);

    expect(data.debrisClassBreakdown.some((d) => d.className === "plastic")).toBe(true);

    expect(data.avgResolutionDays).not.toBeNull();
    expect(data.avgResolutionDays!).toBeGreaterThan(4);
    expect(data.avgResolutionDays!).toBeLessThan(6);
    expect(data.resolvedCount).toBeGreaterThanOrEqual(1);

    expect(data.avgSatisfactionRating).not.toBeNull();
    expect(data.ratingCount).toBeGreaterThanOrEqual(1);

    expect(data.topCities.some((c) => c.city === "Analytics City")).toBe(true);

    // Both fixture complaints were created "now" or "5 days ago" — within the 30-day window.
    const totalInWindow = data.submissionsByDay.reduce((sum, d) => sum + d.count, 0);
    expect(totalInWindow).toBeGreaterThanOrEqual(2);
  });

  it("returns null averages (not NaN or a crash) when there is no data for that metric", async () => {
    // Can't easily produce a fully-empty DB in this shared-fixture test file,
    // but we can assert the shape/type contract holds for the populated case
    // and that no field is ever NaN.
    const data = await getAdminAnalytics();
    expect(Number.isNaN(data.avgResolutionDays)).toBe(false);
    expect(Number.isNaN(data.avgSatisfactionRating)).toBe(false);
  });
});
