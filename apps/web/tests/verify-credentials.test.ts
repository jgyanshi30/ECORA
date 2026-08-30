import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hashPassword } from "@/lib/auth/passwords";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { RateLimitExceededError, verifyCredentials } from "@/lib/auth/verify-credentials";
import { db } from "@/lib/db";

// Integration test against the real Postgres instance (infra/db docker-compose) —
// not mocked, since the whole point is proving the DB-backed auth check works.
const TEST_EMAIL = `verify-credentials-test-${Date.now()}@example.com`;
const TEST_PASSWORD = "CorrectPass1";
let userId: string;

beforeAll(async () => {
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const user = await db
    .insertInto("users")
    .values({
      email: TEST_EMAIL,
      password_hash: passwordHash,
      full_name: "Verify Credentials Test",
      role: "citizen",
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  userId = user.id;
});

afterAll(async () => {
  await db.deleteFrom("users").where("id", "=", userId).execute();
  await db.destroy();
});

describe("verifyCredentials", () => {
  it("returns the user for correct credentials", async () => {
    const user = await verifyCredentials(TEST_EMAIL, TEST_PASSWORD, `test-ip-${Math.random()}`);
    expect(user?.email).toBe(TEST_EMAIL);
  });

  it("returns null for an incorrect password", async () => {
    const user = await verifyCredentials(TEST_EMAIL, "WrongPassword1", `test-ip-${Math.random()}`);
    expect(user).toBeNull();
  });

  it("returns null for a nonexistent email", async () => {
    const user = await verifyCredentials("nobody@example.com", TEST_PASSWORD, `test-ip-${Math.random()}`);
    expect(user).toBeNull();
  });

  it("returns null for a deactivated account", async () => {
    const inactiveEmail = `inactive-${Date.now()}@example.com`;
    const passwordHash = await hashPassword(TEST_PASSWORD);
    const inactive = await db
      .insertInto("users")
      .values({
        email: inactiveEmail,
        password_hash: passwordHash,
        full_name: "Inactive Test",
        role: "citizen",
        is_active: false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const user = await verifyCredentials(inactiveEmail, TEST_PASSWORD, `test-ip-${Math.random()}`);
    expect(user).toBeNull();

    await db.deleteFrom("users").where("id", "=", inactive.id).execute();
  });

  it("throws RateLimitExceededError once the shared login:<ip> bucket is exhausted", async () => {
    const ip = `rate-limit-test-ip-${Math.random()}`;
    // This IS the same rate-limit key verifyCredentials itself checks
    // (login:<ip>) — exhaust it directly rather than looping 10 real calls.
    for (let i = 0; i < 10; i++) checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);

    await expect(verifyCredentials(TEST_EMAIL, TEST_PASSWORD, ip)).rejects.toThrow(RateLimitExceededError);
  });
});
