import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "kysely";

const mockSendComplaintUpdateEmail = vi.fn();
vi.mock("@/lib/email/complaint-emails", () => ({ sendComplaintUpdateEmail: mockSendComplaintUpdateEmail }));

const { recordInAppNotification, notifyCitizenByEmail } = await import("@/lib/notifications/service");
const { db } = await import("@/lib/db");

let citizenId: string;
let locationId: string;
let complaintId: string;

beforeAll(async () => {
  const citizen = await db
    .insertInto("users")
    .values({ email: `notify-citizen-${Date.now()}@example.com`, password_hash: "x", full_name: "Citizen", role: "citizen" })
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
    VALUES (${complaintId}::uuid, 'CLN-20260201-NTFY01', ${citizenId}::uuid, ${locationId}::uuid, 'UNDER_REVIEW')
  `.execute(db);
});

afterAll(async () => {
  await db.deleteFrom("notifications").where("complaint_id", "=", complaintId).execute();
  await db.deleteFrom("complaints").where("id", "=", complaintId).execute();
  await sql`DELETE FROM locations WHERE id = ${locationId}::uuid`.execute(db);
  await db.deleteFrom("users").where("id", "=", citizenId).execute();
  await db.destroy();
});

describe("recordInAppNotification", () => {
  it("writes an in-app row already marked sent", async () => {
    await db.transaction().execute(async (trx) => {
      await recordInAppNotification(trx, { userId: citizenId, complaintId, type: "test_event", message: "Test in-app message." });
    });

    const row = await db
      .selectFrom("notifications")
      .selectAll()
      .where("complaint_id", "=", complaintId)
      .where("type", "=", "test_event")
      .executeTakeFirstOrThrow();
    expect(row.channel).toBe("in_app");
    expect(row.status).toBe("sent");
    expect(row.sent_at).not.toBeNull();
  });
});

describe("notifyCitizenByEmail", () => {
  it("marks the notification sent on a successful send", async () => {
    mockSendComplaintUpdateEmail.mockResolvedValueOnce(undefined);

    await notifyCitizenByEmail({
      userId: citizenId,
      complaintId,
      type: "test_email_ok",
      message: "Everything worked.",
      to: "citizen@example.com",
      complaintNumber: "CLN-20260201-NTFY01",
    });

    const row = await db
      .selectFrom("notifications")
      .selectAll()
      .where("complaint_id", "=", complaintId)
      .where("type", "=", "test_email_ok")
      .executeTakeFirstOrThrow();
    expect(row.channel).toBe("email");
    expect(row.status).toBe("sent");
    expect(row.sent_at).not.toBeNull();
  });

  it("marks the notification failed (and does not throw) when the send rejects", async () => {
    mockSendComplaintUpdateEmail.mockRejectedValueOnce(new Error("provider unreachable"));

    await expect(
      notifyCitizenByEmail({
        userId: citizenId,
        complaintId,
        type: "test_email_fail",
        message: "This one fails.",
        to: "citizen@example.com",
        complaintNumber: "CLN-20260201-NTFY01",
      })
    ).resolves.toBeUndefined();

    const row = await db
      .selectFrom("notifications")
      .selectAll()
      .where("complaint_id", "=", complaintId)
      .where("type", "=", "test_email_fail")
      .executeTakeFirstOrThrow();
    expect(row.channel).toBe("email");
    expect(row.status).toBe("failed");
    expect(row.sent_at).toBeNull();
  });
});
