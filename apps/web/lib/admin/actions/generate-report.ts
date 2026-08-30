"use server";

import { requireAdminAction } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getAdminAnalytics } from "@/lib/admin/analytics";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/request-ip";
import { generateComplaintsCsvReport } from "@/lib/reports/csv";
import { generateSummaryReportPdf } from "@/lib/reports/pdf";
import { putObject } from "@/lib/storage/s3";

export type ReportType = "summary_pdf" | "complaints_csv";

export interface GenerateReportResult {
  ok: boolean;
  error?: string;
  reportId?: string;
}

/**
 * CLAUDE.md §5/§9's GeneratedReports entity — a tracked, re-downloadable
 * report (distinct from the instant CSV export at
 * /api/admin/complaints/export, which is "give me this data right now" with
 * no history). Generated synchronously in this sub-step (reports are fast —
 * a handful of queries plus PDF/CSV assembly — not a multi-minute job like
 * inference, so the async-queue machinery from CLAUDE.md §6 isn't warranted
 * here; see PROGRESS.md).
 */
export async function generateReportAction(reportType: ReportType): Promise<GenerateReportResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error };

  if (reportType !== "summary_pdf" && reportType !== "complaints_csv") {
    return { ok: false, error: "Invalid report type." };
  }

  const ip = await getClientIp();
  if (!checkRateLimit(`admin-generate-report:${ip}`, 10, 15 * 60 * 1000).allowed) {
    return { ok: false, error: "Too many report requests. Wait a few minutes and try again." };
  }

  const inserted = await db
    .insertInto("generated_reports")
    .values({
      requested_by: guard.session.user.id,
      report_type: reportType,
      filter_params: "{}",
      status: "pending",
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  const reportId = inserted.id;

  try {
    await db.updateTable("generated_reports").set({ status: "processing" }).where("id", "=", reportId).execute();

    let buffer: Buffer;
    let contentType: string;
    let extension: string;

    if (reportType === "summary_pdf") {
      const analytics = await getAdminAnalytics();
      buffer = await generateSummaryReportPdf(analytics, guard.session.user.email ?? "an administrator");
      contentType = "application/pdf";
      extension = "pdf";
    } else {
      const csv = await generateComplaintsCsvReport({});
      buffer = Buffer.from(csv, "utf-8");
      contentType = "text/csv";
      extension = "csv";
    }

    const storageKey = `reports/${reportId}.${extension}`;
    await putObject(storageKey, buffer, contentType);

    await db
      .updateTable("generated_reports")
      .set({ status: "completed", storage_key: storageKey, completed_at: new Date().toISOString() })
      .where("id", "=", reportId)
      .execute();
  } catch (error) {
    console.error(`Failed to generate report ${reportId}:`, error);
    await db.updateTable("generated_reports").set({ status: "failed" }).where("id", "=", reportId).execute();
    return { ok: false, error: "Could not generate the report. Try again." };
  }

  return { ok: true, reportId };
}
