import type { AdminComplaintFilters, AdminComplaintRow } from "@/lib/admin/complaints";
import { getAllAdminComplaintsForExport } from "@/lib/admin/complaints";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const CSV_HEADER = ["Complaint Number", "Status", "Citizen Name", "Citizen Email", "Locality", "City", "State", "Submitted At"];

/** Shared by the instant CSV export (/api/admin/complaints/export) and the tracked "saved report" flow — one place that decides the CSV shape, so the two never drift apart. */
export function buildComplaintsCsv(rows: AdminComplaintRow[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.complaintNumber,
        row.status,
        row.citizenName,
        row.citizenEmail,
        row.locality ?? "",
        row.city ?? "",
        row.state ?? "",
        row.createdAt.toISOString(),
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\n");
}

export async function generateComplaintsCsvReport(filters: AdminComplaintFilters): Promise<string> {
  const rows = await getAllAdminComplaintsForExport(filters);
  return buildComplaintsCsv(rows);
}
