import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "kysely";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGetClientIp = vi.fn();
vi.mock("@/lib/request-ip", () => ({ getClientIp: mockGetClientIp, ipForStorage: () => null }));

const { correctDetectionAction, rejectDetectionAction } = await import("@/lib/admin/actions/detection-review");
const { getAdminComplaintDetail } = await import("@/lib/admin/complaint-detail");
const { db } = await import("@/lib/db");

let adminId: string;
let citizenId: string;
let locationId: string;
let modelVersionId: string;
const complaintIds: string[] = [];
const inferenceResultIds: string[] = [];

async function makeComplaintWithDetection(): Promise<{ complaintId: string; detectionId: string; otherComplaintId: string }> {
  const complaintId = crypto.randomUUID();
  const number = `CLN-20260201-${Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "A")}`;
  await sql`
    INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status)
    VALUES (${complaintId}::uuid, ${number}, ${citizenId}::uuid, ${locationId}::uuid, 'UNDER_REVIEW')
  `.execute(db);
  complaintIds.push(complaintId);

  const otherComplaintId = crypto.randomUUID();
  const otherNumber = `CLN-20260201-${Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "A")}`;
  await sql`
    INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status)
    VALUES (${otherComplaintId}::uuid, ${otherNumber}, ${citizenId}::uuid, ${locationId}::uuid, 'UNDER_REVIEW')
  `.execute(db);
  complaintIds.push(otherComplaintId);

  const inferenceResult = await db
    .insertInto("inference_results")
    .values({
      complaint_id: complaintId,
      model_version_id: modelVersionId,
      object_count: 1,
      raw_response: JSON.stringify({}),
      inferred_at: new Date().toISOString(),
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  inferenceResultIds.push(inferenceResult.id);

  const detection = await db
    .insertInto("detections")
    .values({
      inference_result_id: inferenceResult.id,
      ai_class_id: 8,
      ai_class_name: "net",
      ai_confidence: 0.42,
      ai_bbox_x1: 1,
      ai_bbox_y1: 1,
      ai_bbox_x2: 2,
      ai_bbox_y2: 2,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return { complaintId, detectionId: detection.id, otherComplaintId };
}

const ADMIN_SESSION = () => ({ user: { id: adminId, role: "admin", email: "admin@example.com" } });
const CITIZEN_SESSION = () => ({ user: { id: citizenId, role: "citizen", email: "c@example.com" } });

beforeAll(async () => {
  const admin = await db
    .insertInto("users")
    .values({ email: `detection-admin-${Date.now()}@example.com`, password_hash: "x", full_name: "Admin", role: "admin" })
    .returningAll()
    .executeTakeFirstOrThrow();
  adminId = admin.id;
  const citizen = await db
    .insertInto("users")
    .values({ email: `detection-citizen-${Date.now()}@example.com`, password_hash: "x", full_name: "Citizen", role: "citizen" })
    .returningAll()
    .executeTakeFirstOrThrow();
  citizenId = citizen.id;
  const location = await sql<{ id: string }>`
    INSERT INTO locations (geog, consent_given) VALUES (ST_SetSRID(ST_MakePoint(72.8, 18.9), 4326)::geography, TRUE) RETURNING id
  `.execute(db);
  locationId = location.rows[0]!.id;

  const modelVersion = await db
    .insertInto("model_versions")
    .values({
      version: `detection-review-test-${Date.now()}`,
      runtime: "onnx",
      model_path: "./models/best.onnx",
      class_map: JSON.stringify({ "8": "net" }),
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  modelVersionId = modelVersion.id;
});

afterAll(async () => {
  await db.deleteFrom("audit_logs").where("entity_id", "in", complaintIds).execute();
  await db.deleteFrom("detections").where("inference_result_id", "in", inferenceResultIds).execute();
  await db.deleteFrom("inference_results").where("id", "in", inferenceResultIds).execute();
  await db.deleteFrom("complaints").where("id", "in", complaintIds).execute();
  await sql`DELETE FROM locations WHERE id = ${locationId}::uuid`.execute(db);
  await db.deleteFrom("model_versions").where("id", "=", modelVersionId).execute();
  await db.deleteFrom("users").where("id", "in", [adminId, citizenId]).execute();
  await db.destroy();
});

beforeEach(() => {
  mockAuth.mockReset();
  mockGetClientIp.mockReset();
  mockGetClientIp.mockResolvedValue(`detection-test-ip-${Math.random()}`);
});

describe("correctDetectionAction", () => {
  it("rejects a non-admin session", async () => {
    mockAuth.mockResolvedValue(CITIZEN_SESSION());
    const { complaintId, detectionId } = await makeComplaintWithDetection();
    const result = await correctDetectionAction(complaintId, detectionId, "plastic");
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid debris class", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const { complaintId, detectionId } = await makeComplaintWithDetection();
    const result = await correctDetectionAction(complaintId, detectionId, "not_a_real_class");
    expect(result.ok).toBe(false);
  });

  it("rejects a detection id that doesn't belong to the given complaint", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const { detectionId, otherComplaintId } = await makeComplaintWithDetection();
    const result = await correctDetectionAction(otherComplaintId, detectionId, "plastic");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("corrects the class, never touching the original AI output, and audits it", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const { complaintId, detectionId } = await makeComplaintWithDetection();

    const result = await correctDetectionAction(complaintId, detectionId, "plastic", "Clearly a plastic sheet, not netting.");
    expect(result.ok).toBe(true);

    const row = await db.selectFrom("detections").selectAll().where("id", "=", detectionId).executeTakeFirstOrThrow();
    expect(row.ai_class_name).toBe("net"); // untouched original
    expect(row.admin_corrected_class_name).toBe("plastic");
    expect(row.admin_rejected).toBe(false);
    expect(row.admin_reviewed).toBe(true);
    expect(row.admin_reviewed_by).toBe(adminId);
    expect(row.admin_note).toMatch(/plastic sheet/);

    const audit = await db.selectFrom("audit_logs").selectAll().where("entity_id", "=", complaintId).executeTakeFirstOrThrow();
    expect(audit.action).toBe("detection_corrected");
    expect(audit.actor_id).toBe(adminId);

    // CLAUDE.md §8: the admin-review page's recommendation follows the
    // corrected class ("plastic"), not the untouched AI class ("net").
    const complaint = await db.selectFrom("complaints").select("complaint_number").where("id", "=", complaintId).executeTakeFirstOrThrow();
    const detail = await getAdminComplaintDetail(complaint.complaint_number);
    expect(detail!.detections[0]!.treatmentRecommendation).toMatch(/plastic-waste facility/i);
  });
});

describe("rejectDetectionAction", () => {
  it("rejects a non-admin session", async () => {
    mockAuth.mockResolvedValue(CITIZEN_SESSION());
    const { complaintId, detectionId } = await makeComplaintWithDetection();
    const result = await rejectDetectionAction(complaintId, detectionId);
    expect(result.ok).toBe(false);
  });

  it("marks the detection rejected without deleting it, and audits it", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const { complaintId, detectionId } = await makeComplaintWithDetection();

    const result = await rejectDetectionAction(complaintId, detectionId, "False positive — this is a shadow, not debris.");
    expect(result.ok).toBe(true);

    const row = await db.selectFrom("detections").selectAll().where("id", "=", detectionId).executeTakeFirstOrThrow();
    expect(row.ai_class_name).toBe("net"); // untouched original, row not deleted
    expect(row.admin_rejected).toBe(true);
    expect(row.admin_reviewed).toBe(true);
    expect(row.admin_corrected_class_name).toBeNull();
    expect(row.admin_note).toMatch(/shadow/);

    const audit = await db.selectFrom("audit_logs").selectAll().where("entity_id", "=", complaintId).executeTakeFirstOrThrow();
    expect(audit.action).toBe("detection_rejected");

    // A rejected detection has no authoritative class left to recommend against.
    const complaint = await db.selectFrom("complaints").select("complaint_number").where("id", "=", complaintId).executeTakeFirstOrThrow();
    const detail = await getAdminComplaintDetail(complaint.complaint_number);
    expect(detail!.detections[0]!.treatmentRecommendation).toBeNull();
  });
});
