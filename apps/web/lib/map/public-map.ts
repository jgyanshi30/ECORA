import { isComplaintStatus, type ComplaintStatus } from "@ecora/shared";
import { sql } from "kysely";

import { db } from "@/lib/db";
import { jitterCoordinate } from "@/lib/geo/jitter";

export interface PublicMapPoint {
  id: string;
  status: ComplaintStatus;
  lat: number;
  lng: number;
}

/**
 * Public, unauthenticated map data (CLAUDE.md §0, §9) — every point is
 * jittered server-side before it ever leaves this function; the real
 * coordinate is never sent to the client. Never selects citizen_id, exact
 * address fields, risk, or admin notes — status only, same trust model as
 * the public tracker (CLAUDE.md §4).
 */
export async function getPublicMapPoints(): Promise<PublicMapPoint[]> {
  const result = await sql<{ id: string; status: string; lat: number; lng: number }>`
    SELECT c.id, c.status::text AS status, ST_Y(l.geog::geometry) AS lat, ST_X(l.geog::geometry) AS lng
    FROM complaints c
    JOIN locations l ON l.id = c.location_id
  `.execute(db);

  return result.rows
    .filter((r) => isComplaintStatus(r.status))
    .map((r) => {
      const jittered = jitterCoordinate(r.lat, r.lng, r.id);
      return { id: r.id, status: r.status as ComplaintStatus, lat: jittered.lat, lng: jittered.lng };
    });
}
