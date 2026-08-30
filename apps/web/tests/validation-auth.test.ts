import { describe, expect, it } from "vitest";

import { deleteAccountRequestSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validation/auth";

describe("registerSchema", () => {
  const valid = {
    fullName: "Asha Verma",
    email: "asha@example.com",
    phone: "+91-9000090000",
    password: "Passw0rd1",
  };

  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("lowercases and trims email", () => {
    const result = registerSchema.safeParse({ ...valid, email: "  Asha@Example.com  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("asha@example.com");
  });

  it("rejects a password with no digit", () => {
    expect(registerSchema.safeParse({ ...valid, password: "onlyletters" }).success).toBe(false);
  });

  it("rejects a password with no letter", () => {
    expect(registerSchema.safeParse({ ...valid, password: "12345678" }).success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(registerSchema.safeParse({ ...valid, password: "Ab1" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(registerSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("allows an empty phone", () => {
    expect(registerSchema.safeParse({ ...valid, phone: "" }).success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ email: "a@example.com", password: "" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("requires a non-empty token", () => {
    expect(resetPasswordSchema.safeParse({ token: "", password: "Passw0rd1" }).success).toBe(false);
  });
});

describe("deleteAccountRequestSchema", () => {
  it("requires a non-empty password", () => {
    expect(deleteAccountRequestSchema.safeParse({ currentPassword: "" }).success).toBe(false);
  });

  it("accepts a non-empty password", () => {
    expect(deleteAccountRequestSchema.safeParse({ currentPassword: "whatever" }).success).toBe(true);
  });
});
