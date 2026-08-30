import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";

import {
  getCitizenComplaints,
  getCitizenNotifications,
  getCitizenStatusCounts,
  getUpdatesForComplaints,
} from "@/lib/complaints/citizen-dashboard";
import { db } from "@/lib/db";

let ownerCitizenId: string;
let otherCitizenId: string;
let locationId: string;
let ownComplaintId: string;
let otherComplaintId: string;

beforeAll(async () => {
  const owner = await db
    .insertInto("users")
    .values({
      email: `dashboard-owner-${Date.now()}@example.com`,
      password_hash: "x",
      full_name: "Dashboard Owner",
      role: "citizen",
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  ownerCitizenId = owner.id;

  const other = await db
    .insertInto("users")
    .values({
      email: `dashboard-other-${Date.now()}@example.com`,
      password_hash: "x",
      full_name: "Dashboard Other",
      role: "citizen",
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  otherCitizenId = other.id;

  const location = await sql<{ id: string }>`
    INSERT INTO locations (geog, locality, city, state)
    VALUES (ST_SetSRID(ST_MakePoint(72.8347, 18.9220), 4326)::geography, 'Test Locality', 'Test City', 'Test State')
    RETURNING id
  `.execute(db);
  locationId = location.rows[0]!.id;

  const ownComplaint = await sql<{ id: string }>`
    INSERT INTO complaints (complaint_number, citizen_id, location_id, status, description)
    VALUES ('CLN-20260101-DASH9A', ${ownerCitizenId}::uuid, ${locationId}::uuid, 'UNDER_REVIEW', 'Owner complaint')
    RETURNING id
  `.execute(db);
  ownComplaintId = ownComplaint.rows[0]!.id;

  const otherComplaint = await sql<{ id: string }>`
    INSERT INTO complaints (complaint_number, citizen_id, location_id, status, description)
    VALUES ('CLN-20260101-DASH9B', ${otherCitizenId}::uuid, ${locationId}::uuid, 'RESOLVED', 'Other citizen complaint')
    RETURNING id
  `.execute(db);
  otherComplaintId = otherComplaint.rows[0]!.id;

  await sql`INSERT INTO public_updates (complaint_id, message) VALUES (${ownComplaintId}::uuid, 'Update A')`.execute(db);
  await sql`INSERT INTO public_updates (complaint_id, message) VALUES (${ownComplaintId}::uuid, 'Update B')`.execute(db);

  await db
    .insertInto("notifications")
    .values({ user_id: ownerCitizenId, channel: "in_app", type: "test", message: "Owner notification" })
    .execute();
  await db
    .insertInto("notifications")
    .values({ user_id: otherCitizenId, channel: "in_app", type: "test", message: "Other notification" })
    .execute();
});

afterAll(async () => {
  await db.deleteFrom("public_updates").where("complaint_id", "in", [ownComplaintId, otherComplaintId]).execute();
  await db.deleteFrom("notifications").where("user_id", "in", [ownerCitizenId, otherCitizenId]).execute();
  await db.deleteFrom("complaints").where("id", "in", [ownComplaintId, otherComplaintId]).execute();
  await sql`DELETE FROM locations WHERE id = ${locationId}::uuid`.execute(db);
  await db.deleteFrom("users").where("id", "in", [ownerCitizenId, otherCitizenId]).execute();
  await db.destroy();
});

describe("getCitizenComplaints", () => {
  it("only returns the given citizen's own complaints", async () => {
    const rows = await getCitizenComplaints(ownerCitizenId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.complaintNumber).toBe("CLN-20260101-DASH9A");
  });

  it("never returns another citizen's complaints", async () => {
    const rows = await getCitizenComplaints(ownerCitizenId);
    expect(rows.some((r) => r.complaintNumber === "CLN-20260101-DASH9B")).toBe(false);
  });

  it("returns an empty array for a citizen with no complaints", async () => {
    const rows = await getCitizenComplaints(crypto.randomUUID());
    expect(rows).toEqual([]);
  });

  it("filters by status", async () => {
    const matching = await getCitizenComplaints(ownerCitizenId, { status: "UNDER_REVIEW" });
    expect(matching).toHaveLength(1);
    const nonMatching = await getCitizenComplaints(ownerCitizenId, { status: "RESOLVED" });
    expect(nonMatching).toHaveLength(0);
  });

  it("filters by search text against complaint_number and description", async () => {
    const byNumber = await getCitizenComplaints(ownerCitizenId, { q: "DASH9A" });
    expect(byNumber).toHaveLength(1);
    const byDescription = await getCitizenComplaints(ownerCitizenId, { q: "Owner complaint" });
    expect(byDescription).toHaveLength(1);
    const noMatch = await getCitizenComplaints(ownerCitizenId, { q: "nonexistent-term-xyz" });
    expect(noMatch).toHaveLength(0);
  });
});

describe("getCitizenStatusCounts", () => {
  it("counts only the given citizen's complaints, grouped by status", async () => {
    const counts = await getCitizenStatusCounts(ownerCitizenId);
    expect(counts.UNDER_REVIEW).toBe(1);
    expect(counts.RESOLVED ?? 0).toBe(0);
  });
});

describe("getUpdatesForComplaints", () => {
  it("returns updates grouped by complaint id, ordered oldest first", async () => {
    const map = await getUpdatesForComplaints([ownComplaintId]);
    const updates = map.get(ownComplaintId);
    expect(updates).toHaveLength(2);
    expect(updates?.[0]?.message).toBe("Update A");
    expect(updates?.[1]?.message).toBe("Update B");
  });

  it("returns an empty map for an empty input array", async () => {
    const map = await getUpdatesForComplaints([]);
    expect(map.size).toBe(0);
  });
});

describe("getCitizenNotifications", () => {
  it("only returns the given user's own notifications", async () => {
    const rows = await getCitizenNotifications(ownerCitizenId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.message).toBe("Owner notification");
  });
});
