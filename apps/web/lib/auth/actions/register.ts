"use server";

import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import type { AuthActionState } from "@/lib/auth/action-state";
import { hashPassword } from "@/lib/auth/passwords";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { generateRawToken, hashToken } from "@/lib/auth/tokens";
import { createCitizenUser, findUserByEmail } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email/auth-emails";
import { getClientIp } from "@/lib/request-ip";
import { registerSchema } from "@/lib/validation/auth";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function registerAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const ip = await getClientIp();
  const rateLimit = checkRateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return { error: "Too many registration attempts. Try again in a few minutes." };
  }

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { email, password, fullName, phone } = parsed.data;

  const existing = await findUserByEmail(email);
  if (existing) {
    // Same generic message either way — don't confirm/deny account existence to an unauthenticated caller.
    return { error: "Could not create an account with those details." };
  }

  const passwordHash = await hashPassword(password);
  const user = await createCitizenUser({
    email,
    passwordHash,
    fullName,
    phone: phone && phone.length > 0 ? phone : null,
  });

  const rawToken = generateRawToken();
  await db
    .insertInto("email_verification_tokens")
    .values({
      user_id: user.id,
      token_hash: hashToken(rawToken),
      expires_at: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS).toISOString(),
    })
    .execute();

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  await sendVerificationEmail(email, `${baseUrl}/verify-email?token=${rawToken}`);

  await signIn("credentials", { email, password, redirect: false });
  redirect("/");
}
