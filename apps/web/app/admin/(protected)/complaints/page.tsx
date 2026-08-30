import type { Metadata } from "next";
import Link from "next/link";
import { isComplaintStatus } from "@ecora/shared";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/domain/empty-state";
import { getAdminComplaintsPage, type AdminComplaintSort, type SortOrder } from "@/lib/admin/complaints";

import { AdminFilterForm } from "./filter-form";
import { ComplaintTable } from "./complaint-table";
import { Pagination } from "./pagination";

export const metadata: Metadata = { title: "Manage complaints — Ecora admin" };

const SORT_VALUES: AdminComplaintSort[] = ["created_at", "status", "complaint_number"];

// Next.js 16: searchParams is a Promise — must be awaited, never read synchronously.
export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; order?: string; page?: string }>;
}) {
  const raw = await searchParams;
  const status = raw.status && isComplaintStatus(raw.status) ? raw.status : undefined;
  const sort = raw.sort && (SORT_VALUES as string[]).includes(raw.sort) ? (raw.sort as AdminComplaintSort) : undefined;
  const order = raw.order === "asc" || raw.order === "desc" ? (raw.order as SortOrder) : undefined;
  const page = raw.page ? Math.max(1, parseInt(raw.page, 10) || 1) : 1;

  const result = await getAdminComplaintsPage({ q: raw.q, status, sort, order, page });

  return (
    <main className="container flex flex-col gap-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Manage complaints</h1>
        <Button asChild variant="outline">
          <Link href="/admin">Back to overview</Link>
        </Button>
      </div>

      <AdminFilterForm q={raw.q} status={status} sort={sort} order={order} />

      {result.rows.length === 0 ? (
        <EmptyState
          title="No complaints match these filters"
          description="Try a different search term, status, or clear your filters."
        />
      ) : (
        <>
          <ComplaintTable rows={result.rows} />
          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            totalCount={result.totalCount}
            searchParams={{ q: raw.q, status: raw.status, sort: raw.sort, order: raw.order }}
          />
        </>
      )}
    </main>
  );
}
