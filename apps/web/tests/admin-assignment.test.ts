import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "kysely";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGetClientIp = vi.fn();
vi.mock("@/lib/request-ip", () => ({ getClientIp: mockGetClientIp, ipForStorage: () => null }));

const { assignComplaintAction } = await import("@/lib/admin/actions/assignment");
const { db } = await import("@/lib/db");

let adminAId: string;
let adminBId: string;
let citizenId: string;
let locationId: string;
const complaintIds: string[] = [];

async function makeComplaint(status = "UNDER_REVIEW"): Promise<string> {
  const id = crypto.randomUUID();
  const number = `CLN-20260201-${Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "A")}`;
  await sql`
    INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status)
    VALUES (${id}::uuid, ${number}, ${citizenId}::uuid, ${locationId}::uuid, ${status})
  `.execute(db);
  complaintIds.push(id);
  return id;
}

const ADMIN_SESSION = () => ({ user: { id: adminAId, role: "admin", email: "a@example.com" } });

beforeAll(async () => {
  const adminA = await db
    .insertInto("users")
    .values({ email: `assign-admin-a-${Date.now()}@example.com`, password_hash: "x", full_name: "Admin A", role: "admin" })
    .returningAll()
    .executeTakeFirstOrThrow();
  adminAId = adminA.id;
  const adminB = await db
    .insertInto("users")
    .values({ email: `assign-admin-b-${Date.now()}@example.com`, password_hash: "x", full_name: "Admin B", role: "admin" })
    .returningAll()
    .executeTakeFirstOrThrow();
  adminBId = adminB.id;
  const citizen = await db
    .insertInto("users")
    .values({ email: `assign-citizen-${Date.now()}@example.com`, password_hash: "x", full_name: "Citizen", role: "citizen" })
    .returningAll()
    .executeTakeFirstOrThrow();
  citizenId = citizen.id;
  const location = await sql<{ id: string }>`
    INSERT INTO locations (geog, consent_given) VALUES (ST_SetSRID(ST_MakePoint(72.8, 18.9), 4326)::geography, TRUE) RETURNING id
  `.execute(db);
  locationId = location.rows[0]!.id;
});

afterAll(async () => {
  await db.deleteFrom("audit_logs").where("entity_id", "in", complaintIds).execute();
  await db.deleteFrom("public_updates").where("complaint_id", "in", complaintIds).execute();
  await db.deleteFrom("status_history").where("complaint_id", "in", complaintIds).execute();
  await db.deleteFrom("assignments").where("complaint_id", "in", complaintIds).execute();
  await db.deleteFrom("complaints").where("id", "in", complaintIds).execute();
  await sql`DELETE FROM locations WHERE id = ${locationId}::uuid`.execute(db);
  await db.deleteFrom("users").where("id", "in", [adminAId, adminBId, citizenId]).execute();
  await db.destroy();
});

beforeEach(() => {
  mockAuth.mockReset();
  mockGetClientIp.mockReset();
  mockGetClientIp.mockResolvedValue(`assign-test-ip-${Math.random()}`);
});

describe("assignComplaintAction", () => {
  it("rejects assigning to a non-admin user", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const id = await makeComplaint();
    const result = await assignComplaintAction(id, citizenId);
    expect(result.ok).toBe(false);
  });

  it("assigns, advances status to ASSIGNED, and writes status_history + public_updates + audit_logs", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const id = await makeComplaint("UNDER_REVIEW");

    const result = await assignComplaintAction(id, adminBId, "Please check this jetty area.");
    expect(result.ok).toBe(true);

    const complaint = await db.selectFrom("complaints").select("status").where("id", "=", id).executeTakeFirstOrThrow();
    expect(complaint.status).toBe("ASSIGNED");

    const assignment = await db.selectFrom("assignments").selectAll().where("complaint_id", "=", id).executeTakeFirstOrThrow();
    expect(assignment).toMatchObject({ assigned_to: adminBId, assigned_by: adminAId, unassigned_at: null });

    const history = await db.selectFrom("status_history").select("to_status").where("complaint_id", "=", id).executeTakeFirstOrThrow();
    expect(history.to_status).toBe("ASSIGNED");

    const update = await db.selectFrom("public_updates").select("message").where("complaint_id", "=", id).executeTakeFirstOrThrow();
    expect(update.message).toMatch(/assigned/i);
  });

  it("closes the prior active assignment when reassigning", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const id = await makeComplaint("UNDER_REVIEW");

    await assignComplaintAction(id, adminAId);
    const reassignResult = await assignComplaintAction(id, adminBId);
    expect(reassignResult.ok).toBe(true);

    const assignments = await db
      .selectFrom("assignments")
      .select(["assigned_to", "unassigned_at"])
      .where("complaint_id", "=", id)
      .orderBy("assigned_at", "asc")
      .execute();
    expect(assignments).toHaveLength(2);
    expect(assignments[0]).toMatchObject({ assigned_to: adminAId });
    expect(assignments[0]!.unassigned_at).not.toBeNull();
    expect(assignments[1]).toMatchObject({ assigned_to: adminBId, unassigned_at: null });
  });

  it("does not force a status change when the complaint is already ASSIGNED or further along", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const id = await makeComplaint("ACTION_IN_PROGRESS");

    await assignComplaintAction(id, adminBId);

    const complaint = await db.selectFrom("complaints").select("status").where("id", "=", id).executeTakeFirstOrThrow();
    expect(complaint.status).toBe("ACTION_IN_PROGRESS");
  });
});
