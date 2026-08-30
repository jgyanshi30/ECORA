import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";

import { findPublicComplaintByNumber } from "@/lib/complaints/public-lookup";
import { db } from "@/lib/db";

const COMPLAINT_NUMBER = `CLN-20260101-${Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "A")}`;
let userId: string;
let locationId: string;
let complaintId: string;

// Raw SQL for fixture setup, not the typed query builder: `geog` isn't in
// LocationsTable (lib/db-types.ts only declares columns the app actually
// reads), and this test needs to write it to satisfy the NOT NULL fixture
// requirement, not to exercise it.
beforeAll(async () => {
  const user = await db
    .insertInto("users")
    .values({
      email: `public-lookup-test-${Date.now()}@example.com`,
      password_hash: "x",
      full_name: "Public Lookup Test",
      role: "citizen",
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  userId = user.id;

  const locationResult = await sql<{ id: string }>`
    INSERT INTO locations (geog, locality, city, state)
    VALUES (ST_SetSRID(ST_MakePoint(72.8347, 18.9220), 4326)::geography, 'Test Locality', 'Test City', 'Test State')
    RETURNING id
  `.execute(db);
  locationId = locationResult.rows[0]!.id;

  const complaintResult = await sql<{ id: string }>`
    INSERT INTO complaints (complaint_number, citizen_id, location_id, status, description)
    VALUES (${COMPLAINT_NUMBER}, ${userId}::uuid, ${locationId}::uuid, 'UNDER_REVIEW', 'Test description for public lookup.')
    RETURNING id
  `.execute(db);
  complaintId = complaintResult.rows[0]!.id;

  await sql`
    INSERT INTO public_updates (complaint_id, message)
    VALUES (${complaintId}::uuid, 'Test public update.')
  `.execute(db);
});

afterAll(async () => {
  await db.deleteFrom("public_updates").where("complaint_id", "=", complaintId).execute();
  await db.deleteFrom("complaints").where("id", "=", complaintId).execute();
  await sql`DELETE FROM locations WHERE id = ${locationId}::uuid`.execute(db);
  await db.deleteFrom("users").where("id", "=", userId).execute();
  await db.destroy();
});

describe("findPublicComplaintByNumber", () => {
  it("returns the public-safe view for an existing complaint", async () => {
    const result = await findPublicComplaintByNumber(COMPLAINT_NUMBER);
    expect(result).not.toBeNull();
    expect(result?.status).toBe("UNDER_REVIEW");
    expect(result?.city).toBe("Test City");
    expect(result?.description).toBe("Test description for public lookup.");
    expect(result?.updates).toHaveLength(1);
    expect(result?.updates[0]?.message).toBe("Test public update.");
  });

  it("never exposes citizen_id or exact coordinates", async () => {
    const result = await findPublicComplaintByNumber(COMPLAINT_NUMBER);
    expect(result).not.toHaveProperty("citizenId");
    expect(result).not.toHaveProperty("geog");
    expect(result).not.toHaveProperty("citizen_id");
  });

  it("returns null for a nonexistent complaint number", async () => {
    const result = await findPublicComplaintByNumber("CLN-20260101-ZZZZZZ");
    expect(result).toBeNull();
  });
});
