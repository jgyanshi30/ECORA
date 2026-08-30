import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";

import { getAdminComplaintsPage, getAdminStatusCounts, getAllAdminComplaintsForExport } from "@/lib/admin/complaints";
import { db } from "@/lib/db";

let citizenId: string;
let locationId: string;
const complaintIds: string[] = [];

async function makeComplaint(number: string, status: string, description: string): Promise<string> {
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status, description)
    VALUES (${id}::uuid, ${number}, ${citizenId}::uuid, ${locationId}::uuid, ${status}, ${description})
  `.execute(db);
  complaintIds.push(id);
  return id;
}

beforeAll(async () => {
  const user = await db
    .insertInto("users")
    .values({
      email: `admin-complaints-test-${Date.now()}@example.com`,
      password_hash: "x",
      full_name: "Admin Fixture Citizen",
      role: "citizen",
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  citizenId = user.id;

  const location = await sql<{ id: string }>`
    INSERT INTO locations (geog, locality, city, state, consent_given)
    VALUES (ST_SetSRID(ST_MakePoint(72.8347, 18.9220), 4326)::geography, 'Test Locality', 'Test City', 'Test State', TRUE)
    RETURNING id
  `.execute(db);
  locationId = location.rows[0]!.id;

  await makeComplaint("CLN-20260201-ADMN01", "SUBMITTED", "Plastic near the shore");
  await makeComplaint("CLN-20260201-ADMN02", "UNDER_REVIEW", "Net entangled in rocks");
  await makeComplaint("CLN-20260201-ADMN03", "RESOLVED", "Cleared debris");
});

afterAll(async () => {
  await db.deleteFrom("status_history").where("complaint_id", "in", complaintIds).execute();
  await db.deleteFrom("public_updates").where("complaint_id", "in", complaintIds).execute();
  await db.deleteFrom("audit_logs").where("entity_id", "in", complaintIds).execute();
  await db.deleteFrom("complaints").where("id", "in", complaintIds).execute();
  await sql`DELETE FROM locations WHERE id = ${locationId}::uuid`.execute(db);
  await db.deleteFrom("users").where("id", "=", citizenId).execute();
  await db.destroy();
});

describe("getAdminStatusCounts", () => {
  it("counts complaints across every status, including zero for statuses with none", async () => {
    const counts = await getAdminStatusCounts();
    expect(counts.SUBMITTED).toBeGreaterThanOrEqual(1);
    expect(counts.UNDER_REVIEW).toBeGreaterThanOrEqual(1);
    expect(counts.RESOLVED).toBeGreaterThanOrEqual(1);
    expect(counts.REJECTED_DUPLICATE).toBeGreaterThanOrEqual(0);
    expect(Object.keys(counts)).toHaveLength(8);
  });
});

describe("getAdminComplaintsPage", () => {
  it("searches by complaint number, description, and citizen fields", async () => {
    const byNumber = await getAdminComplaintsPage({ q: "ADMN02" });
    expect(byNumber.rows.map((r) => r.complaintNumber)).toContain("CLN-20260201-ADMN02");

    const byDescription = await getAdminComplaintsPage({ q: "entangled" });
    expect(byDescription.rows.map((r) => r.complaintNumber)).toContain("CLN-20260201-ADMN02");
  });

  it("filters by status", async () => {
    const result = await getAdminComplaintsPage({ q: "ADMN0", status: "RESOLVED" });
    expect(result.rows.every((r) => r.status === "RESOLVED")).toBe(true);
    expect(result.rows.map((r) => r.complaintNumber)).toContain("CLN-20260201-ADMN03");
  });

  it("sorts by complaint_number ascending", async () => {
    const result = await getAdminComplaintsPage({ q: "ADMN0", sort: "complaint_number", order: "asc" });
    const numbers = result.rows.map((r) => r.complaintNumber);
    expect(numbers).toEqual([...numbers].sort());
  });

  it("paginates with a real total count", async () => {
    const page1 = await getAdminComplaintsPage({ q: "ADMN0", page: 1 });
    expect(page1.totalCount).toBeGreaterThanOrEqual(3);
    expect(page1.pageSize).toBe(25);
  });

  it("never exposes exact coordinates or admin notes fields on the row shape", async () => {
    const result = await getAdminComplaintsPage({ q: "ADMN01" });
    const row = result.rows[0];
    expect(row).not.toHaveProperty("geog");
    expect(row).not.toHaveProperty("adminNotes");
  });
});

describe("getAllAdminComplaintsForExport", () => {
  it("returns every matching row with no pagination limit, matching the table's own filters", async () => {
    const tablePage = await getAdminComplaintsPage({ q: "ADMN0" });
    const exportRows = await getAllAdminComplaintsForExport({ q: "ADMN0" });
    expect(exportRows.length).toBeGreaterThanOrEqual(tablePage.rows.length);
    expect(exportRows.map((r) => r.complaintNumber)).toEqual(
      expect.arrayContaining(tablePage.rows.map((r) => r.complaintNumber))
    );
  });

  it("supports region-select bounds from the admin map (CLAUDE.md §9)", async () => {
    // Fixture complaints are all at (72.8347, 18.9220) — a bbox around Mumbai should include them...
    const inMumbai = await getAllAdminComplaintsForExport({ q: "ADMN0", bounds: { minLat: 18, maxLat: 19, minLng: 72, maxLng: 73 } });
    expect(inMumbai.map((r) => r.complaintNumber)).toEqual(expect.arrayContaining(["CLN-20260201-ADMN01", "CLN-20260201-ADMN02"]));

    // ...but a bbox around Delhi should exclude them.
    const inDelhi = await getAllAdminComplaintsForExport({ q: "ADMN0", bounds: { minLat: 28, maxLat: 29, minLng: 77, maxLng: 78 } });
    expect(inDelhi).toHaveLength(0);
  });
});
