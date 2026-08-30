import { sql, type Transaction } from "kysely";

import type { Database } from "@/lib/db-types";

import { assessRisk } from "./score";

export interface RiskAssessmentInsertResult {
  id: string;
  level: string;
  score: number;
}

/**
 * Gathers the DB-backed factors (nearby complaints, complaint age) and
 * inserts the resulting risk_assessments row — called from within the same
 * transaction that persists a complaint's first InferenceResults/Detections
 * (lib/inference/process-job.ts), since that's the first point enough data
 * exists to score. CLAUDE.md §7: always store the factor breakdown, not
 * just the level.
 */
export async function computeAndStoreRiskAssessment(
  trx: Transaction<Database>,
  params: {
    complaintId: string;
    locationId: string;
    detections: { className: string; bboxAreaPx: number }[];
    imageAreaPx: number;
  }
): Promise<RiskAssessmentInsertResult> {
  const nearbyResult = await sql<{ count: string }>`
    SELECT count(*) AS count
    FROM complaints c
    JOIN locations l ON l.id = c.location_id
    WHERE c.id != ${params.complaintId}::uuid
      AND c.created_at >= now() - interval '90 days'
      AND ST_DWithin(l.geog, (SELECT geog FROM locations WHERE id = ${params.locationId}::uuid), 500)
  `.execute(trx);
  const nearbyComplaintCount = Number(nearbyResult.rows[0]?.count ?? 0);

  const complaint = await trx
    .selectFrom("complaints")
    .select("created_at")
    .where("id", "=", params.complaintId)
    .executeTakeFirstOrThrow();
  const complaintAgeDays = (Date.now() - complaint.created_at.getTime()) / (1000 * 60 * 60 * 24);

  const result = assessRisk({
    detections: params.detections,
    imageAreaPx: params.imageAreaPx,
    nearbyComplaintCount,
    complaintAgeDays,
  });

  const inserted = await trx
    .insertInto("risk_assessments")
    .values({
      complaint_id: params.complaintId,
      risk_level: result.level,
      score: result.score,
      factor_breakdown: JSON.stringify(result.factorBreakdown),
      is_admin_override: false,
      is_current: true,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return { id: inserted.id, level: result.level, score: result.score };
}
