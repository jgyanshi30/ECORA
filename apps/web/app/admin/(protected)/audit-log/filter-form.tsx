import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AdminUserOption } from "@/lib/admin/complaint-detail";

export interface AuditLogFilterFormProps {
  action?: string;
  actorId?: string;
  actions: string[];
  admins: AdminUserOption[];
}

/** Plain GET form, same progressive-enhancement pattern as the complaint management table's filter form. Submitting always resets to page 1 (no page field). */
export function AuditLogFilterForm({ action, actorId, actions, admins }: AuditLogFilterFormProps) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="action">Action</Label>
        <select
          id="action"
          name="action"
          defaultValue={action ?? ""}
          className="flex h-9 w-56 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="actorId">Admin</Label>
        <select
          id="actorId"
          name="actorId"
          defaultValue={actorId ?? ""}
          className="flex h-9 w-56 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
        >
          <option value="">All admins</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="outline">
        Apply
      </Button>
      {(action || actorId) && (
        <Button asChild variant="ghost">
          <Link href="/admin/audit-log">Clear</Link>
        </Button>
      )}
    </form>
  );
}
