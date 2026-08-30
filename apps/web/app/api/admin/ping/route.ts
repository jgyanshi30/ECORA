import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/guards";

/**
 * Minimal real admin-only API endpoint — exists to prove the role boundary
 * server-side (CLAUDE.md §0), not to serve product data yet. Real admin
 * endpoints (assignments, risk overrides, etc.) land in later phases and
 * must call requireAdminApi() the same way.
 */
export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  return NextResponse.json({ ok: true, adminEmail: guard.session.user.email });
}
