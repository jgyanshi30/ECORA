import { db } from "@/lib/db";

/**
 * CLAUDE.md §5/§11: "AuditLogs records every admin mutation ... with
 * actor, timestamp, before/after." Every row in this codebase so far has
 * entity_type = "complaint" and entity_id = a complaints.id (confirmed by
 * grepping every insertInto("audit_logs") call site) — this view joins to
 * complaints on that assumption via a LEFT JOIN, so a future entity_type
 * this doesn't cover degrades to "no linked complaint" instead of silently
 * excluding the row.
 */
export interface AdminAuditLogRow {
  id: string;
  action: string;
  entityType: string;
  actorId: string | null;
  actorName: string | null;
  complaintNumber: string | null;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  createdAt: Date;
}

export interface AdminAuditLogFilters {
  action?: string;
  actorId?: string;
  page?: number;
}

const PAGE_SIZE = 50;

export interface AdminAuditLogPage {
  rows: AdminAuditLogRow[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export async function getAdminAuditLogPage(filters: AdminAuditLogFilters): Promise<AdminAuditLogPage> {
  const page = Math.max(1, filters.page ?? 1);

  let base = db
    .selectFrom("audit_logs")
    .leftJoin("users", "users.id", "audit_logs.actor_id")
    .leftJoin("complaints", (join) =>
      join.onRef("complaints.id", "=", "audit_logs.entity_id").on("audit_logs.entity_type", "=", "complaint")
    );

  if (filters.action) {
    base = base.where("audit_logs.action", "=", filters.action);
  }
  if (filters.actorId) {
    base = base.where("audit_logs.actor_id", "=", filters.actorId);
  }

  const [rows, countRow] = await Promise.all([
    base
      .select([
        "audit_logs.id",
        "audit_logs.action",
        "audit_logs.entity_type",
        "audit_logs.actor_id",
        "users.full_name as actor_name",
        "complaints.complaint_number",
        "audit_logs.before",
        "audit_logs.after",
        "audit_logs.ip_address",
        "audit_logs.created_at",
      ])
      .orderBy("audit_logs.created_at", "desc")
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE)
      .execute(),
    base.select((eb) => eb.fn.countAll().as("count")).executeTakeFirstOrThrow(),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entity_type,
      actorId: r.actor_id,
      actorName: r.actor_name,
      complaintNumber: r.complaint_number,
      before: r.before,
      after: r.after,
      ipAddress: r.ip_address,
      createdAt: r.created_at,
    })),
    totalCount: Number(countRow.count),
    page,
    pageSize: PAGE_SIZE,
  };
}

/** Populates the action filter dropdown from what's actually in the DB, not a hardcoded list that can drift as new admin actions are added elsewhere. */
export async function getDistinctAuditActions(): Promise<string[]> {
  const rows = await db.selectFrom("audit_logs").select("action").distinct().orderBy("action", "asc").execute();
  return rows.map((r) => r.action);
}
