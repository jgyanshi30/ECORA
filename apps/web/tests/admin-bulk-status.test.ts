import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "kysely";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGetClientIp = vi.fn();
vi.mock("@/lib/request-ip", () => ({ getClientIp: mockGetClientIp, ipForStorage: () => null }));

const { bulkUpdateComplaintStatusAction } = await import("@/lib/admin/actions/bulk-status");
const { db } = await import("@/lib/db");

let adminId: string;
let citizenId: string;
let locationId: string;
const complaintIds: string[] = [];

async function makeComplaint(status: string): Promise<string> {
  const id = crypto.randomUUID();
  const number = `CLN-20260201-${Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "A")}`;
  await sql`
    INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status)
    VALUES (${id}::uuid, ${number}, ${citizenId}::uuid, ${locationId}::uuid, ${status})
  `.execute(db);
  complaintIds.push(id);
  return id;
}

const ADMIN_SESSION = () => ({ user: { id: adminId, role: "admin", email: "admin@example.com" } });
const CITIZEN_SESSION = () => ({ user: { id: citizenId, role: "citizen", email: "c@example.com" } });

beforeAll(async () => {
  const admin = await db
    .insertInto("users")
    .values({ email: `bulk-admin-${Date.now()}@example.com`, password_hash: "x", full_name: "Admin", role: "admin" })
    .returningAll()
    .executeTakeFirstOrThrow();
  adminId = admin.id;

  const citizen = await db
    .insertInto("users")
    .values({ email: `bulk-citizen-${Date.now()}@example.com`, password_hash: "x", full_name: "Citizen", role: "citizen" })
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
  await db.deleteFrom("complaints").where("id", "in", complaintIds).execute();
  await sql`DELETE FROM locations WHERE id = ${locationId}::uuid`.execute(db);
  await db.deleteFrom("users").where("id", "in", [adminId, citizenId]).execute();
  await db.destroy();
});

beforeEach(() => {
  mockAuth.mockReset();
  mockGetClientIp.mockReset();
  mockGetClientIp.mockResolvedValue(`bulk-test-ip-${Math.random()}`);
});

describe("bulkUpdateComplaintStatusAction", () => {
  it("rejects a non-admin session", async () => {
    mockAuth.mockResolvedValue(CITIZEN_SESSION());
    const id = await makeComplaint("SUBMITTED");
    const result = await bulkUpdateComplaintStatusAction([id], "UNDER_REVIEW");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/forbidden/i);
  });

  it("rejects an invalid target status", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const id = await makeComplaint("SUBMITTED");
    const result = await bulkUpdateComplaintStatusAction([id], "NOT_A_REAL_STATUS");
    expect(result.ok).toBe(false);
  });

  it("updates multiple complaints, writes status_history + audit_logs + public_updates for each", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const idA = await makeComplaint("SUBMITTED");
    const idB = await makeComplaint("SUBMITTED");

    const result = await bulkUpdateComplaintStatusAction([idA, idB], "UNDER_REVIEW");
    expect(result.ok).toBe(true);
    expect(result.updated).toBe(2);

    for (const id of [idA, idB]) {
      const complaint = await db.selectFrom("complaints").select("status").where("id", "=", id).executeTakeFirstOrThrow();
      expect(complaint.status).toBe("UNDER_REVIEW");

      const history = await db
        .selectFrom("status_history")
        .select(["from_status", "to_status", "changed_by"])
        .where("complaint_id", "=", id)
        .executeTakeFirstOrThrow();
      expect(history).toMatchObject({ from_status: "SUBMITTED", to_status: "UNDER_REVIEW", changed_by: adminId });

      const update = await db.selectFrom("public_updates").select("message").where("complaint_id", "=", id).executeTakeFirstOrThrow();
      expect(update.message).toMatch(/under review/i);

      const audit = await db
        .selectFrom("audit_logs")
        .select(["action", "actor_id", "before", "after"])
        .where("entity_id", "=", id)
        .executeTakeFirstOrThrow();
      expect(audit.actor_id).toBe(adminId);
      expect(audit.action).toBe("bulk_status_update");
      // jsonb columns come back already parsed by the pg driver, not as strings.
      expect(audit.before).toEqual({ status: "SUBMITTED" });
      expect(audit.after).toEqual({ status: "UNDER_REVIEW" });

      const notifications = await db.selectFrom("notifications").selectAll().where("complaint_id", "=", id).execute();
      expect(notifications).toHaveLength(2);
      expect(notifications.find((n) => n.channel === "in_app")).toMatchObject({ status: "sent", type: "status_change" });
      expect(notifications.find((n) => n.channel === "email")).toMatchObject({ status: "sent", type: "status_change" });
    }
  });

  it("does not create a notification for a transition with no citizen-visible message", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const id = await makeComplaint("SUBMITTED");

    const result = await bulkUpdateComplaintStatusAction([id], "AI_ANALYSIS_PENDING");
    expect(result.ok).toBe(true);
    expect(result.updated).toBe(1);

    const notifications = await db.selectFrom("notifications").selectAll().where("complaint_id", "=", id).execute();
    expect(notifications).toHaveLength(0);
  });

  it("skips complaints already at the target status without creating duplicate history rows", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const id = await makeComplaint("RESOLVED");

    const result = await bulkUpdateComplaintStatusAction([id], "RESOLVED");
    expect(result.ok).toBe(true);
    expect(result.updated).toBe(0);

    const history = await db.selectFrom("status_history").select("id").where("complaint_id", "=", id).execute();
    expect(history).toHaveLength(0);
  });
});
