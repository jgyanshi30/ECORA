import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "kysely";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGetClientIp = vi.fn();
vi.mock("@/lib/request-ip", () => ({ getClientIp: mockGetClientIp, ipForStorage: () => null }));

const { overrideRiskAction } = await import("@/lib/admin/actions/risk-override");
const { db } = await import("@/lib/db");

let adminId: string;
let citizenId: string;
let locationId: string;
const complaintIds: string[] = [];

async function makeComplaintWithRisk(): Promise<string> {
  const id = crypto.randomUUID();
  const number = `CLN-20260201-${Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "A")}`;
  await sql`
    INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status)
    VALUES (${id}::uuid, ${number}, ${citizenId}::uuid, ${locationId}::uuid, 'UNDER_REVIEW')
  `.execute(db);
  complaintIds.push(id);
  await db
    .insertInto("risk_assessments")
    .values({
      complaint_id: id,
      risk_level: "LOW",
      score: 10,
      factor_breakdown: JSON.stringify({ note: "test fixture" }),
      is_admin_override: false,
      is_current: true,
    })
    .execute();
  return id;
}

const ADMIN_SESSION = () => ({ user: { id: adminId, role: "admin", email: "admin@example.com" } });
const CITIZEN_SESSION = () => ({ user: { id: citizenId, role: "citizen", email: "c@example.com" } });

beforeAll(async () => {
  const admin = await db
    .insertInto("users")
    .values({ email: `risk-admin-${Date.now()}@example.com`, password_hash: "x", full_name: "Admin", role: "admin" })
    .returningAll()
    .executeTakeFirstOrThrow();
  adminId = admin.id;
  const citizen = await db
    .insertInto("users")
    .values({ email: `risk-citizen-${Date.now()}@example.com`, password_hash: "x", full_name: "Citizen", role: "citizen" })
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
  await db.deleteFrom("complaints").where("id", "in", complaintIds).execute();
  await sql`DELETE FROM locations WHERE id = ${locationId}::uuid`.execute(db);
  await db.deleteFrom("users").where("id", "in", [adminId, citizenId]).execute();
  await db.destroy();
});

beforeEach(() => {
  mockAuth.mockReset();
  mockGetClientIp.mockReset();
  mockGetClientIp.mockResolvedValue(`risk-test-ip-${Math.random()}`);
});

describe("overrideRiskAction", () => {
  it("rejects a non-admin session", async () => {
    mockAuth.mockResolvedValue(CITIZEN_SESSION());
    const id = await makeComplaintWithRisk();
    const result = await overrideRiskAction(id, "HIGH", "Looks worse in person than the photo suggests.");
    expect(result.ok).toBe(false);
  });

  it("rejects a reason shorter than 10 characters", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const id = await makeComplaintWithRisk();
    const result = await overrideRiskAction(id, "HIGH", "too short");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/at least 10/i);
  });

  it("rejects an invalid risk level", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const id = await makeComplaintWithRisk();
    const result = await overrideRiskAction(id, "SUPER_HIGH", "This is a long enough override reason.");
    expect(result.ok).toBe(false);
  });

  it("flips the old assessment's is_current off and inserts a new current override row, preserving history", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const id = await makeComplaintWithRisk();

    const result = await overrideRiskAction(id, "CRITICAL", "Debris blocks a fishing channel, verified on site.");
    expect(result.ok).toBe(true);

    const rows = await db
      .selectFrom("risk_assessments")
      .selectAll()
      .where("complaint_id", "=", id)
      .orderBy("created_at", "asc")
      .execute();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ risk_level: "LOW", is_current: false, is_admin_override: false });
    expect(rows[1]).toMatchObject({ risk_level: "CRITICAL", is_current: true, is_admin_override: true, overridden_by: adminId });
    expect(rows[1]!.override_reason).toMatch(/fishing channel/);

    const audit = await db.selectFrom("audit_logs").selectAll().where("entity_id", "=", id).executeTakeFirstOrThrow();
    expect(audit.action).toBe("risk_override");
    expect(audit.actor_id).toBe(adminId);
  });
});
