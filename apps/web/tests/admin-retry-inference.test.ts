import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { sql } from "kysely";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGetClientIp = vi.fn();
vi.mock("@/lib/request-ip", () => ({ getClientIp: mockGetClientIp, ipForStorage: () => null }));

const { retryInferenceAction } = await import("@/lib/admin/actions/retry-inference");
const { db } = await import("@/lib/db");
const { putObject } = await import("@/lib/storage/s3");

const BASE_URL = "http://fake-inference-service.test";
const MODEL_VERSION = "retry-inference-test-model";

let adminId: string;
let citizenId: string;
const complaintIds: string[] = [];

async function makeComplaint(status: string): Promise<{ complaintId: string; storageKey: string }> {
  const location = await sql<{ id: string }>`
    INSERT INTO locations (geog, consent_given) VALUES (ST_SetSRID(ST_MakePoint(72.8, 18.9), 4326)::geography, TRUE) RETURNING id
  `.execute(db);
  const locationId = location.rows[0]!.id;

  const complaintId = crypto.randomUUID();
  const number = `CLN-20260201-${Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "A")}`;
  await sql`
    INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status)
    VALUES (${complaintId}::uuid, ${number}, ${citizenId}::uuid, ${locationId}::uuid, ${status})
  `.execute(db);
  complaintIds.push(complaintId);

  const originalBuffer = await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 20, g: 90, b: 70 } } })
    .jpeg()
    .toBuffer();
  const storageKey = `complaints/${complaintId}/original/0.jpg`;
  await putObject(storageKey, originalBuffer, "image/jpeg");
  await db
    .insertInto("complaint_images")
    .values({ complaint_id: complaintId, image_type: "original", storage_key: storageKey, mime_type: "image/jpeg", size_bytes: originalBuffer.byteLength })
    .execute();

  return { complaintId, storageKey };
}

function mockFetchOk() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/infer")) {
        return new Response(
          JSON.stringify({
            complaint_id: "CLN-ignored",
            model_version: MODEL_VERSION,
            detections: [],
            object_count: 0,
            annotated_image_url: "/results/fake.jpg",
            inference_time_ms: 42,
            inference_timestamp: new Date().toISOString(),
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (url.endsWith("/health")) {
        return new Response(
          JSON.stringify({ status: "ok", model_version: MODEL_VERSION, runtime: "onnx", model_loaded: true, model_path: "./models/best.onnx" }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (url.endsWith("/results/fake.jpg")) {
        const buf = await sharp({ create: { width: 50, height: 50, channels: 3, background: { r: 1, g: 2, b: 3 } } })
          .jpeg()
          .toBuffer();
        return new Response(new Uint8Array(buf), { status: 200, headers: { "content-type": "image/jpeg" } });
      }
      throw new Error(`Unexpected fetch call in test: ${url}`);
    })
  );
}

function mockFetchFailing() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("simulated inference-service outage");
    })
  );
}

const ADMIN_SESSION = () => ({ user: { id: adminId, role: "admin", email: "admin@example.com" } });
const CITIZEN_SESSION = () => ({ user: { id: citizenId, role: "citizen", email: "c@example.com" } });

beforeAll(async () => {
  const admin = await db
    .insertInto("users")
    .values({ email: `retry-admin-${Date.now()}@example.com`, password_hash: "x", full_name: "Retry Admin", role: "admin" })
    .returningAll()
    .executeTakeFirstOrThrow();
  adminId = admin.id;
  const citizen = await db
    .insertInto("users")
    .values({ email: `retry-citizen-${Date.now()}@example.com`, password_hash: "x", full_name: "Citizen", role: "citizen" })
    .returningAll()
    .executeTakeFirstOrThrow();
  citizenId = citizen.id;
});

afterAll(async () => {
  for (const id of complaintIds) {
    await db.deleteFrom("public_updates").where("complaint_id", "=", id).execute();
    await db.deleteFrom("status_history").where("complaint_id", "=", id).execute();
    await db.deleteFrom("audit_logs").where("entity_id", "=", id).execute();
    await db.deleteFrom("inference_results").where("complaint_id", "=", id).execute();
    const row = await db.selectFrom("complaints").select("location_id").where("id", "=", id).executeTakeFirst();
    await db.deleteFrom("complaint_images").where("complaint_id", "=", id).execute();
    await db.deleteFrom("complaints").where("id", "=", id).execute();
    if (row) await sql`DELETE FROM locations WHERE id = ${row.location_id}::uuid`.execute(db);
  }
  await db.deleteFrom("model_versions").where("version", "=", MODEL_VERSION).execute();
  await db.deleteFrom("users").where("id", "in", [adminId, citizenId]).execute();
  await db.destroy();
});

beforeEach(() => {
  mockAuth.mockReset();
  mockGetClientIp.mockReset();
  mockGetClientIp.mockResolvedValue(`retry-test-ip-${Math.random()}`);
  vi.stubEnv("INFERENCE_SERVICE_URL", BASE_URL);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("retryInferenceAction", () => {
  it("rejects a non-admin session", async () => {
    mockAuth.mockResolvedValue(CITIZEN_SESSION());
    const { complaintId } = await makeComplaint("AI_ANALYSIS_PENDING");
    const result = await retryInferenceAction(complaintId);
    expect(result.ok).toBe(false);
  });

  it("rejects a complaint that doesn't exist", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const result = await retryInferenceAction(crypto.randomUUID());
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("rejects a complaint that isn't awaiting analysis", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const { complaintId } = await makeComplaint("UNDER_REVIEW");
    const result = await retryInferenceAction(complaintId);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not awaiting analysis/i);
  });

  it("successfully retries: advances the complaint to UNDER_REVIEW and audits it", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const { complaintId } = await makeComplaint("AI_ANALYSIS_PENDING");
    mockFetchOk();

    const result = await retryInferenceAction(complaintId);
    expect(result.ok).toBe(true);

    const complaint = await db.selectFrom("complaints").select("status").where("id", "=", complaintId).executeTakeFirstOrThrow();
    expect(complaint.status).toBe("UNDER_REVIEW");

    const audit = await db
      .selectFrom("audit_logs")
      .selectAll()
      .where("entity_id", "=", complaintId)
      .where("action", "=", "inference_retried")
      .executeTakeFirstOrThrow();
    expect(audit.actor_id).toBe(adminId);
  });

  it("reports failure and leaves the complaint at AI_ANALYSIS_PENDING when inference fails again", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const { complaintId } = await makeComplaint("AI_ANALYSIS_PENDING");
    mockFetchFailing();

    const result = await retryInferenceAction(complaintId);
    expect(result.ok).toBe(false);

    const complaint = await db.selectFrom("complaints").select("status").where("id", "=", complaintId).executeTakeFirstOrThrow();
    expect(complaint.status).toBe("AI_ANALYSIS_PENDING");

    const audit = await db
      .selectFrom("audit_logs")
      .selectAll()
      .where("entity_id", "=", complaintId)
      .where("action", "=", "inference_retry_failed")
      .executeTakeFirstOrThrow();
    expect(audit.actor_id).toBe(adminId);
  });
});
