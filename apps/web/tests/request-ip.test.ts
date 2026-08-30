import { describe, expect, it } from "vitest";

import { ipForStorage } from "@/lib/request-ip";

describe("ipForStorage", () => {
  it("passes through a valid IPv4 address", () => {
    expect(ipForStorage("203.0.113.7")).toBe("203.0.113.7");
  });

  it("passes through a valid IPv6 address", () => {
    expect(ipForStorage("2001:db8::1")).toBe("2001:db8::1");
  });

  it('returns null for the "unknown" sentinel', () => {
    expect(ipForStorage("unknown")).toBeNull();
  });

  it("returns null for a malformed/spoofed value rather than throwing (would otherwise reject an INET insert)", () => {
    expect(ipForStorage("bulk-test-ip-0.7033157770606748")).toBeNull();
    expect(ipForStorage("not-an-ip-at-all")).toBeNull();
    expect(ipForStorage("")).toBeNull();
  });
});
