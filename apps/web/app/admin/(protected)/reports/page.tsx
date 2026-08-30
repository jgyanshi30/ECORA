import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/domain/empty-state";
import { getGeneratedReports } from "@/lib/admin/reports";

import { GenerateReportButton } from "./generate-report-button";

export const metadata: Metadata = { title: "Reports — Ecora admin" };

// Signed download URLs and report status must always be fresh, never a build-time snapshot.
export const dynamic = "force-dynamic";

const REPORT_TYPE_LABELS: Record<string, string> = {
  summary_pdf: "Complaint summary (PDF)",
  complaints_csv: "All complaints (CSV)",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export default async function AdminReportsPage() {
  const reports = await getGeneratedReports();

  return (
    <main className="container flex flex-col gap-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <Button asChild variant="outline">
          <Link href="/admin">Back to overview</Link>
        </Button>
      </div>

      <GenerateReportButton />

      {reports.length === 0 ? (
        <EmptyState title="No reports generated yet" description="Generate a report above — it'll show up here with a download link." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Type</th>
                <th className="p-3">Requested by</th>
                <th className="p-3">Status</th>
                <th className="p-3">Requested</th>
                <th className="p-3">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="p-3">{REPORT_TYPE_LABELS[report.reportType] ?? report.reportType}</td>
                  <td className="p-3 text-muted-foreground">{report.requestedByName}</td>
                  <td className="p-3">{STATUS_LABELS[report.status] ?? report.status}</td>
                  <td className="p-3 text-muted-foreground">{report.createdAt.toLocaleString()}</td>
                  <td className="p-3">
                    {report.downloadUrl ? (
                      <a href={report.downloadUrl} className="text-primary hover:underline">
                        Download
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
