import { isComplaintStatus, type ComplaintStatus } from "@ecora/shared";

import { db } from "@/lib/db";

export interface PublicComplaintView {
  complaintNumber: string;
  status: ComplaintStatus;
  description: string | null;
  createdAt: Date;
  locality: string | null;
  city: string | null;
  state: string | null;
  updates: { message: string; createdAt: Date }[];
}

/**
 * Public, unauthenticated lookup by complaint number (CLAUDE.md §4: the
 * cryptographically random suffix is explicitly designed so knowing a number
 * doesn't let you enumerate others — knowing one is treated as sufficient to
 * read its public status, the same trust model as a shipment tracking
 * number). Only ever selects citizen/public-safe columns — never citizen_id,
 * exact geog, admin notes, or risk detail (CLAUDE.md §0, §5).
 */
export async function findPublicComplaintByNumber(complaintNumber: string): Promise<PublicComplaintView | null> {
  const complaint = await db
    .selectFrom("complaints")
    .innerJoin("locations", "locations.id", "complaints.location_id")
    .select([
      "complaints.id",
      "complaints.complaint_number",
      "complaints.status",
      "complaints.description",
      "complaints.created_at",
      "locations.locality",
      "locations.city",
      "locations.state",
    ])
    .where("complaints.complaint_number", "=", complaintNumber)
    .executeTakeFirst();

  if (!complaint) return null;

  const updates = await db
    .selectFrom("public_updates")
    .select(["message", "created_at"])
    .where("complaint_id", "=", complaint.id)
    .orderBy("created_at", "asc")
    .execute();

  if (!isComplaintStatus(complaint.status)) {
    throw new Error(`Unexpected complaint status in DB: ${complaint.status}`);
  }

  return {
    complaintNumber: complaint.complaint_number,
    status: complaint.status,
    description: complaint.description,
    createdAt: complaint.created_at,
    locality: complaint.locality,
    city: complaint.city,
    state: complaint.state,
    updates: updates.map((u) => ({ message: u.message, createdAt: u.created_at })),
  };
}
