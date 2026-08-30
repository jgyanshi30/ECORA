import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "kysely";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGetClientIp = vi.fn();
vi.mock("@/lib/request-ip", () => ({ getClientIp: mockGetClientIp }));

const { withdrawComplaintAction, reopenComplaintAction, rateComplaintAction } = await import(
  "@/lib/complaints/actions/manage"
);
const { db } = await import("@/lib/db");

let ownerId: string;
let otherId: string;
let locationId: string;
const complaintIds: string[] = [];

async function makeComplaint(status: string): Promise<{ id: string; number: string }> {
  const id = crypto.randomUUID();
  const number = `CLN-20260101-${Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "A")}`;
  await sql`
    INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status)
    VALUES (${id}::uuid, ${number}, ${ownerId}::uuid, ${locationId}::uuid, ${status})
  `.execute(db);
  complaintIds.push(id);
  return { id, number };
}

const SESSION = () => ({ user: { id: ownerId, role: "citizen", email: "c@example.com" } });
const OTHER_SESSION = () => ({ user: { id: otherId, role: "citizen", email: "o@example.com" } });

beforeAll(async () => {
  const owner = await db
    .insertInto("users")
    .values({ email: `manage-owner-${Date.now()}@example.com`, password_hash: "x", full_name: "Owner", role: "citizen" })
    .returningAll()
    .executeTakeFirstOrThrow();
  ownerId = owner.id;
  const other = await db
    .insertInto("users")
    .values({ email: `manage-other-${Date.now()}@example.com`, password_hash: "x", full_name: "Other", role: "citizen" })
    .returningAll()
    .executeTakeFirstOrThrow();
  otherId = other.id;
  const location = await sql<{ id: string }>`
    INSERT INTO locations (geog, consent_given) VALUES (ST_SetSRID(ST_MakePoint(72.8, 18.9), 4326)::geography, TRUE) RETURNING id
  `.execute(db);
  locationId = location.rows[0]!.id;
});

afterAll(async () => {
  await db.deleteFrom("complaint_feedback").where("complaint_id", "in", complaintIds).execute();
  await db.deleteFrom("public_updates").where("complaint_id", "in", complaintIds).execute();
  await db.deleteFrom("status_history").where("complaint_id", "in", complaintIds).execute();
  await db.deleteFrom("complaints").where("id", "in", complaintIds).execute();
  await sql`DELETE FROM locations WHERE id = ${locationId}::uuid`.execute(db);
  await db.deleteFrom("users").where("id", "in", [ownerId, otherId]).execute();
  await db.destroy();
});

beforeEach(() => {
  mockAuth.mockReset();
  mockGetClientIp.mockReset();
  mockGetClientIp.mockResolvedValue(`manage-test-ip-${Math.random()}`);
});

describe("withdrawComplaintAction", () => {
  it("rejects when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await withdrawComplaintAction("CLN-20260101-XXXXXX");
    expect(result.ok).toBe(false);
  });

  it("withdraws an UNDER_REVIEW complaint to CLOSED with a real history + public update", async () => {
    mockAuth.mockResolvedValue(SESSION());
    const { id, number } = await makeComplaint("UNDER_REVIEW");

    const result = await withdrawComplaintAction(number);
    expect(result.ok).toBe(true);

    const complaint = await db.selectFrom("complaints").select("status").where("id", "=", id).executeTakeFirstOrThrow();
    expect(complaint.status).toBe("CLOSED");

    const history = await db
      .selectFrom("status_history")
      .select(["from_status", "to_status", "note"])
      .where("complaint_id", "=", id)
      .executeTakeFirstOrThrow();
    expect(history).toMatchObject({ from_status: "UNDER_REVIEW", to_status: "CLOSED", note: "Withdrawn by citizen." });

    const update = await db.selectFrom("public_updates").select("message").where("complaint_id", "=", id).executeTakeFirstOrThrow();
    expect(update.message).toMatch(/withdrew/i);
  });

  it("refuses to withdraw an already-RESOLVED complaint", async () => {
    mockAuth.mockResolvedValue(SESSION());
    const { number } = await makeComplaint("RESOLVED");
    const result = await withdrawComplaintAction(number);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/can no longer/i);
  });

  it("refuses to withdraw another citizen's complaint", async () => {
    mockAuth.mockResolvedValue(OTHER_SESSION());
    const { number } = await makeComplaint("SUBMITTED");
    const result = await withdrawComplaintAction(number);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});

describe("reopenComplaintAction", () => {
  it("reopens a RESOLVED complaint back to UNDER_REVIEW", async () => {
    mockAuth.mockResolvedValue(SESSION());
    const { id, number } = await makeComplaint("RESOLVED");

    const result = await reopenComplaintAction(number, "Debris is still there");
    expect(result.ok).toBe(true);

    const complaint = await db.selectFrom("complaints").select("status").where("id", "=", id).executeTakeFirstOrThrow();
    expect(complaint.status).toBe("UNDER_REVIEW");

    const history = await db
      .selectFrom("status_history")
      .select(["from_status", "to_status", "note"])
      .where("complaint_id", "=", id)
      .executeTakeFirstOrThrow();
    expect(history.to_status).toBe("UNDER_REVIEW");
    expect(history.note).toMatch(/Debris is still there/);
  });

  it("refuses to reopen a complaint that isn't RESOLVED", async () => {
    mockAuth.mockResolvedValue(SESSION());
    const { number } = await makeComplaint("UNDER_REVIEW");
    const result = await reopenComplaintAction(number);
    expect(result.ok).toBe(false);
  });
});

describe("rateComplaintAction", () => {
  it("stores a rating for a RESOLVED complaint", async () => {
    mockAuth.mockResolvedValue(SESSION());
    const { id, number } = await makeComplaint("RESOLVED");

    const result = await rateComplaintAction(number, 4, "Quick response");
    expect(result.ok).toBe(true);

    const feedback = await db
      .selectFrom("complaint_feedback")
      .select(["rating", "comment", "citizen_id"])
      .where("complaint_id", "=", id)
      .executeTakeFirstOrThrow();
    expect(feedback).toMatchObject({ rating: 4, comment: "Quick response", citizen_id: ownerId });
  });

  it("rejects an out-of-range rating", async () => {
    mockAuth.mockResolvedValue(SESSION());
    const { number } = await makeComplaint("RESOLVED");
    const result = await rateComplaintAction(number, 9);
    expect(result.ok).toBe(false);
  });

  it("refuses to rate a complaint that isn't RESOLVED", async () => {
    mockAuth.mockResolvedValue(SESSION());
    const { number } = await makeComplaint("SUBMITTED");
    const result = await rateComplaintAction(number, 5);
    expect(result.ok).toBe(false);
  });
});
