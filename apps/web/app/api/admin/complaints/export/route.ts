import { isComplaintStatus } from "@ecora/shared";
import { NextResponse, type NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import type { AdminComplaintSort, SortOrder } from "@/lib/admin/complaints";
import { getClientIp } from "@/lib/request-ip";
import { generateComplaintsCsvReport } from "@/lib/reports/csv";

const SORT_VALUES: AdminComplaintSort[] = ["created_at", "status", "complaint_number"];

/** GET /api/admin/complaints/export — same filters as the management table, exported as CSV (CLAUDE.md §5 admin capability). */
export async function GET(request: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const ip = await getClientIp();
  if (!checkRateLimit(`admin-export:${ip}`, 10, 15 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many export requests. Wait a few minutes and try again." }, { status: 429 });
  }

  const params = request.nextUrl.searchParams;
  const rawStatus = params.get("status") ?? undefined;
  const rawSort = params.get("sort") ?? undefined;
  const rawOrder = params.get("order") ?? undefined;

  // Optional region bounds from the admin map's "export complaints in this
  // region" (CLAUDE.md §9) — only applied when all four are present and
  // numeric, otherwise ignored (falls back to the unfiltered/status-filtered export).
  const boundsParams = ["minLat", "maxLat", "minLng", "maxLng"].map((k) => Number(params.get(k)));
  const bounds =
    boundsParams.every((n) => Number.isFinite(n)) && params.get("minLat") !== null
      ? { minLat: boundsParams[0]!, maxLat: boundsParams[1]!, minLng: boundsParams[2]!, maxLng: boundsParams[3]! }
      : undefined;

  const csv = await generateComplaintsCsvReport({
    q: params.get("q") ?? undefined,
    status: rawStatus && isComplaintStatus(rawStatus) ? rawStatus : undefined,
    sort: rawSort && (SORT_VALUES as string[]).includes(rawSort) ? (rawSort as AdminComplaintSort) : undefined,
    order: rawOrder === "asc" || rawOrder === "desc" ? (rawOrder as SortOrder) : undefined,
    bounds,
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="complaints-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
