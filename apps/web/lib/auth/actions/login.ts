"use server";

import { CredentialsSignin } from "next-auth";
import { redirect } from "next/navigation";

import { RateLimitedSignin, signIn, signOut } from "@/auth";
import type { AuthActionState } from "@/lib/auth/action-state";
import { getClientIp } from "@/lib/request-ip";
import { RateLimitExceededError, verifyCredentials } from "@/lib/auth/verify-credentials";
import { loginSchema } from "@/lib/validation/auth";

export async function loginAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  try {
    // Rate limiting lives in auth.ts's authorize() — the one chokepoint every
    // credentials sign-in funnels through, including direct hits to
    // /api/auth/callback/credentials that would otherwise bypass this action.
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof RateLimitedSignin) {
      return { error: "Too many login attempts. Try again in a few minutes." };
    }
    if (error instanceof CredentialsSignin) {
      return { error: "Incorrect email or password." };
    }
    throw error;
  }

  redirect("/");
}

/**
 * Deliberately does NOT reuse loginAction's "call signIn, inspect the result"
 * shape. An earlier version signed in first and called signOut() if the role
 * wasn't admin — but signOut()'s cookie-clear didn't reliably take effect
 * within the same server-action response (confirmed by reproducing it: the
 * citizen's session cookie was still valid afterward). Checking the role
 * BEFORE ever establishing a session avoids the question entirely — a
 * non-admin session is simply never created by this action.
 */
export async function adminLoginAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const ip = await getClientIp();
  let user;
  try {
    user = await verifyCredentials(parsed.data.email, parsed.data.password, ip);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { error: "Too many login attempts. Try again in a few minutes." };
    }
    throw error;
  }

  if (!user) return { error: "Incorrect email or password." };
  if (user.role !== "admin") return { error: "This sign-in is for administrators only." };

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      return { error: "Incorrect email or password." };
    }
    throw error;
  }

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
