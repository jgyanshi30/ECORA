"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/domain/form-message";
import { generateReportAction, type ReportType } from "@/lib/admin/actions/generate-report";

export function GenerateReportButton() {
  const router = useRouter();
  const [reportType, setReportType] = useState<ReportType>("summary_pdf");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setPending(true);
    setError(null);
    const result = await generateReportAction(reportType);
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error ?? "Could not generate the report.");
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/50 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as ReportType)}
          className="flex h-9 w-64 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
        >
          <option value="summary_pdf">Complaint summary (PDF)</option>
          <option value="complaints_csv">All complaints (CSV)</option>
        </select>
        <Button type="button" onClick={() => void handleGenerate()} disabled={pending}>
          {pending ? "Generating…" : "Generate report"}
        </Button>
      </div>
      <FormMessage error={error ?? undefined} />
    </div>
  );
}
