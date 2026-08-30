import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { sql } from "kysely";

import { InferenceJobError, processInferenceJob } from "@/lib/inference/process-job";
import { db } from "@/lib/db";
import { putObject, headObject } from "@/lib/storage/s3";

const BASE_URL = "http://fake-inference-service.test";
const MODEL_VERSION = "yolo26s-underwater-v1-test";

let userId: string;
const complaintIds: string[] = [];

async function makeComplaintFixture(): Promise<{ complaintId: string; complaintNumber: string; storageKey: string }> {
  const location = await sql<{ id: string }>`
    INSERT INTO locations (geog, locality, city, state, consent_given)
    VALUES (ST_SetSRID(ST_MakePoint(72.8347, 18.9220), 4326)::geography, 'Test Locality', 'Test City', 'Test State', TRUE)
    RETURNING id
  `.execute(db);
  const locationId = location.rows[0]!.id;

  const complaintId = crypto.randomUUID();
  const complaintNumber = `CLN-20260830-${Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "A")}`;
  await sql`
    INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status, description)
    VALUES (${complaintId}::uuid, ${complaintNumber}, ${userId}::uuid, ${locationId}::uuid, 'AI_ANALYSIS_PENDING', 'Fixture complaint')
  `.execute(db);
  complaintIds.push(complaintId);

  const originalBuffer = await sharp({ create: { width: 200, height: 200, channels: 3, background: { r: 20, g: 90, b: 70 } } })
    .jpeg()
    .toBuffer();
  const storageKey = `complaints/${complaintId}/original/0.jpg`;
  await putObject(storageKey, originalBuffer, "image/jpeg");
  await db
    .insertInto("complaint_images")
    .values({
      complaint_id: complaintId,
      image_type: "original",
      storage_key: storageKey,
      mime_type: "image/jpeg",
      size_bytes: originalBuffer.byteLength,
      width_px: 200,
      height_px: 200,
    })
    .execute();

  return { complaintId, complaintNumber, storageKey };
}

async function makeAnnotatedJpeg(): Promise<Buffer> {
  return sharp({ create: { width: 200, height: 200, channels: 3, background: { r: 90, g: 20, b: 70 } } }).jpeg().toBuffer();
}

beforeAll(async () => {
  const user = await db
    .insertInto("users")
    .values({
      email: `process-job-test-${Date.now()}@example.com`,
      password_hash: "x",
      full_name: "Process Job Test",
      role: "citizen",
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  userId = user.id;
});

afterAll(async () => {
  for (const id of complaintIds) {
    await db.deleteFrom("detections").where("inference_result_id", "in", db.selectFrom("inference_results").select("id").where("complaint_id", "=", id)).execute();
    await db.deleteFrom("public_updates").where("complaint_id", "=", id).execute();
    await db.deleteFrom("inference_results").where("complaint_id", "=", id).execute();
    await db.deleteFrom("status_history").where("complaint_id", "=", id).execute();
    const row = await db.selectFrom("complaints").select("location_id").where("id", "=", id).executeTakeFirst();
    await db.deleteFrom("complaint_images").where("complaint_id", "=", id).execute();
    await db.deleteFrom("complaints").where("id", "=", id).execute();
    if (row) await sql`DELETE FROM locations WHERE id = ${row.location_id}::uuid`.execute(db);
  }
  await db.deleteFrom("model_versions").where("version", "=", MODEL_VERSION).execute();
  await db.deleteFrom("users").where("id", "=", userId).execute();
  await db.destroy();
});

beforeEach(() => {
  vi.stubEnv("INFERENCE_SERVICE_URL", BASE_URL);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function mockFetchFor(annotatedBuffer: Buffer, detections: unknown[]) {
  const mock = vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.endsWith("/infer")) {
      return new Response(
        JSON.stringify({
          complaint_id: "CLN-ignored",
          model_version: MODEL_VERSION,
          detections,
          object_count: detections.length,
          annotated_image_url: "/results/fake.jpg",
          inference_time_ms: 123,
          inference_timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    if (url.endsWith("/health")) {
      return new Response(
        JSON.stringify({
          status: "ok",
          model_version: MODEL_VERSION,
          runtime: "onnx",
          model_loaded: true,
          model_path: "./models/best.onnx",
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    if (url.endsWith("/results/fake.jpg")) {
      return new Response(new Uint8Array(annotatedBuffer), { status: 200, headers: { "content-type": "image/jpeg" } });
    }
    throw new Error(`Unexpected fetch call in test: ${url}`);
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

describe("processInferenceJob", () => {
  it("processes a complaint end-to-end: DB rows, real MinIO object, and status advance", async () => {
    const { complaintId } = await makeComplaintFixture();
    const annotatedBuffer = await makeAnnotatedJpeg();
    mockFetchFor(annotatedBuffer, [
      { class_id: 11, class_name: "plastic", confidence: 0.91, bbox: { x1: 10, y1: 10, x2: 50, y2: 50 } },
      { class_id: 8, class_name: "net", confidence: 0.42, bbox: { x1: 60, y1: 60, x2: 90, y2: 90 } },
    ]);

    await processInferenceJob(complaintId);

    const complaint = await db.selectFrom("complaints").select(["status"]).where("id", "=", complaintId).executeTakeFirstOrThrow();
    expect(complaint.status).toBe("UNDER_REVIEW");

    const inferenceResult = await db
      .selectFrom("inference_results")
      .selectAll()
      .where("complaint_id", "=", complaintId)
      .executeTakeFirstOrThrow();
    expect(inferenceResult.object_count).toBe(2);
    expect(inferenceResult.inference_time_ms).toBe(123);
    expect(inferenceResult.annotated_image_id).not.toBeNull();

    const modelVersion = await db
      .selectFrom("model_versions")
      .selectAll()
      .where("version", "=", MODEL_VERSION)
      .executeTakeFirstOrThrow();
    expect(modelVersion.runtime).toBe("onnx");
    expect(modelVersion.id).toBe(inferenceResult.model_version_id);

    const detections = await db
      .selectFrom("detections")
      .selectAll()
      .where("inference_result_id", "=", inferenceResult.id)
      .orderBy("ai_confidence", "desc")
      .execute();
    expect(detections).toHaveLength(2);
    expect(detections[0]).toMatchObject({ ai_class_id: 11, ai_class_name: "plastic" });
    expect(Number(detections[0]!.ai_confidence)).toBeCloseTo(0.91, 2);

    const annotatedImage = await db
      .selectFrom("complaint_images")
      .selectAll()
      .where("complaint_id", "=", complaintId)
      .where("image_type", "=", "annotated")
      .executeTakeFirstOrThrow();
    const meta = await headObject(annotatedImage.storage_key);
    expect(meta.contentType).toBe("image/jpeg");
    expect(meta.contentLength).toBe(annotatedBuffer.byteLength);

    const history = await db
      .selectFrom("status_history")
      .select(["from_status", "to_status"])
      .where("complaint_id", "=", complaintId)
      .orderBy("created_at", "desc")
      .executeTakeFirstOrThrow();
    expect(history).toMatchObject({ from_status: "AI_ANALYSIS_PENDING", to_status: "UNDER_REVIEW" });

    const publicUpdate = await db
      .selectFrom("public_updates")
      .select(["message"])
      .where("complaint_id", "=", complaintId)
      .executeTakeFirstOrThrow();
    // CLAUDE.md §0/§6: never states detected classes/counts to the citizen.
    expect(publicUpdate.message).not.toMatch(/plastic|net/i);
    expect(publicUpdate.message).toMatch(/under review/i);

    const risk = await db
      .selectFrom("risk_assessments")
      .selectAll()
      .where("complaint_id", "=", complaintId)
      .executeTakeFirstOrThrow();
    expect(risk.is_current).toBe(true);
    expect(risk.is_admin_override).toBe(false);
    expect(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).toContain(risk.risk_level);
    expect(risk.factor_breakdown).toHaveProperty("debrisCategory");

    // Sub-step 8: an in-app notification is written transactionally, and a
    // best-effort email notification is recorded + attempted after commit.
    const notifications = await db.selectFrom("notifications").selectAll().where("complaint_id", "=", complaintId).execute();
    expect(notifications).toHaveLength(2);
    const inApp = notifications.find((n) => n.channel === "in_app");
    expect(inApp).toMatchObject({ type: "ai_analysis_complete", status: "sent" });
    expect(inApp?.message).not.toMatch(/plastic|net/i);
    const email = notifications.find((n) => n.channel === "email");
    expect(email).toMatchObject({ type: "ai_analysis_complete", status: "sent" });
    expect(email?.sent_at).not.toBeNull();
  });

  it("reuses the same model_versions row across multiple complaints", async () => {
    const first = await makeComplaintFixture();
    const second = await makeComplaintFixture();
    const annotatedBuffer = await makeAnnotatedJpeg();

    mockFetchFor(annotatedBuffer, []);
    await processInferenceJob(first.complaintId);
    mockFetchFor(annotatedBuffer, []);
    await processInferenceJob(second.complaintId);

    const versions = await db.selectFrom("model_versions").select("id").where("version", "=", MODEL_VERSION).execute();
    expect(versions).toHaveLength(1);
  });

  it("is idempotent — a complaint no longer at AI_ANALYSIS_PENDING is a silent no-op", async () => {
    const { complaintId } = await makeComplaintFixture();
    const annotatedBuffer = await makeAnnotatedJpeg();
    const mock = mockFetchFor(annotatedBuffer, []);

    await processInferenceJob(complaintId);
    const callsAfterFirst = mock.mock.calls.length;

    await processInferenceJob(complaintId);
    expect(mock.mock.calls.length).toBe(callsAfterFirst); // no new fetch calls made

    const results = await db.selectFrom("inference_results").select("id").where("complaint_id", "=", complaintId).execute();
    expect(results).toHaveLength(1);
  });

  it("throws when the complaint has no original image", async () => {
    const complaintId = crypto.randomUUID();
    const location = await sql<{ id: string }>`
      INSERT INTO locations (geog, consent_given) VALUES (ST_SetSRID(ST_MakePoint(72.8, 18.9), 4326)::geography, TRUE) RETURNING id
    `.execute(db);
    complaintIds.push(complaintId);
    await sql`
      INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status)
      VALUES (${complaintId}::uuid, ${"CLN-20260830-NOIMG1"}, ${userId}::uuid, ${location.rows[0]!.id}::uuid, 'AI_ANALYSIS_PENDING')
    `.execute(db);

    await expect(processInferenceJob(complaintId)).rejects.toThrow(InferenceJobError);
  });

  it("throws when the inference service is unreachable", async () => {
    const { complaintId } = await makeComplaintFixture();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connection refused");
      })
    );

    await expect(processInferenceJob(complaintId)).rejects.toThrow();

    const complaint = await db.selectFrom("complaints").select("status").where("id", "=", complaintId).executeTakeFirstOrThrow();
    expect(complaint.status).toBe("AI_ANALYSIS_PENDING"); // left in a safe, visible "stuck" state
  });
});
