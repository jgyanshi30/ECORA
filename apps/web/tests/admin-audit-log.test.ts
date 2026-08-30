import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";

import { getAdminAuditLogPage, getDistinctAuditActions } from "@/lib/admin/audit-log";
import { db } from "@/lib/db";

let adminId: string;
let otherAdminId: string;
let citizenId: string;
let locationId: string;
let complaintId: string;
const COMPLAINT_NUMBER = "CLN-20260201-AUDITL";
const auditLogIds: string[] = [];

beforeAll(async () => {
  const admin = await db
    .insertInto("users")
    .values({ email: `auditlog-admin-${Date.now()}@example.com`, password_hash: "x", full_name: "Audit Admin", role: "admin" })
    .returningAll()
    .executeTakeFirstOrThrow();
  adminId = admin.id;

  const otherAdmin = await db
    .insertInto("users")
    .values({ email: `auditlog-other-admin-${Date.now()}@example.com`, password_hash: "x", full_name: "Other Admin", role: "admin" })
    .returningAll()
    .executeTakeFirstOrThrow();
  otherAdminId = otherAdmin.id;

  const citizen = await db
    .insertInto("users")
    .values({ email: `auditlog-citizen-${Date.now()}@example.com`, password_hash: "x", full_name: "Citizen", role: "citizen" })
    .returningAll()
    .executeTakeFirstOrThrow();
  citizenId = citizen.id;

  const location = await sql<{ id: string }>`
    INSERT INTO locations (geog, consent_given) VALUES (ST_SetSRID(ST_MakePoint(72.8, 18.9), 4326)::geography, TRUE) RETURNING id
  `.execute(db);
  locationId = location.rows[0]!.id;

  complaintId = crypto.randomUUID();
  await sql`
    INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status)
    VALUES (${complaintId}::uuid, ${COMPLAINT_NUMBER}, ${citizenId}::uuid, ${locationId}::uuid, 'UNDER_REVIEW')
  `.execute(db);

  const rowA = await db
    .insertInto("audit_logs")
    .values({
      actor_id: adminId,
      action: "admin_note_added",
      entity_type: "complaint",
      entity_id: complaintId,
      before: null,
      after: JSON.stringify({ note: "test" }),
      ip_address: null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  auditLogIds.push(rowA.id);

  const rowB = await db
    .insertInto("audit_logs")
    .values({
      actor_id: otherAdminId,
      action: "risk_override",
      entity_type: "complaint",
      entity_id: complaintId,
      before: JSON.stringify({ riskLevel: "LOW" }),
      after: JSON.stringify({ riskLevel: "HIGH" }),
      ip_address: null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  auditLogIds.push(rowB.id);
});

afterAll(async () => {
  await db.deleteFrom("audit_logs").where("id", "in", auditLogIds).execute();
  await db.deleteFrom("complaints").where("id", "=", complaintId).execute();
  await sql`DELETE FROM locations WHERE id = ${locationId}::uuid`.execute(db);
  await db.deleteFrom("users").where("id", "in", [adminId, otherAdminId, citizenId]).execute();
  await db.destroy();
});

describe("getAdminAuditLogPage", () => {
  it("returns rows across complaints, joined to the actor and linked complaint", async () => {
    const result = await getAdminAuditLogPage({});
    const rowA = result.rows.find((r) => r.id === auditLogIds[0]);
    const rowB = result.rows.find((r) => r.id === auditLogIds[1]);
    expect(rowA).toMatchObject({ action: "admin_note_added", actorName: "Audit Admin", complaintNumber: COMPLAINT_NUMBER });
    expect(rowB).toMatchObject({ action: "risk_override", actorName: "Other Admin", complaintNumber: COMPLAINT_NUMBER });
  });

  it("filters by action", async () => {
    const result = await getAdminAuditLogPage({ action: "risk_override" });
    expect(result.rows.some((r) => r.id === auditLogIds[0])).toBe(false);
    expect(result.rows.some((r) => r.id === auditLogIds[1])).toBe(true);
  });

  it("filters by actor", async () => {
    const result = await getAdminAuditLogPage({ actorId: adminId });
    expect(result.rows.some((r) => r.id === auditLogIds[0])).toBe(true);
    expect(result.rows.some((r) => r.id === auditLogIds[1])).toBe(false);
  });
});

describe("getDistinctAuditActions", () => {
  it("includes the actions actually present in the DB", async () => {
    const actions = await getDistinctAuditActions();
    expect(actions).toContain("admin_note_added");
    expect(actions).toContain("risk_override");
  });
});
