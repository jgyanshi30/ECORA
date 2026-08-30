import { describe, expect, it } from "vitest";

import { getMarkerColor } from "@/components/domain/map-marker-color";

describe("getMarkerColor", () => {
  it("colors pending statuses amber", () => {
    expect(getMarkerColor("SUBMITTED")).toBe("#d97706");
    expect(getMarkerColor("AI_ANALYSIS_PENDING")).toBe("#d97706");
  });

  it("colors under-review/assigned statuses blue", () => {
    expect(getMarkerColor("UNDER_REVIEW")).toBe("#2563eb");
    expect(getMarkerColor("ASSIGNED")).toBe("#2563eb");
  });

  it("colors action-in-progress purple (map marker only, per CLAUDE.md §2)", () => {
    expect(getMarkerColor("ACTION_IN_PROGRESS")).toBe("#9333ea");
  });

  it("colors resolved green and closed/rejected gray", () => {
    expect(getMarkerColor("RESOLVED")).toBe("#16a34a");
    expect(getMarkerColor("CLOSED")).toBe("#64748b");
    expect(getMarkerColor("REJECTED_DUPLICATE")).toBe("#64748b");
  });

  it("overrides to red for HIGH/CRITICAL risk regardless of status, when risk is provided", () => {
    expect(getMarkerColor("SUBMITTED", "HIGH")).toBe("#dc2626");
    expect(getMarkerColor("UNDER_REVIEW", "CRITICAL")).toBe("#dc2626");
  });

  it("ignores LOW/MEDIUM risk — falls back to status color", () => {
    expect(getMarkerColor("SUBMITTED", "LOW")).toBe("#d97706");
    expect(getMarkerColor("UNDER_REVIEW", "MEDIUM")).toBe("#2563eb");
  });

  it("falls back to status color when no risk is given (the public map's case)", () => {
    expect(getMarkerColor("RESOLVED")).toBe(getMarkerColor("RESOLVED", null));
  });
});
