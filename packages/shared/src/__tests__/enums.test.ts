import { describe, expect, it } from "vitest";
import {
  COMPLAINT_STATUSES,
  ComplaintStatus,
  isComplaintStatus,
  ROLES,
  Role,
  isRole,
  RISK_LEVELS,
  RiskLevel,
  isRiskLevel,
} from "../index.js";

describe("ComplaintStatus", () => {
  it("matches the exact canonical lifecycle from CLAUDE.md §3", () => {
    expect(COMPLAINT_STATUSES).toEqual([
      "SUBMITTED",
      "AI_ANALYSIS_PENDING",
      "UNDER_REVIEW",
      "ASSIGNED",
      "ACTION_IN_PROGRESS",
      "RESOLVED",
      "CLOSED",
      "REJECTED_DUPLICATE",
    ]);
  });

  it("isComplaintStatus narrows correctly", () => {
    expect(isComplaintStatus("UNDER_REVIEW")).toBe(true);
    expect(isComplaintStatus("under_review")).toBe(false);
    expect(isComplaintStatus("BOGUS")).toBe(false);
  });

  it("values are stable strings (safe to persist/compare)", () => {
    expect(ComplaintStatus.AI_ANALYSIS_PENDING).toBe("AI_ANALYSIS_PENDING");
  });
});

describe("Role", () => {
  it("only has citizen and admin", () => {
    expect([...ROLES].sort()).toEqual(["admin", "citizen"]);
  });

  it("isRole narrows correctly", () => {
    expect(isRole(Role.ADMIN)).toBe(true);
    expect(isRole("superadmin")).toBe(false);
  });
});

describe("RiskLevel", () => {
  it("matches the exact levels from CLAUDE.md §7", () => {
    expect(RISK_LEVELS).toEqual(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
  });

  it("isRiskLevel narrows correctly", () => {
    expect(isRiskLevel("CRITICAL")).toBe(true);
    expect(isRiskLevel("critical")).toBe(false);
  });
});
