import { isComplaintStatus, type ComplaintStatus, type RiskLevel } from "@ecora/shared";
import { sql } from "kysely";

import { db } from "@/lib/db";
import { getTreatmentRecommendations } from "@/lib/admin/treatment-recommendations";
import { getSignedGetUrl } from "@/lib/storage/s3";

export interface AdminDetectionRow {
  id: string;
  className: string;
  confidence: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
  adminReviewed: boolean;
  adminRejected: boolean;
  adminCorrectedClassName: string | null;
  adminNote: string | null;
  adminReviewedByName: string | null;
  adminReviewedAt: Date | null;
  /** CLAUDE.md §8 — for the effective class (admin-corrected if set, else the AI-suggested class); null for a rejected detection, since there's no authoritative class left to recommend against. */
  treatmentRecommendation: string | null;
}

export interface AdminRiskAssessment {
  id: string;
  level: RiskLevel;
  score: number;
  factorBreakdown: unknown;
  isAdminOverride: boolean;
  overrideReason: string | null;
  overriddenByName: string | null;
  createdAt: Date;
}

export interface AdminNoteRow {
  id: string;
  note: string;
  adminName: string;
  createdAt: Date;
}

export interface AdminPublicUpdateRow {
  id: string;
  message: string;
  authorName: string | null;
  createdAt: Date;
}

export interface AdminStatusHistoryRow {
  fromStatus: ComplaintStatus | null;
  toStatus: ComplaintStatus;
  note: string | null;
  changedByName: string | null;
  createdAt: Date;
}

export interface AdminAuditLogRow {
  id: string;
  action: string;
  actorName: string | null;
  before: unknown;
  after: unknown;
  createdAt: Date;
}

export interface AdminAssignmentRow {
  assigneeName: string;
  assignedByName: string;
  note: string | null;
  assignedAt: Date;
  unassignedAt: Date | null;
}

export interface AdminComplaintDetail {
  id: string;
  complaintNumber: string;
  status: ComplaintStatus;
  createdAt: Date;
  updatedAt: Date;
  description: string | null;
  citizenId: string;
  citizenName: string;
  citizenEmail: string;
  citizenPhone: string | null;
  locality: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pinCode: string | null;
  landmark: string | null;
  lat: number | null;
  lng: number | null;
  accuracyMeters: number | null;
  originalPhotoUrls: string[];
  annotatedPhotoUrl: string | null;
  detections: AdminDetectionRow[];
  currentRisk: AdminRiskAssessment | null;
  riskHistory: AdminRiskAssessment[];
  adminNotes: AdminNoteRow[];
  publicUpdates: AdminPublicUpdateRow[];
  statusHistory: AdminStatusHistoryRow[];
  auditLog: AdminAuditLogRow[];
  currentAssignment: AdminAssignmentRow | null;
  assignmentHistory: AdminAssignmentRow[];
}

/**
 * Everything the admin complaint-review page needs, in one call. Unlike the
 * citizen-facing equivalents, this deliberately DOES select exact
 * coordinates and admin-only fields (admin_notes, audit_logs, risk factor
 * breakdown) — CLAUDE.md §0 makes exact GPS and admin notes admin-only, not
 * off-limits to admins. This function must never be imported from a
 * citizen-facing code path.
 */
export async function getAdminComplaintDetail(complaintNumber: string): Promise<AdminComplaintDetail | null> {
  const base = await db
    .selectFrom("complaints")
    .innerJoin("users", "users.id", "complaints.citizen_id")
    .innerJoin("locations", "locations.id", "complaints.location_id")
    .select([
      "complaints.id",
      "complaints.complaint_number",
      "complaints.status",
      "complaints.created_at",
      "complaints.updated_at",
      "complaints.description",
      "complaints.citizen_id",
      "users.full_name",
      "users.email",
      "users.phone",
      "locations.locality",
      "locations.city",
      "locations.district",
      "locations.state",
      "locations.pin_code",
      "locations.landmark",
      "locations.accuracy_meters",
    ])
    .where("complaints.complaint_number", "=", complaintNumber)
    .executeTakeFirst();

  if (!base) return null;
  if (!isComplaintStatus(base.status)) throw new Error(`Unexpected complaint status in DB: ${base.status}`);

  const coordsResult = await sql<{ lat: number; lng: number }>`
    SELECT ST_Y(geog::geometry) AS lat, ST_X(geog::geometry) AS lng
    FROM locations WHERE id = (SELECT location_id FROM complaints WHERE id = ${base.id}::uuid)
  `.execute(db);
  const coords = coordsResult.rows[0];

  const [images, latestInferenceResult, riskRows, notes, updates, history, auditRows, assignmentRows] = await Promise.all([
    db
      .selectFrom("complaint_images")
      .select(["id", "image_type", "storage_key", "created_at"])
      .where("complaint_id", "=", base.id)
      .orderBy("created_at", "asc")
      .execute(),
    db
      .selectFrom("inference_results")
      .select(["id"])
      .where("complaint_id", "=", base.id)
      .orderBy("created_at", "desc")
      .executeTakeFirst(),
    db
      .selectFrom("risk_assessments")
      .leftJoin("users", "users.id", "risk_assessments.overridden_by")
      .select([
        "risk_assessments.id",
        "risk_assessments.risk_level",
        "risk_assessments.score",
        "risk_assessments.factor_breakdown",
        "risk_assessments.is_admin_override",
        "risk_assessments.override_reason",
        "risk_assessments.is_current",
        "risk_assessments.created_at",
        "users.full_name as overridden_by_name",
      ])
      .where("risk_assessments.complaint_id", "=", base.id)
      .orderBy("risk_assessments.created_at", "desc")
      .execute(),
    db
      .selectFrom("admin_notes")
      .innerJoin("users", "users.id", "admin_notes.admin_id")
      .select(["admin_notes.id", "admin_notes.note", "users.full_name as admin_name", "admin_notes.created_at"])
      .where("complaint_id", "=", base.id)
      .orderBy("admin_notes.created_at", "asc")
      .execute(),
    db
      .selectFrom("public_updates")
      .leftJoin("users", "users.id", "public_updates.created_by")
      .select(["public_updates.id", "message", "users.full_name as author_name", "public_updates.created_at"])
      .where("complaint_id", "=", base.id)
      .orderBy("public_updates.created_at", "asc")
      .execute(),
    db
      .selectFrom("status_history")
      .leftJoin("users", "users.id", "status_history.changed_by")
      .select(["from_status", "to_status", "note", "users.full_name as changed_by_name", "status_history.created_at"])
      .where("complaint_id", "=", base.id)
      .orderBy("status_history.created_at", "asc")
      .execute(),
    db
      .selectFrom("audit_logs")
      .leftJoin("users", "users.id", "audit_logs.actor_id")
      .select(["audit_logs.id", "action", "before", "after", "users.full_name as actor_name", "audit_logs.created_at"])
      .where("entity_type", "=", "complaint")
      .where("entity_id", "=", base.id)
      .orderBy("audit_logs.created_at", "desc")
      .execute(),
    db
      .selectFrom("assignments")
      .innerJoin("users as assignee", "assignee.id", "assignments.assigned_to")
      .innerJoin("users as assigner", "assigner.id", "assignments.assigned_by")
      .select([
        "assignee.full_name as assignee_name",
        "assigner.full_name as assigned_by_name",
        "assignments.note",
        "assignments.assigned_at",
        "assignments.unassigned_at",
      ])
      .where("complaint_id", "=", base.id)
      .orderBy("assignments.assigned_at", "desc")
      .execute(),
  ]);

  const originalPhotoUrls = await Promise.all(
    images.filter((i) => i.image_type === "original").map((i) => getSignedGetUrl(i.storage_key))
  );
  const annotatedImage = images.filter((i) => i.image_type === "annotated").at(-1);
  const annotatedPhotoUrl = annotatedImage ? await getSignedGetUrl(annotatedImage.storage_key) : null;

  function mapAssignment(a: (typeof assignmentRows)[number] | undefined): AdminAssignmentRow | null {
    if (!a) return null;
    return {
      assigneeName: a.assignee_name,
      assignedByName: a.assigned_by_name,
      note: a.note,
      assignedAt: a.assigned_at,
      unassignedAt: a.unassigned_at,
    };
  }

  const detections = latestInferenceResult
    ? await db
        .selectFrom("detections")
        .leftJoin("users", "users.id", "detections.admin_reviewed_by")
        .select([
          "detections.id",
          "detections.ai_class_name",
          "detections.ai_confidence",
          "detections.ai_bbox_x1",
          "detections.ai_bbox_y1",
          "detections.ai_bbox_x2",
          "detections.ai_bbox_y2",
          "detections.admin_reviewed",
          "detections.admin_rejected",
          "detections.admin_corrected_class_name",
          "detections.admin_note",
          "detections.admin_reviewed_at",
          "users.full_name as admin_reviewed_by_name",
        ])
        .where("inference_result_id", "=", latestInferenceResult.id)
        .orderBy("ai_confidence", "desc")
        .execute()
    : [];

  const treatmentRecommendations = detections.length > 0 ? await getTreatmentRecommendations() : null;

  function mapRisk(r: (typeof riskRows)[number]): AdminRiskAssessment {
    return {
      id: r.id,
      level: r.risk_level,
      score: Number(r.score),
      factorBreakdown: r.factor_breakdown,
      isAdminOverride: r.is_admin_override,
      overrideReason: r.override_reason,
      overriddenByName: r.overridden_by_name,
      createdAt: r.created_at,
    };
  }
  const riskAssessments: AdminRiskAssessment[] = riskRows.map(mapRisk);
  const currentRiskRow = riskRows.find((r) => r.is_current);

  return {
    id: base.id,
    complaintNumber: base.complaint_number,
    status: base.status,
    createdAt: base.created_at,
    updatedAt: base.updated_at,
    description: base.description,
    citizenId: base.citizen_id,
    citizenName: base.full_name,
    citizenEmail: base.email,
    citizenPhone: base.phone,
    locality: base.locality,
    city: base.city,
    district: base.district,
    state: base.state,
    pinCode: base.pin_code,
    landmark: base.landmark,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    accuracyMeters: base.accuracy_meters ? Number(base.accuracy_meters) : null,
    originalPhotoUrls,
    annotatedPhotoUrl,
    detections: detections.map((d) => ({
      id: d.id,
      className: d.ai_class_name,
      confidence: Number(d.ai_confidence),
      bbox: { x1: Number(d.ai_bbox_x1), y1: Number(d.ai_bbox_y1), x2: Number(d.ai_bbox_x2), y2: Number(d.ai_bbox_y2) },
      adminReviewed: d.admin_reviewed,
      adminRejected: d.admin_rejected,
      adminCorrectedClassName: d.admin_corrected_class_name,
      adminNote: d.admin_note,
      adminReviewedByName: d.admin_reviewed_by_name,
      adminReviewedAt: d.admin_reviewed_at,
      treatmentRecommendation: d.admin_rejected
        ? null
        : (treatmentRecommendations?.get(d.admin_corrected_class_name ?? d.ai_class_name)?.recommendation ?? null),
    })),
    currentRisk: currentRiskRow ? mapRisk(currentRiskRow) : null,
    riskHistory: riskAssessments,
    adminNotes: notes.map((n) => ({ id: n.id, note: n.note, adminName: n.admin_name, createdAt: n.created_at })),
    publicUpdates: updates.map((u) => ({ id: u.id, message: u.message, authorName: u.author_name, createdAt: u.created_at })),
    statusHistory: history.map((h) => {
      if (!isComplaintStatus(h.to_status)) throw new Error(`Unexpected status in status_history: ${h.to_status}`);
      return {
        fromStatus: h.from_status && isComplaintStatus(h.from_status) ? h.from_status : null,
        toStatus: h.to_status,
        note: h.note,
        changedByName: h.changed_by_name,
        createdAt: h.created_at,
      };
    }),
    auditLog: auditRows.map((a) => ({
      id: a.id,
      action: a.action,
      actorName: a.actor_name,
      before: a.before,
      after: a.after,
      createdAt: a.created_at,
    })),
    currentAssignment: mapAssignment(assignmentRows.find((a) => a.unassigned_at === null)),
    assignmentHistory: assignmentRows.map((a) => mapAssignment(a)!),
  };
}

export interface AdminUserOption {
  id: string;
  name: string;
}

export async function getAdminUserOptions(): Promise<AdminUserOption[]> {
  const rows = await db.selectFrom("users").select(["id", "full_name"]).where("role", "=", "admin").orderBy("full_name", "asc").execute();
  return rows.map((r) => ({ id: r.id, name: r.full_name }));
}
