import PDFDocument from "pdfkit";

import type { AdminAnalytics } from "@/lib/admin/analytics";

/** CLAUDE.md §2 primary brand color, reused for headings. */
const BRAND_COLOR = "#0F5C4E";

function collectPdfBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function sectionHeading(doc: PDFKit.PDFDocument, title: string): void {
  doc.moveDown(1);
  doc.fontSize(14).fillColor(BRAND_COLOR).text(title);
  doc.fontSize(11).fillColor("black");
  doc.moveDown(0.3);
}

function keyValueLine(doc: PDFKit.PDFDocument, label: string, value: string): void {
  doc.fontSize(11).fillColor("black").text(`${label}: ${value}`);
}

/**
 * A real, generated PDF (CLAUDE.md's "Reports" data model — GeneratedReports)
 * — every figure comes from the same `getAdminAnalytics()` query the live
 * dashboard renders, not a separate/duplicated computation (CLAUDE.md §0: no
 * fabricated data). Deliberately plain/text-first layout, no chart images —
 * this is a document meant to be archived/shared, not a screenshot of the
 * dashboard.
 */
export async function generateSummaryReportPdf(analytics: AdminAnalytics, generatedByName: string): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50 });

  doc.fontSize(20).fillColor(BRAND_COLOR).text("Ecora — Complaint Summary Report");
  doc.fontSize(10).fillColor("gray").text(`Generated ${new Date().toLocaleString()} by ${generatedByName}`);

  sectionHeading(doc, "Overview");
  keyValueLine(doc, "Total complaints", String(analytics.totalComplaints));
  keyValueLine(doc, "Resolved complaints", String(analytics.resolvedCount));
  keyValueLine(
    doc,
    "Average time to resolution",
    analytics.avgResolutionDays !== null ? `${analytics.avgResolutionDays.toFixed(1)} days` : "No resolved complaints yet"
  );
  keyValueLine(
    doc,
    "Average citizen satisfaction",
    analytics.avgSatisfactionRating !== null
      ? `${analytics.avgSatisfactionRating.toFixed(1)} / 5 (${analytics.ratingCount} rating(s))`
      : "No ratings yet"
  );

  sectionHeading(doc, "Status breakdown");
  for (const [status, count] of Object.entries(analytics.statusBreakdown)) {
    keyValueLine(doc, status.replaceAll("_", " "), String(count));
  }

  sectionHeading(doc, "Risk breakdown (current assessments)");
  for (const [level, count] of Object.entries(analytics.riskBreakdown)) {
    keyValueLine(doc, level, String(count));
  }

  sectionHeading(doc, "Most-reported debris categories");
  if (analytics.debrisClassBreakdown.length === 0) {
    doc.fontSize(11).text("No detections recorded yet.");
  } else {
    for (const item of analytics.debrisClassBreakdown.slice(0, 10)) {
      keyValueLine(doc, item.className, String(item.count));
    }
  }

  sectionHeading(doc, "Top cities");
  if (analytics.topCities.length === 0) {
    doc.fontSize(11).text("No location data yet.");
  } else {
    for (const item of analytics.topCities) {
      keyValueLine(doc, item.city, String(item.count));
    }
  }

  sectionHeading(doc, "Note");
  doc
    .fontSize(9)
    .fillColor("gray")
    .text(
      "Risk levels reflect the most recent assessment (AI-suggested or admin-verified) at the time this report was generated. This report does not include confidential admin notes or exact complaint locations."
    );

  return collectPdfBuffer(doc);
}
