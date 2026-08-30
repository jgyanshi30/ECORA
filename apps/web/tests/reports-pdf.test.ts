import { describe, expect, it } from "vitest";

import type { AdminAnalytics } from "@/lib/admin/analytics";
import { generateSummaryReportPdf } from "@/lib/reports/pdf";

function makeAnalytics(overrides: Partial<AdminAnalytics> = {}): AdminAnalytics {
  return {
    totalComplaints: 3,
    statusBreakdown: {
      SUBMITTED: 1,
      AI_ANALYSIS_PENDING: 0,
      UNDER_REVIEW: 1,
      ASSIGNED: 0,
      ACTION_IN_PROGRESS: 0,
      RESOLVED: 1,
      CLOSED: 0,
      REJECTED_DUPLICATE: 0,
    },
    riskBreakdown: { LOW: 1, MEDIUM: 1, HIGH: 0, CRITICAL: 0 },
    debrisClassBreakdown: [{ className: "plastic", count: 2 }],
    submissionsByDay: [{ date: "2026-08-01", count: 3 }],
    avgResolutionDays: 4.5,
    resolvedCount: 1,
    avgSatisfactionRating: 4.2,
    ratingCount: 1,
    topCities: [{ city: "Mumbai", count: 3 }],
    ...overrides,
  };
}

describe("generateSummaryReportPdf", () => {
  it("produces a real PDF file (starts with the %PDF magic bytes)", async () => {
    const buffer = await generateSummaryReportPdf(makeAnalytics(), "test-admin@example.com");
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(buffer.byteLength).toBeGreaterThan(500); // a real rendered document, not an empty shell
  });

  it("handles the empty-data case without crashing (no resolved complaints, no ratings, no detections)", async () => {
    const buffer = await generateSummaryReportPdf(
      makeAnalytics({
        totalComplaints: 0,
        avgResolutionDays: null,
        resolvedCount: 0,
        avgSatisfactionRating: null,
        ratingCount: 0,
        debrisClassBreakdown: [],
        topCities: [],
      }),
      "test-admin@example.com"
    );
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
