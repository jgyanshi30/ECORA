import { COMPLAINT_STATUSES, type ComplaintStatus } from "@ecora/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Plain GET form — no client JS needed, same progressive-enhancement pattern as app/track. */
export function FilterForm({ q, status }: { q?: string; status?: ComplaintStatus }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="q">Search</Label>
        <Input
          id="q"
          name="q"
          placeholder="Complaint number or description"
          defaultValue={q ?? ""}
          className="w-64"
        />
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
      <Button type="submit" variant="outline">
        Apply
      </Button>
      {(q || status) && (
        <Button asChild variant="ghost">
          <a href="/dashboard">Clear</a>
        </Button>
      )}
    </form>
  );
}
