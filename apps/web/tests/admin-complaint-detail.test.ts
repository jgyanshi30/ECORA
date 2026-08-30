import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";
import sharp from "sharp";

import { getAdminComplaintDetail, getAdminUserOptions } from "@/lib/admin/complaint-detail";
import { db } from "@/lib/db";
import { putObject } from "@/lib/storage/s3";

let adminId: string;
let citizenId: string;
let locationId: string;
let complaintId: string;
const COMPLAINT_NUMBER = "CLN-20260201-DETAIL";

beforeAll(async () => {
  const admin = await db
    .insertInto("users")
    .values({ email: `detail-admin-${Date.now()}@example.com`, password_hash: "x", full_name: "Admin Detail", role: "admin" })
    .returningAll()
    .executeTakeFirstOrThrow();
  adminId = admin.id;

  const citizen = await db
    .insertInto("users")
    .values({
      email: `detail-citizen-${Date.now()}@example.com`,
      password_hash: "x",
      full_name: "Citizen Detail",
      phone: "+91-90000-00000",
      role: "citizen",
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  citizenId = citizen.id;

  const location = await sql<{ id: string }>`
    INSERT INTO locations (geog, locality, city, state, pin_code, landmark, consent_given, accuracy_meters)
    VALUES (ST_SetSRID(ST_MakePoint(72.8347, 18.9220), 4326)::geography, 'Colaba', 'Mumbai', 'Maharashtra', '400005', 'Near the lighthouse', TRUE, 12)
    RETURNING id
  `.execute(db);
  locationId = location.rows[0]!.id;

  complaintId = crypto.randomUUID();
  await sql`
    INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status, description)
    VALUES (${complaintId}::uuid, ${COMPLAINT_NUMBER}, ${citizenId}::uuid, ${locationId}::uuid, 'UNDER_REVIEW', 'Plastic near the seawall')
  `.execute(db);

  const originalBuffer = await sharp({ create: { width: 200, height: 200, channels: 3, background: { r: 10, g: 90, b: 70 } } }).jpeg().toBuffer();
  const originalKey = `complaints/${complaintId}/original/0.jpg`;
  await putObject(originalKey, originalBuffer, "image/jpeg");
  await db
    .insertInto("complaint_images")
    .values({ complaint_id: complaintId, image_type: "original", storage_key: originalKey, mime_type: "image/jpeg", size_bytes: originalBuffer.byteLength, width_px: 200, height_px: 200 })
    .execute();

  const annotatedBuffer = await sharp({ create: { width: 200, height: 200, channels: 3, background: { r: 90, g: 10, b: 70 } } }).jpeg().toBuffer();
  const annotatedKey = `complaints/${complaintId}/annotated/0.jpg`;
  await putObject(annotatedKey, annotatedBuffer, "image/jpeg");
  const annotatedImageRow = await db
    .insertInto("complaint_images")
    .values({ complaint_id: complaintId, image_type: "annotated", storage_key: annotatedKey, mime_type: "image/jpeg", size_bytes: annotatedBuffer.byteLength, width_px: 200, height_px: 200 })
    .returning("id")
    .executeTakeFirstOrThrow();

  const modelVersion = await db
    .insertInto("model_versions")
    .values({ version: "test-detail-v1", runtime: "onnx", model_path: "./models/best.onnx", class_map: JSON.stringify({ 11: "plastic" }) })
    .onConflict((oc) => oc.column("version").doUpdateSet({ runtime: "onnx" }))
    .returning("id")
    .executeTakeFirstOrThrow();

  const inferenceResult = await db
    .insertInto("inference_results")
    .values({ complaint_id: complaintId, model_version_id: modelVersion.id, object_count: 1, annotated_image_id: annotatedImageRow.id, inference_time_ms: 100, raw_response: JSON.stringify({}) })
    .returning("id")
    .executeTakeFirstOrThrow();

  await db
    .insertInto("detections")
    .values({ inference_result_id: inferenceResult.id, ai_class_id: 11, ai_class_name: "plastic", ai_confidence: 0.87, ai_bbox_x1: 1, ai_bbox_y1: 2, ai_bbox_x2: 30, ai_bbox_y2: 40 })
    .execute();

  await db
    .insertInto("risk_assessments")
    .values({ complaint_id: complaintId, risk_level: "MEDIUM", score: 42.5, factor_breakdown: JSON.stringify({ debrisCategory: { score: 30, weight: 0.3, detail: "x" } }), is_admin_override: false, is_current: true })
    .execute();

  await db.insertInto("admin_notes").values({ complaint_id: complaintId, admin_id: adminId, note: "Confidential test note" }).execute();
  await db.insertInto("public_updates").values({ complaint_id: complaintId, message: "Your report is under review.", created_by: null }).execute();
  await db
    .insertInto("status_history")
    .values({ complaint_id: complaintId, from_status: null, to_status: "SUBMITTED", changed_by: citizenId, note: "Complaint submitted by citizen." })
    .execute();
  await db.insertInto("assignments").values({ complaint_id: complaintId, assigned_to: adminId, assigned_by: adminId, note: "Self-assigned for testing" }).execute();
  await db
    .insertInto("audit_logs")
    .values({ actor_id: adminId, action: "test_action", entity_type: "complaint", entity_id: complaintId, before: null, after: JSON.stringify({ x: 1 }) })
    .execute();
});

afterAll(async () => {
  await db.deleteFrom("audit_logs").where("entity_id", "=", complaintId).execute();
  await db.deleteFrom("assignments").where("complaint_id", "=", complaintId).execute();
  await db.deleteFrom("admin_notes").where("complaint_id", "=", complaintId).execute();
  await db.deleteFrom("public_updates").where("complaint_id", "=", complaintId).execute();
  await db.deleteFrom("status_history").where("complaint_id", "=", complaintId).execute();
  await db.deleteFrom("risk_assessments").where("complaint_id", "=", complaintId).execute();
  await db.deleteFrom("detections").where("inference_result_id", "in", db.selectFrom("inference_results").select("id").where("complaint_id", "=", complaintId)).execute();
  await db.deleteFrom("inference_results").where("complaint_id", "=", complaintId).execute();
  await db.deleteFrom("model_versions").where("version", "=", "test-detail-v1").execute();
  await db.deleteFrom("complaint_images").where("complaint_id", "=", complaintId).execute();
  await db.deleteFrom("complaints").where("id", "=", complaintId).execute();
  await sql`DELETE FROM locations WHERE id = ${locationId}::uuid`.execute(db);
  await db.deleteFrom("users").where("id", "in", [adminId, citizenId]).execute();
  await db.destroy();
});

describe("getAdminComplaintDetail", () => {
  it("returns null for a nonexistent complaint number", async () => {
    expect(await getAdminComplaintDetail("CLN-20260201-ZZZZZZ")).toBeNull();
  });

  it("returns the full admin-only detail, including exact coordinates and confidential notes", async () => {
    const detail = await getAdminComplaintDetail(COMPLAINT_NUMBER);
    expect(detail).not.toBeNull();
    expect(detail!.citizenName).toBe("Citizen Detail");
    expect(detail!.citizenPhone).toBe("+91-90000-00000");
    expect(detail!.landmark).toBe("Near the lighthouse");

    // Admin view DOES expose exact coordinates (CLAUDE.md §0: admin-only, not off-limits to admins).
    expect(detail!.lat).toBeCloseTo(18.922, 3);
    expect(detail!.lng).toBeCloseTo(72.8347, 3);

    expect(detail!.originalPhotoUrls).toHaveLength(1);
    expect(detail!.originalPhotoUrls[0]).toMatch(/^http/);
    expect(detail!.annotatedPhotoUrl).toMatch(/^http/);

    expect(detail!.detections).toHaveLength(1);
    expect(detail!.detections[0]).toMatchObject({ className: "plastic" });
    expect(detail!.detections[0]!.confidence).toBeCloseTo(0.87, 2);
    // CLAUDE.md §8: the treatment recommendation for the effective (here: AI-suggested, uncorrected) class.
    expect(detail!.detections[0]!.treatmentRecommendation).toMatch(/plastic-waste facility/i);

    expect(detail!.currentRisk).toMatchObject({ level: "MEDIUM", isAdminOverride: false });
    expect(detail!.currentRisk!.score).toBeCloseTo(42.5, 1);

    expect(detail!.adminNotes).toHaveLength(1);
    expect(detail!.adminNotes[0]!.note).toBe("Confidential test note");

    expect(detail!.publicUpdates.map((u) => u.message)).toContain("Your report is under review.");
    expect(detail!.statusHistory.some((h) => h.toStatus === "SUBMITTED")).toBe(true);

    expect(detail!.currentAssignment).toMatchObject({ assigneeName: "Admin Detail" });

    expect(detail!.auditLog.some((a) => a.action === "test_action")).toBe(true);
  });
});

describe("getAdminUserOptions", () => {
  it("returns only admin users", async () => {
    const options = await getAdminUserOptions();
    expect(options.some((o) => o.id === adminId)).toBe(true);
    expect(options.some((o) => o.id === citizenId)).toBe(false);
  });
});
