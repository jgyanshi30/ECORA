import { isComplaintStatus, type ComplaintStatus } from "@ecora/shared";

import { db } from "@/lib/db";

export interface CitizenComplaintRow {
  id: string;
  complaintNumber: string;
  status: ComplaintStatus;
  createdAt: Date;
  locality: string | null;
  city: string | null;
}

export interface CitizenDashboardFilters {
  status?: ComplaintStatus;
  q?: string;
}

/** Every query here is scoped to citizen_id — a citizen can only ever see their own complaints (CLAUDE.md §0 role/data boundary). */
export async function getCitizenComplaints(
  citizenId: string,
  filters: CitizenDashboardFilters = {}
): Promise<CitizenComplaintRow[]> {
  let query = db
    .selectFrom("complaints")
    .innerJoin("locations", "locations.id", "complaints.location_id")
    .select([
      "complaints.id",
      "complaints.complaint_number",
      "complaints.status",
      "complaints.created_at",
      "locations.locality",
      "locations.city",
    ])
    .where("complaints.citizen_id", "=", citizenId);

  if (filters.status) {
    query = query.where("complaints.status", "=", filters.status);
  }
  if (filters.q && filters.q.trim().length > 0) {
    const term = `%${filters.q.trim()}%`;
    query = query.where((eb) =>
      eb.or([eb("complaints.complaint_number", "ilike", term), eb("complaints.description", "ilike", term)])
    );
  }

  const rows = await query.orderBy("complaints.created_at", "desc").execute();

  return rows.map((row) => {
    if (!isComplaintStatus(row.status)) {
      throw new Error(`Unexpected complaint status in DB: ${row.status}`);
    }
    return {
      id: row.id,
      complaintNumber: row.complaint_number,
      status: row.status,
      createdAt: row.created_at,
      locality: row.locality,
      city: row.city,
    };
  });
}

/** Status -> count, over ALL of the citizen's complaints (unfiltered — the counts row is a fixed overview, not affected by search/filter). */
export async function getCitizenStatusCounts(citizenId: string): Promise<Record<ComplaintStatus, number>> {
  const rows = await db
    .selectFrom("complaints")
    .select(["status", (eb) => eb.fn.countAll().as("count")])
    .where("citizen_id", "=", citizenId)
    .groupBy("status")
    .execute();

  const counts = {} as Record<ComplaintStatus, number>;
  for (const row of rows) {
    if (isComplaintStatus(row.status)) {
      counts[row.status] = Number(row.count);
    }
  }
  return counts;
}

export interface ComplaintUpdateRow {
  message: string;
  createdAt: Date;
}

/**
 * Batched, not one query per complaint — the dashboard renders every listed
 * complaint's update timeline eagerly (a native <details> disclosure per
 * row, same zero-JS pattern as the landing page's FAQ), so this is called
 * once per page render with every complaint id already known and already
 * scoped to the citizen via getCitizenComplaints, not re-checked here.
 */
export async function getUpdatesForComplaints(
  complaintIds: string[]
): Promise<Map<string, ComplaintUpdateRow[]>> {
  const map = new Map<string, ComplaintUpdateRow[]>();
  if (complaintIds.length === 0) return map;

  const rows = await db
    .selectFrom("public_updates")
    .select(["complaint_id", "message", "created_at"])
    .where("complaint_id", "in", complaintIds)
    .orderBy("created_at", "asc")
    .execute();

  for (const row of rows) {
    const existing = map.get(row.complaint_id) ?? [];
    existing.push({ message: row.message, createdAt: row.created_at });
    map.set(row.complaint_id, existing);
  }
  return map;
}

export interface NotificationRow {
  id: string;
  message: string;
  createdAt: Date;
}

export async function getCitizenNotifications(userId: string, limit = 10): Promise<NotificationRow[]> {
  const rows = await db
    .selectFrom("notifications")
    .select(["id", "message", "created_at"])
    .where("user_id", "=", userId)
    .where("channel", "=", "in_app")
    .orderBy("created_at", "desc")
    .limit(limit)
    .execute();

  return rows.map((r) => ({ id: r.id, message: r.message, createdAt: r.created_at }));
}
