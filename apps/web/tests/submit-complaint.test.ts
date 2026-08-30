import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { sql } from "kysely";

import { isValidComplaintNumber } from "@ecora/shared";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGetClientIp = vi.fn();
vi.mock("@/lib/request-ip", () => ({ getClientIp: mockGetClientIp }));

// Imported after the mocks so they pick up the mocked modules.
const { submitComplaintAction } = await import("@/lib/complaints/actions/submit");
const { db } = await import("@/lib/db");
const { headObject } = await import("@/lib/storage/s3");

const INFERENCE_BASE_URL = "http://fake-inference-service.test";
const MODEL_VERSION = "submit-complaint-test-model";

async function mockFetchOk(detections: unknown[] = []) {
  const annotatedBuffer = await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 40, g: 90, b: 70 } } })
    .jpeg()
    .toBuffer();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/infer")) {
        return new Response(
          JSON.stringify({
            complaint_id: "CLN-ignored",
            model_version: MODEL_VERSION,
            detections,
            object_count: detections.length,
            annotated_image_url: "/results/fake.jpg",
            inference_time_ms: 99,
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
        return new Response(new Uint8Array(annotatedBuffer), { status: 200, headers: { "content-type": "image/jpeg" } });
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

async function makeJpegFile(name = "debris.jpg"): Promise<File> {
  const buf = await sharp({ create: { width: 300, height: 300, channels: 3, background: { r: 90, g: 130, b: 80 } } })
    .jpeg()
    .toBuffer();
  return new File([new Uint8Array(buf)], name, { type: "image/jpeg" });
}

function baseLocation(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    lat: 18.922,
    lng: 72.8347,
    accuracyMeters: 12,
    altitudeMeters: null,
    capturedAt: new Date().toISOString(),
    exifLat: null,
    exifLng: null,
    locality: "Colaba",
    city: "Mumbai",
    district: "Mumbai City",
    state: "Maharashtra",
    pinCode: "400005",
    landmark: "Near the lighthouse",
    consentGiven: true,
    ...overrides,
  });
}

let userId: string;
const createdComplaintIds: string[] = [];
const createdLocationIds: string[] = [];

async function cleanupComplaint(complaintNumber: string) {
  const row = await db
    .selectFrom("complaints")
    .select(["id", "location_id"])
    .where("complaint_number", "=", complaintNumber)
    .executeTakeFirst();
  if (!row) return;
  // public_updates can reference a status_history row (process-job.ts writes
  // one for the AI_ANALYSIS_PENDING -> UNDER_REVIEW transition) — delete it
  // first or the status_history delete below hits its FK.
  await db.deleteFrom("public_updates").where("complaint_id", "=", row.id).execute();
  await db.deleteFrom("status_history").where("complaint_id", "=", row.id).execute();
  // inference_results.annotated_image_id references complaint_images — delete
  // it (detections cascade from inference_results) before complaint_images.
  await db.deleteFrom("inference_results").where("complaint_id", "=", row.id).execute();
  await db.deleteFrom("complaint_images").where("complaint_id", "=", row.id).execute();
  await db.deleteFrom("complaints").where("id", "=", row.id).execute();
  await sql`DELETE FROM locations WHERE id = ${row.location_id}::uuid`.execute(db);
}

beforeAll(async () => {
  const user = await db
    .insertInto("users")
    .values({
      email: `submit-complaint-test-${Date.now()}@example.com`,
      password_hash: "x",
      full_name: "Submit Complaint Test",
      role: "citizen",
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  userId = user.id;
});

afterAll(async () => {
  for (const number of createdComplaintIds) {
    await cleanupComplaint(number);
  }
  for (const id of createdLocationIds) {
    await sql`DELETE FROM locations WHERE id = ${id}::uuid`.execute(db);
  }
  await db.deleteFrom("model_versions").where("version", "=", MODEL_VERSION).execute();
  await db.deleteFrom("users").where("id", "=", userId).execute();
  await db.destroy();
});

beforeEach(() => {
  mockAuth.mockReset();
  mockGetClientIp.mockReset();
  mockGetClientIp.mockResolvedValue(`submit-test-ip-${Math.random()}`);
  vi.stubEnv("INFERENCE_SERVICE_URL", INFERENCE_BASE_URL);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const SESSION_FOR = (id: string) => ({ user: { id, role: "citizen", email: "c@example.com" } });

describe("submitComplaintAction", () => {
  it("rejects when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const formData = new FormData();
    formData.append("photos", await makeJpegFile());
    formData.set("location", baseLocation());
    const result = await submitComplaintAction(formData);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/signed in/i);
  });

  it("rejects a submission with no photos", async () => {
    mockAuth.mockResolvedValue(SESSION_FOR(userId));
    const formData = new FormData();
    formData.set("location", baseLocation());
    const result = await submitComplaintAction(formData);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/at least one photo/i);
  });

  it("rejects a submission with more than the max allowed photos", async () => {
    mockAuth.mockResolvedValue(SESSION_FOR(userId));
    const formData = new FormData();
    for (let i = 0; i < 6; i++) formData.append("photos", await makeJpegFile(`p${i}.jpg`));
    formData.set("location", baseLocation());
    const result = await submitComplaintAction(formData);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/up to/i);
  });

  it("rejects when location consent was not given, even if the client claims it was via a truthy-but-not-true value", async () => {
    mockAuth.mockResolvedValue(SESSION_FOR(userId));
    const formData = new FormData();
    formData.append("photos", await makeJpegFile());
    formData.set("location", baseLocation({ consentGiven: false }));
    const result = await submitComplaintAction(formData);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/consent/i);
  });

  it("rejects invalid/out-of-range coordinates", async () => {
    mockAuth.mockResolvedValue(SESSION_FOR(userId));
    const formData = new FormData();
    formData.append("photos", await makeJpegFile());
    formData.set("location", baseLocation({ lat: 999 }));
    const result = await submitComplaintAction(formData);
    expect(result.ok).toBe(false);
  });

  it("rejects a corrupt file even if it claims to be a JPEG", async () => {
    mockAuth.mockResolvedValue(SESSION_FOR(userId));
    const formData = new FormData();
    formData.append("photos", new File([new Uint8Array([1, 2, 3, 4])], "fake.jpg", { type: "image/jpeg" }));
    formData.set("location", baseLocation());
    const result = await submitComplaintAction(formData);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/photo 1/i);
  });

  it("creates a real complaint end-to-end and runs inference synchronously in-request (CLAUDE.md §13): DB rows, status history, a real MinIO object, and real InferenceResults/Detections", async () => {
    mockAuth.mockResolvedValue(SESSION_FOR(userId));
    await mockFetchOk([{ class_id: 11, class_name: "plastic", confidence: 0.83, bbox: { x1: 5, y1: 5, x2: 40, y2: 40 } }]);

    const formData = new FormData();
    formData.append("photos", await makeJpegFile());
    formData.set("description", "Plastic debris near the seawall.");
    formData.set("location", baseLocation());

    const result = await submitComplaintAction(formData);
    expect(result.ok).toBe(true);
    expect(result.complaintNumber).toBeDefined();
    const complaintNumber = result.complaintNumber!;
    createdComplaintIds.push(complaintNumber);
    expect(isValidComplaintNumber(complaintNumber)).toBe(true);

    const complaint = await db
      .selectFrom("complaints")
      .selectAll()
      .where("complaint_number", "=", complaintNumber)
      .executeTakeFirstOrThrow();
    expect(complaint.citizen_id).toBe(userId);
    // No queue/worker anymore — by the time submitComplaintAction returns,
    // inference has already run synchronously and the status has already
    // advanced past AI_ANALYSIS_PENDING.
    expect(complaint.status).toBe("UNDER_REVIEW");
    expect(complaint.description).toBe("Plastic debris near the seawall.");

    const images = await db
      .selectFrom("complaint_images")
      .selectAll()
      .where("complaint_id", "=", complaint.id)
      .execute();
    expect(images).toHaveLength(2); // original + the annotated image process-job.ts writes
    expect(images.find((i) => i.image_type === "original")!.mime_type).toBe("image/jpeg");
    expect(images.find((i) => i.image_type === "annotated")).toBeDefined();

    // The real original object exists in MinIO, not just referenced in Postgres.
    const original = images.find((i) => i.image_type === "original")!;
    const meta = await headObject(original.storage_key);
    expect(meta.contentType).toBe("image/jpeg");
    expect(meta.contentLength).toBeGreaterThan(0);

    const history = await db
      .selectFrom("status_history")
      .select(["from_status", "to_status", "changed_by"])
      .where("complaint_id", "=", complaint.id)
      .orderBy("created_at", "asc")
      .execute();
    expect(history).toHaveLength(3);
    expect(history[0]).toMatchObject({ from_status: null, to_status: "SUBMITTED", changed_by: userId });
    expect(history[1]).toMatchObject({ from_status: "SUBMITTED", to_status: "AI_ANALYSIS_PENDING", changed_by: null });
    expect(history[2]).toMatchObject({ from_status: "AI_ANALYSIS_PENDING", to_status: "UNDER_REVIEW", changed_by: null });

    // Real InferenceResults + Detections rows — proof the synchronous call
    // actually ran process-job.ts's real pipeline, not just changed status.
    const inferenceResult = await db.selectFrom("inference_results").selectAll().where("complaint_id", "=", complaint.id).executeTakeFirstOrThrow();
    expect(inferenceResult.object_count).toBe(1);
    const detections = await db.selectFrom("detections").selectAll().where("inference_result_id", "=", inferenceResult.id).execute();
    expect(detections).toHaveLength(1);
    expect(detections[0]).toMatchObject({ ai_class_name: "plastic" });

    const location = await db
      .selectFrom("locations")
      .select(["locality", "city", "consent_given"])
      .where("id", "=", complaint.location_id)
      .executeTakeFirstOrThrow();
    expect(location.city).toBe("Mumbai");
    expect(location.consent_given).toBe(true);
  });

  it("still creates the complaint and returns success when inference fails, landing it at AI_ANALYSIS_PENDING for retry (CLAUDE.md §13)", async () => {
    mockAuth.mockResolvedValue(SESSION_FOR(userId));
    mockFetchFailing();

    const formData = new FormData();
    formData.append("photos", await makeJpegFile());
    formData.set("location", baseLocation());

    const result = await submitComplaintAction(formData);
    // The citizen's submission never fails because of a downstream
    // inference outage — they still get a real complaint number.
    expect(result.ok).toBe(true);
    const complaintNumber = result.complaintNumber!;
    createdComplaintIds.push(complaintNumber);

    const complaint = await db
      .selectFrom("complaints")
      .selectAll()
      .where("complaint_number", "=", complaintNumber)
      .executeTakeFirstOrThrow();
    expect(complaint.status).toBe("AI_ANALYSIS_PENDING");

    // No InferenceResults were created — the failure happened before
    // anything was persisted, matching processInferenceJob's own
    // pre-transaction failure boundary.
    const inferenceResults = await db.selectFrom("inference_results").select("id").where("complaint_id", "=", complaint.id).execute();
    expect(inferenceResults).toHaveLength(0);

    // Only one image (the original) — no annotated image was ever produced.
    const images = await db.selectFrom("complaint_images").select("image_type").where("complaint_id", "=", complaint.id).execute();
    expect(images).toHaveLength(1);
    expect(images[0]!.image_type).toBe("original");
  });

  it("rate-limits repeated submissions from the same caller", async () => {
    mockAuth.mockResolvedValue(SESSION_FOR(userId));
    const ip = `submit-rate-limit-${Math.random()}`;
    mockGetClientIp.mockResolvedValue(ip);

    // Each call intentionally fails validation fast (no photos) so this test
    // exercises the rate limiter itself, not ten real image/DB/storage round trips.
    for (let i = 0; i < 10; i++) {
      const formData = new FormData();
      formData.set("location", baseLocation());
      const result = await submitComplaintAction(formData);
      expect(result.error).toMatch(/at least one photo/i);
    }
    const formData = new FormData();
    formData.set("location", baseLocation());
    const limited = await submitComplaintAction(formData);
    expect(limited.ok).toBe(false);
    expect(limited.error).toMatch(/too many submissions/i);
  });
});
