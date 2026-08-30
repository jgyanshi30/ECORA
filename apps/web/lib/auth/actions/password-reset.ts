"use server";

import { redirect } from "next/navigation";

import type { AuthActionState } from "@/lib/auth/action-state";
import { hashPassword } from "@/lib/auth/passwords";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { generateRawToken, hashToken } from "@/lib/auth/tokens";
import { findUserByEmail } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email/auth-emails";
import { getClientIp } from "@/lib/request-ip";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validation/auth";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function forgotPasswordAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const ip = await getClientIp();
  const rateLimit = checkRateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return { error: "Too many requests. Try again in a few minutes." };
  }

  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  const user = await findUserByEmail(parsed.data.email);
  // Always report success — confirming/denying account existence to an
  // unauthenticated caller is its own information leak.
  if (user) {
    const rawToken = generateRawToken();
    await db
      .insertInto("password_reset_tokens")
      .values({
        user_id: user.id,
        token_hash: hashToken(rawToken),
        expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString(),
      })
      .execute();

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    await sendPasswordResetEmail(user.email, `${baseUrl}/reset-password?token=${rawToken}`);
  }

  return { success: "If that email has an account, a reset link is on its way." };
}

export async function resetPasswordAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const tokenHash = hashToken(parsed.data.token);
  const tokenRow = await db
    .selectFrom("password_reset_tokens")
    .selectAll()
    .where("token_hash", "=", tokenHash)
    .executeTakeFirst();

  if (!tokenRow || tokenRow.consumed_at || tokenRow.expires_at < new Date()) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("users")
      .set({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .where("id", "=", tokenRow.user_id)
      .execute();
    await trx
      .updateTable("password_reset_tokens")
      .set({ consumed_at: new Date().toISOString() })
      .where("id", "=", tokenRow.id)
      .execute();
  });

  redirect("/login?reset=success");
}
