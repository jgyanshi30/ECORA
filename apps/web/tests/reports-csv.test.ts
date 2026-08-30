import { describe, expect, it } from "vitest";

import type { AdminComplaintRow } from "@/lib/admin/complaints";
import { buildComplaintsCsv } from "@/lib/reports/csv";

function makeRow(overrides: Partial<AdminComplaintRow> = {}): AdminComplaintRow {
  return {
    id: "id-1",
    complaintNumber: "CLN-20260101-AAAAAA",
    status: "SUBMITTED",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    citizenName: "Test Citizen",
    citizenEmail: "citizen@example.com",
    locality: "Colaba",
    city: "Mumbai",
    state: "Maharashtra",
    ...overrides,
  };
}

describe("buildComplaintsCsv", () => {
  it("includes a header row and one line per complaint", () => {
    const csv = buildComplaintsCsv([makeRow()]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Complaint Number,Status,Citizen Name,Citizen Email,Locality,City,State,Submitted At");
    expect(lines[1]).toContain("CLN-20260101-AAAAAA");
    expect(lines).toHaveLength(2);
  });

  it("escapes fields containing commas, quotes, or newlines", () => {
    const csv = buildComplaintsCsv([makeRow({ citizenName: 'Citizen, "The Reporter"\nSecond line' })]);
    const dataLine = csv.split("\n").slice(1).join("\n");
    expect(dataLine).toContain('"Citizen, ""The Reporter""');
  });

  it("renders null locality/city/state as empty fields, not the string \"null\"", () => {
    const csv = buildComplaintsCsv([makeRow({ locality: null, city: null, state: null })]);
    const dataLine = csv.split("\n")[1]!;
    expect(dataLine).not.toMatch(/null/i);
    expect(dataLine.split(",")).toContain("");
  });
});
