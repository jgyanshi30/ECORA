import type { ColumnType, Generated, RawBuilder } from "kysely";

/**
 * Hand-written to match infra/db/migrations exactly (0004_roles_users.sql,
 * 0021_users_email_verification.sql, 0022/0023_*_tokens.sql,
 * 0024_users_deletion_request.sql) — only the tables/columns the web app
 * actually touches. Not a schema-generation tool; a migration that changes
 * these columns must update this file too.
 */
export interface UsersTable {
  id: Generated<string>;
  email: string;
  password_hash: string;
  role: "citizen" | "admin";
  full_name: string;
  phone: string | null;
  is_active: Generated<boolean>;
  deleted_at: ColumnType<Date | null, string | null | undefined, string | null>;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
  email_verified_at: ColumnType<Date | null, string | null | undefined, string | null>;
  deletion_requested_at: ColumnType<Date | null, string | null | undefined, string | null>;
}

export interface EmailVerificationTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: ColumnType<Date, string, never>;
  consumed_at: ColumnType<Date | null, string | null | undefined, string | null>;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface PasswordResetTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: ColumnType<Date, string, never>;
  consumed_at: ColumnType<Date | null, string | null | undefined, string | null>;
  created_at: ColumnType<Date, string | undefined, never>;
}

/**
 * `citizen_id` scopes every citizen-dashboard query (step 4); `id`/`status`/
 * `description` are set directly by step 5c's submitComplaintAction.
 * Deliberately excludes anything from `locations` beyond city/state/locality
 * in every SELECT — see that table's comment on why exact geog is never
 * citizen/public-facing.
 */
export interface ComplaintsTable {
  id: Generated<string>;
  complaint_number: string;
  citizen_id: string;
  location_id: string;
  status: string;
  description: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

/**
 * `geog` is typed `never` on SELECT — a compile-time enforcement of CLAUDE.md
 * §5's "excluded from every citizen-facing serializer at the schema/DTO
 * level, not filtered ad hoc per route": no query in this codebase can select
 * it and still type-check, since nothing should ever need to (public/citizen
 * views only ever read city/state/locality; the point geometry itself is
 * admin-only and not yet read anywhere in apps/web). Written only via a raw
 * `ST_SetSRID(ST_MakePoint(...), 4326)::geography` expression at insert time
 * (see lib/complaints/actions/submit.ts) — plain kysely values can't
 * round-trip PostGIS geography, so this isn't optional plumbing.
 */
export interface LocationsTable {
  id: Generated<string>;
  geog: ColumnType<never, RawBuilder<unknown>, RawBuilder<unknown>>;
  accuracy_meters: ColumnType<string | null, number | null, number | null>;
  altitude_meters: ColumnType<string | null, number | null, number | null>;
  exif_lat: number | null;
  exif_lng: number | null;
  locality: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pin_code: string | null;
  landmark: string | null;
  consent_given: Generated<boolean>;
  consent_captured_at: ColumnType<Date | null, string | null | undefined, string | null>;
  created_at: ColumnType<Date, string | undefined, never>;
}

/** CLAUDE.md §5: never a public URL — `storage_key` only, resolved to a signed URL at read time (lib/storage/s3.ts). */
export interface ComplaintImagesTable {
  id: Generated<string>;
  complaint_id: string;
  image_type: "original" | "annotated";
  storage_key: string;
  mime_type: "image/jpeg" | "image/png" | "image/webp";
  size_bytes: ColumnType<string, number, never>;
  width_px: number | null;
  height_px: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

/** CLAUDE.md §3: every transition, written here. `note` is internal-only — never surfaced to a citizen-facing serializer (see public_updates for that). */
export interface StatusHistoryTable {
  id: Generated<string>;
  complaint_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  note: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface PublicUpdatesTable {
  id: Generated<string>;
  complaint_id: string;
  status_history_id: string | null;
  message: string;
  created_by: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

/** CLAUDE.md §6: one row per deployed model; `class_map` snapshots id->name so a future reordered model can't corrupt how past Detections rows are read. */
export interface ModelVersionsTable {
  id: Generated<string>;
  version: string;
  runtime: "pt" | "onnx";
  model_path: string;
  class_map: ColumnType<Record<string, string>, string, string>;
  is_active: Generated<boolean>;
  created_at: ColumnType<Date, string | undefined, never>;
}

/** CLAUDE.md §6: `raw_response` is the full /infer JSON, kept for audit replay; queryable columns are denormalized alongside it. */
export interface InferenceResultsTable {
  id: Generated<string>;
  complaint_id: string;
  model_version_id: string;
  object_count: Generated<number>;
  annotated_image_id: string | null;
  inference_time_ms: number | null;
  raw_response: ColumnType<unknown, string, string>;
  inferred_at: ColumnType<Date, string | undefined, string>;
  created_at: ColumnType<Date, string | undefined, never>;
}

/**
 * CLAUDE.md §0, §6: `ai_*` columns are the original model output and are
 * NEVER overwritten — an admin correction lives in the separate `admin_*`
 * columns alongside the untouched original (not built in this sub-step).
 */
export interface DetectionsTable {
  id: Generated<string>;
  inference_result_id: string;
  ai_class_id: number;
  ai_class_name: string;
  ai_confidence: ColumnType<string, number, never>;
  ai_bbox_x1: ColumnType<string, number, never>;
  ai_bbox_y1: ColumnType<string, number, never>;
  ai_bbox_x2: ColumnType<string, number, never>;
  ai_bbox_y2: ColumnType<string, number, never>;
  admin_reviewed: Generated<boolean>;
  admin_rejected: Generated<boolean>;
  admin_corrected_class_name: string | null;
  admin_note: string | null;
  admin_reviewed_by: string | null;
  admin_reviewed_at: ColumnType<Date | null, string | null | undefined, string | null>;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface NotificationsTable {
  id: Generated<string>;
  user_id: string;
  complaint_id: string | null;
  channel: "email" | "sms" | "in_app";
  type: string;
  message: string;
  status: Generated<"pending" | "sent" | "failed">;
  created_at: ColumnType<Date, string | undefined, never>;
  sent_at: ColumnType<Date | null, string | null | undefined, string | null>;
}

/** CLAUDE.md §5, §11: every admin mutation, with before/after snapshots. `actor_id` null means system-initiated. */
export interface AuditLogsTable {
  id: Generated<string>;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  before: ColumnType<unknown, string | null, string | null>;
  after: ColumnType<unknown, string | null, string | null>;
  ip_address: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

/** Not in CLAUDE.md §5's original entity list — added for the citizen complaint-detail page's post-resolution rating (PROGRESS.md sub-step 2). Append-only: a reopened-then-resolved-again complaint can be rated more than once. */
export interface ComplaintFeedbackTable {
  id: Generated<string>;
  complaint_id: string;
  citizen_id: string;
  rating: number;
  comment: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

/** CLAUDE.md §7: append-only — an admin override inserts a new row and flips `is_current` on the old one in the same transaction, never mutates a prior assessment. */
export interface RiskAssessmentsTable {
  id: Generated<string>;
  complaint_id: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  score: ColumnType<string, number, never>;
  factor_breakdown: ColumnType<unknown, string, never>;
  is_admin_override: Generated<boolean>;
  override_reason: string | null;
  overridden_by: string | null;
  is_current: Generated<boolean>;
  created_at: ColumnType<Date, string | undefined, never>;
}

/** CLAUDE.md §5, §9: tracked report generation — admin-only. `region_geog` is only set for a region-scoped report; omitted here since no report type built so far uses it (region export stays the instant CSV endpoint from step 3/5). */
export interface GeneratedReportsTable {
  id: Generated<string>;
  requested_by: string;
  report_type: string;
  filter_params: ColumnType<Record<string, unknown>, string | undefined, never>;
  storage_key: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: ColumnType<Date, string | undefined, never>;
  completed_at: ColumnType<Date | null, string | null | undefined, string | null>;
}

/** CLAUDE.md §5: excluded from every citizen-facing serializer — confidential, admin-only. */
export interface AdminNotesTable {
  id: Generated<string>;
  complaint_id: string;
  admin_id: string;
  note: string;
  created_at: ColumnType<Date, string | undefined, never>;
}

/** CLAUDE.md §5: admin-to-complaint assignment history. `unassigned_at` null means still active. */
export interface AssignmentsTable {
  id: Generated<string>;
  complaint_id: string;
  assigned_to: string;
  assigned_by: string;
  note: string | null;
  assigned_at: ColumnType<Date, string | undefined, never>;
  unassigned_at: ColumnType<Date | null, string | null | undefined, string | null>;
}

/** CLAUDE.md §8: editable-by-admin, keyed off the 15 verified debris classes — `class_name` (not a UUID) is the PK, seeded with real operational defaults by migration 0016. */
export interface TreatmentRecommendationsTable {
  class_name: string;
  recommendation: string;
  updated_by: string | null;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export interface Database {
  users: UsersTable;
  email_verification_tokens: EmailVerificationTokensTable;
  password_reset_tokens: PasswordResetTokensTable;
  complaints: ComplaintsTable;
  locations: LocationsTable;
  complaint_images: ComplaintImagesTable;
  status_history: StatusHistoryTable;
  public_updates: PublicUpdatesTable;
  notifications: NotificationsTable;
  model_versions: ModelVersionsTable;
  inference_results: InferenceResultsTable;
  detections: DetectionsTable;
  complaint_feedback: ComplaintFeedbackTable;
  risk_assessments: RiskAssessmentsTable;
  admin_notes: AdminNotesTable;
  assignments: AssignmentsTable;
  generated_reports: GeneratedReportsTable;
  audit_logs: AuditLogsTable;
  treatment_recommendations: TreatmentRecommendationsTable;
}
