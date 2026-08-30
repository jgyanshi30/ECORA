import { db } from "@/lib/db";
import { getSignedGetUrl } from "@/lib/storage/s3";

export interface GeneratedReportRow {
  id: string;
  reportType: string;
  status: "pending" | "processing" | "completed" | "failed";
  requestedByName: string;
  createdAt: Date;
  completedAt: Date | null;
  downloadUrl: string | null;
}

const REPORT_HISTORY_LIMIT = 50;

/** Report history (CLAUDE.md §5 GeneratedReports) — signed download URLs are minted fresh per page load, never stored (CLAUDE.md §11). */
export async function getGeneratedReports(): Promise<GeneratedReportRow[]> {
  const rows = await db
    .selectFrom("generated_reports")
    .innerJoin("users", "users.id", "generated_reports.requested_by")
    .select([
      "generated_reports.id",
      "generated_reports.report_type",
      "generated_reports.status",
      "generated_reports.storage_key",
      "generated_reports.created_at",
      "generated_reports.completed_at",
      "users.full_name",
    ])
    .orderBy("generated_reports.created_at", "desc")
    .limit(REPORT_HISTORY_LIMIT)
    .execute();

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      reportType: row.report_type,
      status: row.status,
      requestedByName: row.full_name,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      downloadUrl: row.status === "completed" && row.storage_key ? await getSignedGetUrl(row.storage_key) : null,
    }))
  );
}
