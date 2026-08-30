import { COMPLAINT_STATUSES, isComplaintStatus, type ComplaintStatus } from "@ecora/shared";
import { sql } from "kysely";

import { db } from "@/lib/db";
import type { MapBounds } from "@/lib/admin/map";

/** Every count bucket in CLAUDE.md §3's canonical lifecycle, defaulting to 0 so the UI never has to guard for a missing key. */
export async function getAdminStatusCounts(): Promise<Record<ComplaintStatus, number>> {
  const rows = await db.selectFrom("complaints").select(["status", (eb) => eb.fn.countAll().as("count")]).groupBy("status").execute();

  const counts = Object.fromEntries(COMPLAINT_STATUSES.map((s) => [s, 0])) as Record<ComplaintStatus, number>;
  for (const row of rows) {
    if (isComplaintStatus(row.status)) counts[row.status] = Number(row.count);
  }
  return counts;
}

export interface AdminComplaintRow {
  id: string;
  complaintNumber: string;
  status: ComplaintStatus;
  createdAt: Date;
  citizenName: string;
  citizenEmail: string;
  locality: string | null;
  city: string | null;
  state: string | null;
}

export type AdminComplaintSort = "created_at" | "status" | "complaint_number";
export type SortOrder = "asc" | "desc";

export interface AdminComplaintFilters {
  q?: string;
  status?: ComplaintStatus;
  sort?: AdminComplaintSort;
  order?: SortOrder;
  /** Region-select from the admin map (CLAUDE.md §9: "export complaints in this region" is admin-only) — only ever applied by the export path, not the paginated table. */
  bounds?: MapBounds;
}

const SORT_COLUMN: Record<AdminComplaintSort, "complaints.created_at" | "complaints.status" | "complaints.complaint_number"> = {
  created_at: "complaints.created_at",
  status: "complaints.status",
  complaint_number: "complaints.complaint_number",
};

const PAGE_SIZE = 25;

export interface AdminComplaintsPage {
  rows: AdminComplaintRow[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export async function getAdminComplaintsPage(
  filters: AdminComplaintFilters & { page?: number }
): Promise<AdminComplaintsPage> {
  const page = Math.max(1, filters.page ?? 1);
  const sortColumn = SORT_COLUMN[filters.sort ?? "created_at"];
  const order = filters.order ?? "desc";

  let base = db
    .selectFrom("complaints")
    .innerJoin("users", "users.id", "complaints.citizen_id")
    .innerJoin("locations", "locations.id", "complaints.location_id");

  if (filters.status) {
    base = base.where("complaints.status", "=", filters.status);
  }
  if (filters.q && filters.q.trim().length > 0) {
    const term = `%${filters.q.trim()}%`;
    base = base.where((eb) =>
      eb.or([
        eb("complaints.complaint_number", "ilike", term),
        eb("complaints.description", "ilike", term),
        eb("users.email", "ilike", term),
        eb("users.full_name", "ilike", term),
      ])
    );
  }

  const [rows, countRow] = await Promise.all([
    base
      .select([
        "complaints.id",
        "complaints.complaint_number",
        "complaints.status",
        "complaints.created_at",
        "users.full_name",
        "users.email",
        "locations.locality",
        "locations.city",
        "locations.state",
      ])
      .orderBy(sortColumn, order)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE)
      .execute(),
    base.select((eb) => eb.fn.countAll().as("count")).executeTakeFirstOrThrow(),
  ]);

  return {
    rows: rows.map((row) => {
      if (!isComplaintStatus(row.status)) throw new Error(`Unexpected complaint status in DB: ${row.status}`);
      return {
        id: row.id,
        complaintNumber: row.complaint_number,
        status: row.status,
        createdAt: row.created_at,
        citizenName: row.full_name,
        citizenEmail: row.email,
        locality: row.locality,
        city: row.city,
        state: row.state,
      };
    }),
    totalCount: Number(countRow.count),
    page,
    pageSize: PAGE_SIZE,
  };
}

/** Same filters as the paginated table, no limit — used by the CSV export so "export what you're viewing" is exact. */
export async function getAllAdminComplaintsForExport(filters: AdminComplaintFilters): Promise<AdminComplaintRow[]> {
  let base = db
    .selectFrom("complaints")
    .innerJoin("users", "users.id", "complaints.citizen_id")
    .innerJoin("locations", "locations.id", "complaints.location_id");

  if (filters.status) {
    base = base.where("complaints.status", "=", filters.status);
  }
  if (filters.q && filters.q.trim().length > 0) {
    const term = `%${filters.q.trim()}%`;
    base = base.where((eb) =>
      eb.or([
        eb("complaints.complaint_number", "ilike", term),
        eb("complaints.description", "ilike", term),
        eb("users.email", "ilike", term),
        eb("users.full_name", "ilike", term),
      ])
    );
  }
  if (filters.bounds) {
    const { minLat, maxLat, minLng, maxLng } = filters.bounds;
    base = base.where(
      sql<boolean>`ST_Within(locations.geog::geometry, ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))`
    );
  }

  const sortColumn = SORT_COLUMN[filters.sort ?? "created_at"];
  const order = filters.order ?? "desc";

  const rows = await base
    .select([
      "complaints.id",
      "complaints.complaint_number",
      "complaints.status",
      "complaints.created_at",
      "users.full_name",
      "users.email",
      "locations.locality",
      "locations.city",
      "locations.state",
    ])
    .orderBy(sortColumn, order)
    .execute();

  return rows.map((row) => {
    if (!isComplaintStatus(row.status)) throw new Error(`Unexpected complaint status in DB: ${row.status}`);
    return {
      id: row.id,
      complaintNumber: row.complaint_number,
      status: row.status,
      createdAt: row.created_at,
      citizenName: row.full_name,
      citizenEmail: row.email,
      locality: row.locality,
      city: row.city,
      state: row.state,
    };
  });
}
