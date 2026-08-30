import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/domain/empty-state";
import { getAdminAuditLogPage, getDistinctAuditActions } from "@/lib/admin/audit-log";
import { getAdminUserOptions } from "@/lib/admin/complaint-detail";

import { AuditLogFilterForm } from "./filter-form";
import { Pagination } from "./pagination";

export const metadata: Metadata = { title: "Audit log — Ecora admin" };

// Real DB query every request — an audit trail showing a stale, build-time
// snapshot would defeat the point of an audit trail (see PROGRESS.md's
// step-5 entry on the same static-prerendering trap for other admin pages).
export const dynamic = "force-dynamic";

/**
 * CLAUDE.md §5/§11: "AuditLogs records every admin mutation ... "
 * Every other admin page only ever showed this per-complaint
 * (lib/admin/complaint-detail.ts's per-complaint query); this is the
 * first cross-complaint view — see the "not verified" list this closes
 * out in PROGRESS.md.
 */
export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; actorId?: string; page?: string }>;
}) {
  const raw = await searchParams;
  const page = raw.page ? Math.max(1, parseInt(raw.page, 10) || 1) : 1;

  const [result, actions, admins] = await Promise.all([
    getAdminAuditLogPage({ action: raw.action, actorId: raw.actorId, page }),
    getDistinctAuditActions(),
    getAdminUserOptions(),
  ]);

  return (
    <main className="container flex flex-col gap-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Audit log</h1>
        <Button asChild variant="outline">
          <Link href="/admin">Back to overview</Link>
        </Button>
      </div>

      <AuditLogFilterForm action={raw.action} actorId={raw.actorId} actions={actions} admins={admins} />

      {result.rows.length === 0 ? (
        <EmptyState
          title="No audited actions match these filters"
          description="Try a different action or admin, or clear your filters."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">When</th>
                  <th className="p-2">Action</th>
                  <th className="p-2">Admin</th>
                  <th className="p-2">Complaint</th>
                  <th className="p-2">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="p-2 align-top whitespace-nowrap text-muted-foreground">{r.createdAt.toLocaleString()}</td>
                    <td className="p-2 align-top font-medium">{r.action.replaceAll("_", " ")}</td>
                    <td className="p-2 align-top">{r.actorName ?? "System"}</td>
                    <td className="p-2 align-top">
                      {r.complaintNumber ? (
                        <Link href={`/admin/complaints/${encodeURIComponent(r.complaintNumber)}`} className="hover:underline">
                          {r.complaintNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-2 align-top">
                      {(r.before !== null || r.after !== null) && (
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer">before / after</summary>
                          <pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify({ before: r.before, after: r.after }, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            totalCount={result.totalCount}
            searchParams={{ action: raw.action, actorId: raw.actorId }}
          />
        </>
      )}
    </main>
  );
}
