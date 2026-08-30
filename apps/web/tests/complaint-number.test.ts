import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";

import { isValidComplaintNumber } from "@ecora/shared";

import { insertComplaintWithUniqueNumber } from "@/lib/complaints/complaint-number";
import { db } from "@/lib/db";

let userId: string;
let locationId: string;
const complaintIds: string[] = [];

beforeAll(async () => {
  const user = await db
    .insertInto("users")
    .values({
      email: `complaint-number-test-${Date.now()}@example.com`,
      password_hash: "x",
      full_name: "Complaint Number Test",
      role: "citizen",
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  userId = user.id;

  const location = await sql<{ id: string }>`
    INSERT INTO locations (geog, locality, city, state, consent_given)
    VALUES (ST_SetSRID(ST_MakePoint(72.8347, 18.9220), 4326)::geography, 'Test Locality', 'Test City', 'Test State', TRUE)
    RETURNING id
  `.execute(db);
  locationId = location.rows[0]!.id;
});

afterAll(async () => {
  if (complaintIds.length > 0) {
    await db.deleteFrom("status_history").where("complaint_id", "in", complaintIds).execute();
    await db.deleteFrom("complaint_images").where("complaint_id", "in", complaintIds).execute();
    await db.deleteFrom("complaints").where("id", "in", complaintIds).execute();
  }
  await sql`DELETE FROM locations WHERE id = ${locationId}::uuid`.execute(db);
  await db.deleteFrom("users").where("id", "=", userId).execute();
  await db.destroy();
});

describe("insertComplaintWithUniqueNumber", () => {
  it("generates and inserts a well-formed, real complaint number", async () => {
    const id = crypto.randomUUID();
    const number = await insertComplaintWithUniqueNumber(db, {
      id,
      citizen_id: userId,
      location_id: locationId,
      description: "First test complaint.",
    });
    complaintIds.push(id);

    expect(isValidComplaintNumber(number)).toBe(true);

    const row = await db
      .selectFrom("complaints")
      .select(["id", "complaint_number"])
      .where("id", "=", id)
      .executeTakeFirst();
    expect(row?.complaint_number).toBe(number);
  });

  it("retries with a fresh candidate when the first candidate collides", async () => {
    // Reserve a real complaint number first, then force the injected
    // generator to hand back that exact colliding value before a fresh one —
    // proving the ON CONFLICT DO NOTHING + retry loop actually works, not
    // just that crypto-random luck avoided a collision.
    const takenId = crypto.randomUUID();
    const takenNumber = await insertComplaintWithUniqueNumber(db, {
      id: takenId,
      citizen_id: userId,
      location_id: locationId,
      description: "Pre-existing complaint to collide with.",
    });
    complaintIds.push(takenId);

    const candidates = [takenNumber, "CLN-20260830-FRESH1"];
    let callCount = 0;
    const newId = crypto.randomUUID();
    const number = await insertComplaintWithUniqueNumber(
      db,
      { id: newId, citizen_id: userId, location_id: locationId, description: null },
      () => candidates[callCount++] ?? "CLN-20260830-FRESH2"
    );
    complaintIds.push(newId);

    expect(callCount).toBe(2);
    expect(number).toBe("CLN-20260830-FRESH1");
  });

  it("throws after exhausting attempts if every candidate collides", async () => {
    const takenId = crypto.randomUUID();
    const takenNumber = await insertComplaintWithUniqueNumber(db, {
      id: takenId,
      citizen_id: userId,
      location_id: locationId,
      description: null,
    });
    complaintIds.push(takenId);

    await expect(
      insertComplaintWithUniqueNumber(
        db,
        { id: crypto.randomUUID(), citizen_id: userId, location_id: locationId, description: null },
        () => takenNumber
      )
    ).rejects.toThrow(/unique complaint number/i);
  });
});
