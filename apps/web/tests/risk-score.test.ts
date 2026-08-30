import { describe, expect, it } from "vitest";

import { assessRisk, RISK_WEIGHTS } from "@/lib/risk/score";

describe("assessRisk", () => {
  it("scores LOW for no detections and no other signals", () => {
    const result = assessRisk({ detections: [], imageAreaPx: 640 * 640, nearbyComplaintCount: 0, complaintAgeDays: 0 });
    expect(result.level).toBe("LOW");
    expect(result.factorBreakdown.debrisCategory.score).toBe(0);
  });

  it("scores higher for a hazardous category (net) than a low-risk one (plastic), all else equal", () => {
    const base = { imageAreaPx: 640 * 640, nearbyComplaintCount: 0, complaintAgeDays: 0 };
    const netResult = assessRisk({ ...base, detections: [{ className: "net", bboxAreaPx: 1000 }] });
    const plasticResult = assessRisk({ ...base, detections: [{ className: "plastic", bboxAreaPx: 1000 }] });
    expect(netResult.score).toBeGreaterThan(plasticResult.score);
  });

  it("always includes every documented factor in the breakdown, weights summing to 1", () => {
    const result = assessRisk({ detections: [], imageAreaPx: 100, nearbyComplaintCount: 0, complaintAgeDays: 0 });
    const keys = Object.keys(result.factorBreakdown);
    expect(keys.sort()).toEqual(
      ["complaintAge", "debrisCategory", "detectionAreaRatio", "locationSensitivity", "nearbyComplaints", "objectCount"].sort()
    );
    const weightSum = Object.values(RISK_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(weightSum).toBeCloseTo(1, 5);
  });

  it("documents locationSensitivity as a neutral placeholder, not a real signal", () => {
    const a = assessRisk({ detections: [], imageAreaPx: 100, nearbyComplaintCount: 0, complaintAgeDays: 0 });
    const b = assessRisk({ detections: [{ className: "net", bboxAreaPx: 99 }], imageAreaPx: 100, nearbyComplaintCount: 5, complaintAgeDays: 30 });
    expect(a.factorBreakdown.locationSensitivity.score).toBe(50);
    expect(b.factorBreakdown.locationSensitivity.score).toBe(50);
    expect(a.factorBreakdown.locationSensitivity.detail).toMatch(/placeholder/i);
  });

  it("caps object-count and nearby-complaints contributions rather than scaling unboundedly", () => {
    const manyDetections = Array.from({ length: 50 }, () => ({ className: "misc", bboxAreaPx: 1 }));
    const result = assessRisk({ detections: manyDetections, imageAreaPx: 1_000_000, nearbyComplaintCount: 500, complaintAgeDays: 0 });
    expect(result.factorBreakdown.objectCount.score).toBe(100);
    expect(result.factorBreakdown.nearbyComplaints.score).toBe(100);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("reaches CRITICAL for a maximally severe combination", () => {
    const result = assessRisk({
      detections: [{ className: "net", bboxAreaPx: 500_000 }],
      imageAreaPx: 640 * 640,
      nearbyComplaintCount: 10,
      complaintAgeDays: 60,
    });
    expect(result.level).toBe("CRITICAL");
  });
});
