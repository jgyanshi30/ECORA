import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";

import { getAdminMapPoints } from "@/lib/admin/map";
import { db } from "@/lib/db";
import { getPublicMapPoints } from "@/lib/map/public-map";

let citizenId: string;
let insideLocationId: string;
let outsideLocationId: string;
let insideComplaintId: string;
let outsideComplaintId: string;

// Mumbai-ish coordinates for "inside" a test bounding box; Delhi-ish for "outside" it.
const INSIDE = { lat: 18.922, lng: 72.8347 };
const OUTSIDE = { lat: 28.6139, lng: 77.209 };

beforeAll(async () => {
  const user = await db
    .insertInto("users")
    .values({ email: `map-test-${Date.now()}@example.com`, password_hash: "x", full_name: "Map Test", role: "citizen" })
    .returningAll()
    .executeTakeFirstOrThrow();
  citizenId = user.id;

  const insideLoc = await sql<{ id: string }>`
    INSERT INTO locations (geog, consent_given) VALUES (ST_SetSRID(ST_MakePoint(${INSIDE.lng}, ${INSIDE.lat}), 4326)::geography, TRUE) RETURNING id
  `.execute(db);
  insideLocationId = insideLoc.rows[0]!.id;

  const outsideLoc = await sql<{ id: string }>`
    INSERT INTO locations (geog, consent_given) VALUES (ST_SetSRID(ST_MakePoint(${OUTSIDE.lng}, ${OUTSIDE.lat}), 4326)::geography, TRUE) RETURNING id
  `.execute(db);
  outsideLocationId = outsideLoc.rows[0]!.id;

  insideComplaintId = crypto.randomUUID();
  await sql`
    INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status)
    VALUES (${insideComplaintId}::uuid, 'CLN-20260301-MAPIN1', ${citizenId}::uuid, ${insideLocationId}::uuid, 'UNDER_REVIEW')
  `.execute(db);

  outsideComplaintId = crypto.randomUUID();
  await sql`
    INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status)
    VALUES (${outsideComplaintId}::uuid, 'CLN-20260301-MAPOT1', ${citizenId}::uuid, ${outsideLocationId}::uuid, 'RESOLVED')
  `.execute(db);

  await db
    .insertInto("risk_assessments")
    .values({
      complaint_id: insideComplaintId,
      risk_level: "HIGH",
      score: 60,
      factor_breakdown: JSON.stringify({}),
      is_admin_override: false,
      is_current: true,
    })
    .execute();
});

afterAll(async () => {
  await db.deleteFrom("risk_assessments").where("complaint_id", "in", [insideComplaintId, outsideComplaintId]).execute();
  await db.deleteFrom("complaints").where("id", "in", [insideComplaintId, outsideComplaintId]).execute();
  await sql`DELETE FROM locations WHERE id IN (${insideLocationId}::uuid, ${outsideLocationId}::uuid)`.execute(db);
  await db.deleteFrom("users").where("id", "=", citizenId).execute();
  await db.destroy();
});

describe("getPublicMapPoints", () => {
  it("returns a jittered point for every complaint, never the exact stored coordinate", async () => {
    const points = await getPublicMapPoints();
    const point = points.find((p) => p.id === insideComplaintId);
    expect(point).toBeDefined();
    expect(point!.lat === INSIDE.lat && point!.lng === INSIDE.lng).toBe(false);
    // Still in the same neighborhood (within ~1km, generously) — not wildly displaced.
    expect(Math.abs(point!.lat - INSIDE.lat)).toBeLessThan(0.01);
    expect(Math.abs(point!.lng - INSIDE.lng)).toBeLessThan(0.01);
  });

  it("includes status but nothing risk/citizen-identifying (checked via the returned object's own keys)", async () => {
    const points = await getPublicMapPoints();
    const point = points.find((p) => p.id === insideComplaintId)!;
    expect(Object.keys(point).sort()).toEqual(["id", "lat", "lng", "status"]);
  });
});

describe("getAdminMapPoints", () => {
  it("returns exact (non-jittered) coordinates and the current risk level", async () => {
    const points = await getAdminMapPoints();
    const point = points.find((p) => p.id === insideComplaintId);
    expect(point).toBeDefined();
    expect(point!.lat).toBeCloseTo(INSIDE.lat, 4);
    expect(point!.lng).toBeCloseTo(INSIDE.lng, 4);
    expect(point!.riskLevel).toBe("HIGH");
  });

  it("returns null risk for a complaint with no current assessment", async () => {
    const points = await getAdminMapPoints();
    const point = points.find((p) => p.id === outsideComplaintId);
    expect(point?.riskLevel).toBeNull();
  });

  it("filters to a bounding box, excluding points outside it", async () => {
    const points = await getAdminMapPoints({ minLat: 18, maxLat: 19, minLng: 72, maxLng: 73 });
    expect(points.some((p) => p.id === insideComplaintId)).toBe(true);
    expect(points.some((p) => p.id === outsideComplaintId)).toBe(false);
  });
});
