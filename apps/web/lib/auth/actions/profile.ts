"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import type { AuthActionState } from "@/lib/auth/action-state";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";
import { generateRawToken, hashToken } from "@/lib/auth/tokens";
import { findUserById } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email/auth-emails";
import { changePasswordSchema, deleteAccountRequestSchema, updateProfileSchema } from "@/lib/validation/auth";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function updateProfileAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const parsed = updateProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  await db
    .updateTable("users")
    .set({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone && parsed.data.phone.length > 0 ? parsed.data.phone : null,
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", session.user.id)
    .execute();

  revalidatePath("/profile");
  return { success: "Profile updated." };
}

export async function changePasswordAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const user = await findUserById(session.user.id);
  if (!user) return { error: "Account not found." };

  const valid = await verifyPassword(parsed.data.currentPassword, user.password_hash);
  if (!valid) return { error: "Current password is incorrect." };

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db
    .updateTable("users")
    .set({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .where("id", "=", session.user.id)
    .execute();

  return { success: "Password changed." };
}

export async function resendVerificationEmailAction(
  _prev: AuthActionState,
  _formData: FormData
): Promise<AuthActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const user = await findUserById(session.user.id);
  if (!user) return { error: "Account not found." };
  if (user.email_verified_at) return { success: "Your email is already verified." };

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
  await sendVerificationEmail(user.email, `${baseUrl}/verify-email?token=${rawToken}`);

  return { success: "Verification email sent." };
}

/**
 * CLAUDE.md §11 account-deletion request flow. Deliberately only records the
 * request (a durable, timestamped flag) rather than deleting/anonymizing
 * data immediately — actually acting on the request is an ops/admin process
 * out of scope here. Password confirmation required, same as
 * changePasswordAction, since this is a serious enough action to deserve
 * re-authentication rather than a single unconfirmed click.
 */
export async function requestAccountDeletionAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const parsed = deleteAccountRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const user = await findUserById(session.user.id);
  if (!user) return { error: "Account not found." };

  const valid = await verifyPassword(parsed.data.currentPassword, user.password_hash);
  if (!valid) return { error: "Password is incorrect." };

  await db
    .updateTable("users")
    .set({ deletion_requested_at: new Date().toISOString() })
    .where("id", "=", session.user.id)
    .execute();

  revalidatePath("/profile");
  return { success: "Account deletion requested. Contact support if you change your mind." };
}

export async function cancelAccountDeletionAction(
  _prev: AuthActionState,
  _formData: FormData
): Promise<AuthActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  await db
    .updateTable("users")
    .set({ deletion_requested_at: null })
    .where("id", "=", session.user.id)
    .execute();

  revalidatePath("/profile");
  return { success: "Deletion request cancelled." };
}
