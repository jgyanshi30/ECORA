import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "kysely";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGetClientIp = vi.fn();
vi.mock("@/lib/request-ip", () => ({ getClientIp: mockGetClientIp, ipForStorage: () => null }));

const { addAdminNoteAction, addPublicUpdateAction } = await import("@/lib/admin/actions/notes");
const { db } = await import("@/lib/db");

let adminId: string;
let citizenId: string;
let locationId: string;
let complaintId: string;

const ADMIN_SESSION = () => ({ user: { id: adminId, role: "admin", email: "a@example.com" } });
const CITIZEN_SESSION = () => ({ user: { id: citizenId, role: "citizen", email: "c@example.com" } });

beforeAll(async () => {
  const admin = await db
    .insertInto("users")
    .values({ email: `notes-admin-${Date.now()}@example.com`, password_hash: "x", full_name: "Admin", role: "admin" })
    .returningAll()
    .executeTakeFirstOrThrow();
  adminId = admin.id;
  const citizen = await db
    .insertInto("users")
    .values({ email: `notes-citizen-${Date.now()}@example.com`, password_hash: "x", full_name: "Citizen", role: "citizen" })
    .returningAll()
    .executeTakeFirstOrThrow();
  citizenId = citizen.id;
  const location = await sql<{ id: string }>`
    INSERT INTO locations (geog, consent_given) VALUES (ST_SetSRID(ST_MakePoint(72.8, 18.9), 4326)::geography, TRUE) RETURNING id
  `.execute(db);
  locationId = location.rows[0]!.id;
  complaintId = crypto.randomUUID();
  await sql`
    INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status)
    VALUES (${complaintId}::uuid, 'CLN-20260201-NOTES1', ${citizenId}::uuid, ${locationId}::uuid, 'UNDER_REVIEW')
  `.execute(db);
});

afterAll(async () => {
  await db.deleteFrom("audit_logs").where("entity_id", "=", complaintId).execute();
  await db.deleteFrom("admin_notes").where("complaint_id", "=", complaintId).execute();
  await db.deleteFrom("public_updates").where("complaint_id", "=", complaintId).execute();
  await db.deleteFrom("complaints").where("id", "=", complaintId).execute();
  await sql`DELETE FROM locations WHERE id = ${locationId}::uuid`.execute(db);
  await db.deleteFrom("users").where("id", "in", [adminId, citizenId]).execute();
  await db.destroy();
});

beforeEach(() => {
  mockAuth.mockReset();
  mockGetClientIp.mockReset();
  mockGetClientIp.mockResolvedValue(`notes-test-ip-${Math.random()}`);
});

describe("addAdminNoteAction", () => {
  it("rejects a non-admin session", async () => {
    mockAuth.mockResolvedValue(CITIZEN_SESSION());
    const result = await addAdminNoteAction(complaintId, "Suspicious pattern of reports from this area.");
    expect(result.ok).toBe(false);
  });

  it("rejects an empty note", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const result = await addAdminNoteAction(complaintId, "   ");
    expect(result.ok).toBe(false);
  });

  it("stores a confidential note and audits it", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const result = await addAdminNoteAction(complaintId, "Confidential: possible repeat offender nearby.");
    expect(result.ok).toBe(true);

    const note = await db.selectFrom("admin_notes").selectAll().where("complaint_id", "=", complaintId).executeTakeFirstOrThrow();
    expect(note.note).toMatch(/repeat offender/);
    expect(note.admin_id).toBe(adminId);

    const audit = await db
      .selectFrom("audit_logs")
      .select("action")
      .where("entity_id", "=", complaintId)
      .where("action", "=", "admin_note_added")
      .executeTakeFirstOrThrow();
    expect(audit.action).toBe("admin_note_added");
  });
});

describe("addPublicUpdateAction", () => {
  it("rejects a non-admin session", async () => {
    mockAuth.mockResolvedValue(CITIZEN_SESSION());
    const result = await addPublicUpdateAction(complaintId, "We are looking into this.");
    expect(result.ok).toBe(false);
  });

  it("posts a citizen-visible update authored by the admin and audits it", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const result = await addPublicUpdateAction(complaintId, "A team has been dispatched to assess the site.");
    expect(result.ok).toBe(true);

    const update = await db
      .selectFrom("public_updates")
      .selectAll()
      .where("complaint_id", "=", complaintId)
      .where("message", "=", "A team has been dispatched to assess the site.")
      .executeTakeFirstOrThrow();
    expect(update.created_by).toBe(adminId);

    const audit = await db
      .selectFrom("audit_logs")
      .select("action")
      .where("entity_id", "=", complaintId)
      .where("action", "=", "public_update_added")
      .executeTakeFirstOrThrow();
    expect(audit.action).toBe("public_update_added");

    const notifications = await db.selectFrom("notifications").selectAll().where("complaint_id", "=", complaintId).execute();
    expect(notifications.find((n) => n.channel === "in_app")).toMatchObject({ status: "sent", type: "public_update" });
    expect(notifications.find((n) => n.channel === "email")).toMatchObject({ status: "sent", type: "public_update" });
  });

  it("rejects a complaint id that doesn't exist", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const result = await addPublicUpdateAction(crypto.randomUUID(), "A team has been dispatched.");
    expect(result.ok).toBe(false);
  });
});
