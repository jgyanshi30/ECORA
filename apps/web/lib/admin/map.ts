import { isComplaintStatus, isRiskLevel, type ComplaintStatus, type RiskLevel } from "@ecora/shared";
import { sql } from "kysely";

import { db } from "@/lib/db";

export interface AdminMapPoint {
  id: string;
  complaintNumber: string;
  status: ComplaintStatus;
  riskLevel: RiskLevel | null;
  lat: number;
  lng: number;
}

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Full-fidelity, exact-coordinate map data — admin-only (CLAUDE.md §0). Optionally scoped to a region for "export complaints in this region." */
export async function getAdminMapPoints(bounds?: MapBounds): Promise<AdminMapPoint[]> {
  const boundsClause = bounds
    ? sql`WHERE ST_Within(l.geog::geometry, ST_MakeEnvelope(${bounds.minLng}, ${bounds.minLat}, ${bounds.maxLng}, ${bounds.maxLat}, 4326))`
    : sql``;

  const result = await sql<{
    id: string;
    complaint_number: string;
    status: string;
    risk_level: string | null;
    lat: number;
    lng: number;
  }>`
    SELECT c.id, c.complaint_number, c.status::text AS status, ra.risk_level::text AS risk_level,
           ST_Y(l.geog::geometry) AS lat, ST_X(l.geog::geometry) AS lng
    FROM complaints c
    JOIN locations l ON l.id = c.location_id
    LEFT JOIN risk_assessments ra ON ra.complaint_id = c.id AND ra.is_current = TRUE
    ${boundsClause}
  `.execute(db);

  return result.rows
    .filter((r) => isComplaintStatus(r.status))
    .map((r) => ({
      id: r.id,
      complaintNumber: r.complaint_number,
      status: r.status as ComplaintStatus,
      riskLevel: r.risk_level && isRiskLevel(r.risk_level) ? r.risk_level : null,
      lat: r.lat,
      lng: r.lng,
    }));
}
