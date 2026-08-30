"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface DownloadAcknowledgementButtonProps {
  complaintNumber: string;
  createdAt: string;
  status: string;
  addressLine: string | null;
}

/**
 * A real download, not a "Coming soon" placeholder (CLAUDE.md §0) — a plain
 * text receipt built client-side and handed to the browser as a Blob, so no
 * server round-trip or file-generation dependency is needed for something
 * this simple.
 */
export function DownloadAcknowledgementButton({
  complaintNumber,
  createdAt,
  status,
  addressLine,
}: DownloadAcknowledgementButtonProps) {
  function handleDownload() {
    const lines = [
      "Ecora — Submission Acknowledgement",
      "",
      `Complaint number: ${complaintNumber}`,
      `Submitted: ${createdAt}`,
      `Status: ${status.replaceAll("_", " ")}`,
      addressLine ? `Location: ${addressLine}` : null,
      "",
      "This confirms your report was received. It is not a confirmation of any",
      "AI or administrator analysis — track real-time status anytime at",
      "ecora.example/track using the complaint number above.",
    ].filter((line): line is string => line !== null);

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${complaintNumber}-acknowledgement.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" onClick={handleDownload}>
      <Download className="h-4 w-4" />
      Download acknowledgement
    </Button>
  );
}
