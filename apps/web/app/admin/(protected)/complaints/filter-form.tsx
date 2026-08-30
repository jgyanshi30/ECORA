import { COMPLAINT_STATUSES, type ComplaintStatus } from "@ecora/shared";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminComplaintSort, SortOrder } from "@/lib/admin/complaints";

export interface AdminFilterFormProps {
  q?: string;
  status?: ComplaintStatus;
  sort?: AdminComplaintSort;
  order?: SortOrder;
}

/** Plain GET form — no client JS needed, same progressive-enhancement pattern as the citizen dashboard's filter form. Submitting always resets to page 1 (no page field). */
export function AdminFilterForm({ q, status, sort, order }: AdminFilterFormProps) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="q">Search</Label>
        <Input id="q" name="q" placeholder="Number, description, citizen" defaultValue={q ?? ""} className="w-64" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={status ?? ""}
          className="flex h-9 w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
        >
          <option value="">All statuses</option>
          {COMPLAINT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sort">Sort by</Label>
        <select
          id="sort"
          name="sort"
          defaultValue={sort ?? "created_at"}
          className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
        >
          <option value="created_at">Date submitted</option>
          <option value="status">Status</option>
          <option value="complaint_number">Complaint number</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="order">Order</Label>
        <select
          id="order"
          name="order"
          defaultValue={order ?? "desc"}
          className="flex h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>
      <Button type="submit" variant="outline">
        Apply
      </Button>
      {(q || status) && (
        <Button asChild variant="ghost">
          <Link href="/admin/complaints">Clear</Link>
        </Button>
      )}
    </form>
  );
}
