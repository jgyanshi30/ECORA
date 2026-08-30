import { NextResponse } from "next/server";
import type { Session } from "next-auth";

import { auth } from "@/auth";

/**
 * Route-handler-level check, independent of proxy.ts (CLAUDE.md §0:
 * "structurally incapable", never a single enforcement point). Every
 * /api/admin/** route handler must call this before doing anything else.
 */
export async function requireAdminApi(): Promise<
  { ok: true; session: Session } | { ok: false; response: NextResponse }
> {
  const session = await auth();

  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden — admin access required" }, { status: 403 }),
    };
  }
  return { ok: true, session };
}

/**
 * Same boundary as requireAdminApi, but for server actions — those don't
 * have a NextResponse to return, so a plain string error is the failure
 * shape instead. Every admin-mutating server action must call this first
 * (CLAUDE.md §0: never a single enforcement point).
 */
export async function requireAdminAction(): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const session = await auth();

  if (!session?.user) {
    return { ok: false, error: "You must be signed in." };
  }
  if (session.user.role !== "admin") {
    return { ok: false, error: "Forbidden — admin access required." };
  }
  return { ok: true, session };
}
