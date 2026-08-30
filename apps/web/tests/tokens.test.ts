import { describe, expect, it } from "vitest";

import { generateRawToken, hashToken } from "@/lib/auth/tokens";

describe("generateRawToken", () => {
  it("produces a 64-char hex string (32 bytes)", () => {
    const token = generateRawToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is different on every call", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateRawToken()));
    expect(tokens.size).toBe(100);
  });
});

describe("hashToken", () => {
  it("is deterministic", () => {
    const raw = generateRawToken();
    expect(hashToken(raw)).toBe(hashToken(raw));
  });

  it("never equals the raw token (never stores it verbatim)", () => {
    const raw = generateRawToken();
    expect(hashToken(raw)).not.toBe(raw);
  });

  it("different tokens hash differently", () => {
    expect(hashToken(generateRawToken())).not.toBe(hashToken(generateRawToken()));
  });
});
