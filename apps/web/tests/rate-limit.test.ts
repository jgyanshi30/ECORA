import { describe, expect, it } from "vitest";

import { checkRateLimit } from "@/lib/auth/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests up to the limit, then blocks", () => {
    const key = `test-key-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60_000).allowed).toBe(true);
    }
    const sixth = checkRateLimit(key, 5, 60_000);
    expect(sixth.allowed).toBe(false);
    expect(sixth.remaining).toBe(0);
  });

  it("tracks separate keys independently", () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    expect(checkRateLimit(keyA, 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit(keyA, 1, 60_000).allowed).toBe(false);
    // keyB has its own independent bucket
    expect(checkRateLimit(keyB, 1, 60_000).allowed).toBe(true);
  });

  it("resets after the window elapses", async () => {
    const key = `test-window-${Math.random()}`;
    expect(checkRateLimit(key, 1, 50).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 50).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(checkRateLimit(key, 1, 50).allowed).toBe(true);
  });
});
