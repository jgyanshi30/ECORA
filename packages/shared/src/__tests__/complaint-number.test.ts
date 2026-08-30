import { describe, expect, it } from "vitest";
import {
  COMPLAINT_NUMBER_REGEX,
  formatComplaintNumber,
  formatDateStamp,
  generateComplaintNumberCandidate,
  generateComplaintNumberSuffix,
  isValidComplaintNumber,
} from "../index.js";

describe("complaint number format", () => {
  it("accepts the exact example from CLAUDE.md §4", () => {
    expect(isValidComplaintNumber("CLN-20260829-A4B721")).toBe(true);
  });

  it("rejects malformed values", () => {
    expect(isValidComplaintNumber("cln-20260829-a4b721")).toBe(false); // lowercase
    expect(isValidComplaintNumber("CLN-2026829-A4B721")).toBe(false); // short date
    expect(isValidComplaintNumber("CLN-20260829-A4B72")).toBe(false); // short suffix
    expect(isValidComplaintNumber("CLN-20260829-A4B7212")).toBe(false); // long suffix
    expect(isValidComplaintNumber("CLX-20260829-A4B721")).toBe(false); // wrong prefix
  });

  it("formatDateStamp zero-pads and uses UTC", () => {
    expect(formatDateStamp(new Date(Date.UTC(2026, 0, 5)))).toBe("20260105");
  });

  it("formatComplaintNumber composes prefix + date + suffix", () => {
    const date = new Date(Date.UTC(2026, 7, 29));
    expect(formatComplaintNumber(date, "A4B721")).toBe("CLN-20260829-A4B721");
  });

  it("formatComplaintNumber rejects an invalid suffix", () => {
    expect(() => formatComplaintNumber(new Date(), "abc")).toThrow();
    expect(() => formatComplaintNumber(new Date(), "abcdef")).toThrow(); // lowercase
  });
});

describe("generateComplaintNumberSuffix", () => {
  it("produces a 6-char uppercase alphanumeric suffix", () => {
    for (let i = 0; i < 200; i++) {
      const suffix = generateComplaintNumberSuffix();
      expect(suffix).toMatch(/^[A-Z0-9]{6}$/);
    }
  });

  it("has reasonable entropy (no obvious repetition across many draws)", () => {
    const draws = new Set(Array.from({ length: 500 }, () => generateComplaintNumberSuffix()));
    // birthday-bound collisions are possible but should be rare across 500 draws
    // from a 36^6 (~2.2B) space; require overwhelming majority uniqueness.
    expect(draws.size).toBeGreaterThan(495);
  });
});

describe("generateComplaintNumberCandidate", () => {
  it("produces a value that passes the format regex", () => {
    const candidate = generateComplaintNumberCandidate();
    expect(candidate).toMatch(COMPLAINT_NUMBER_REGEX);
    expect(isValidComplaintNumber(candidate)).toBe(true);
  });
});
