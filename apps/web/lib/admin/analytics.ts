import { COMPLAINT_STATUSES, RISK_LEVELS, isComplaintStatus, isRiskLevel, type ComplaintStatus, type RiskLevel } from "@ecora/shared";
import { sql } from "kysely";

import { db } from "@/lib/db";

export interface DebrisClassCount {
  className: string;
  count: number;
}

export interface DailyCount {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface CityCount {
  city: string;
  count: number;
}

export interface AdminAnalytics {
  totalComplaints: number;
  statusBreakdown: Record<ComplaintStatus, number>;
  riskBreakdown: Record<RiskLevel, number>;
  debrisClassBreakdown: DebrisClassCount[];
  submissionsByDay: DailyCount[];
  avgResolutionDays: number | null;
  resolvedCount: number;
  avgSatisfactionRating: number | null;
  ratingCount: number;
  topCities: CityCount[];
}

const SUBMISSIONS_WINDOW_DAYS = 30;

/**
 * Every number here is a real query against the live schema — no
 * placeholder/demo figures (CLAUDE.md §0: "no fabricated data presented as
 * real"). An empty dataset just produces zeros/empty arrays, which the page
 * renders as an explicit empty state, not a fake chart.
 */
export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const [statusRows, riskRows, classRows, dayRows, resolutionRow, ratingRow, cityRows, totalRow] = await Promise.all([
    db.selectFrom("complaints").select(["status", (eb) => eb.fn.countAll().as("count")]).groupBy("status").execute(),

    db
      .selectFrom("risk_assessments")
      .select(["risk_level", (eb) => eb.fn.countAll().as("count")])
      .where("is_current", "=", true)
      .groupBy("risk_level")
      .execute(),

    db
      .selectFrom("detections")
      .select(["ai_class_name", (eb) => eb.fn.countAll().as("count")])
      .groupBy("ai_class_name")
      .orderBy((eb) => eb.fn.countAll(), "desc")
      .execute(),

    sql<{ day: string; count: string }>`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::text AS count
      FROM complaints
      WHERE created_at >= now() - make_interval(days => ${SUBMISSIONS_WINDOW_DAYS})
      GROUP BY 1
      ORDER BY 1
    `.execute(db),

    sql<{ avg_days: string | null; resolved_count: string }>`
      SELECT
        AVG(EXTRACT(EPOCH FROM (sh.created_at - c.created_at)) / 86400.0)::text AS avg_days,
        count(*)::text AS resolved_count
      FROM status_history sh
      JOIN complaints c ON c.id = sh.complaint_id
      WHERE sh.to_status = 'RESOLVED'
    `.execute(db),

    db
      .selectFrom("complaint_feedback")
      .select([(eb) => eb.fn.avg("rating").as("avg_rating"), (eb) => eb.fn.countAll().as("count")])
      .executeTakeFirst(),

    db
      .selectFrom("complaints")
      .innerJoin("locations", "locations.id", "complaints.location_id")
      .select(["locations.city", (eb) => eb.fn.countAll().as("count")])
      .where("locations.city", "is not", null)
      .groupBy("locations.city")
      .orderBy((eb) => eb.fn.countAll(), "desc")
      .limit(10)
      .execute(),

    db.selectFrom("complaints").select((eb) => eb.fn.countAll().as("count")).executeTakeFirstOrThrow(),
  ]);

  const statusBreakdown = Object.fromEntries(COMPLAINT_STATUSES.map((s) => [s, 0])) as Record<ComplaintStatus, number>;
  for (const row of statusRows) {
    if (isComplaintStatus(row.status)) statusBreakdown[row.status] = Number(row.count);
  }

  const riskBreakdown = Object.fromEntries(RISK_LEVELS.map((r) => [r, 0])) as Record<RiskLevel, number>;
  for (const row of riskRows) {
    if (isRiskLevel(row.risk_level)) riskBreakdown[row.risk_level] = Number(row.count);
  }

  const resolution = resolutionRow.rows[0];
  const ratingAvg = ratingRow?.avg_rating != null ? Number(ratingRow.avg_rating) : null;

  return {
    totalComplaints: Number(totalRow.count),
    statusBreakdown,
    riskBreakdown,
    debrisClassBreakdown: classRows.map((r) => ({ className: r.ai_class_name, count: Number(r.count) })),
    submissionsByDay: dayRows.rows.map((r) => ({ date: r.day, count: Number(r.count) })),
    avgResolutionDays: resolution?.avg_days != null ? Number(resolution.avg_days) : null,
    resolvedCount: Number(resolution?.resolved_count ?? 0),
    avgSatisfactionRating: ratingAvg,
    ratingCount: ratingRow ? Number(ratingRow.count) : 0,
    topCities: cityRows.map((r) => ({ city: r.city as string, count: Number(r.count) })),
  };
}
