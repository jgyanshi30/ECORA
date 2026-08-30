import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGetClientIp = vi.fn();
vi.mock("@/lib/request-ip", () => ({ getClientIp: mockGetClientIp, ipForStorage: () => null }));

const { generateReportAction } = await import("@/lib/admin/actions/generate-report");
const { getGeneratedReports } = await import("@/lib/admin/reports");
const { db } = await import("@/lib/db");
const { headObject } = await import("@/lib/storage/s3");

let adminId: string;
let citizenId: string;
const reportIds: string[] = [];

const ADMIN_SESSION = () => ({ user: { id: adminId, role: "admin", email: "report-admin@example.com" } });
const CITIZEN_SESSION = () => ({ user: { id: citizenId, role: "citizen", email: "c@example.com" } });

beforeAll(async () => {
  const admin = await db
    .insertInto("users")
    .values({ email: `report-admin-${Date.now()}@example.com`, password_hash: "x", full_name: "Report Admin", role: "admin" })
    .returningAll()
    .executeTakeFirstOrThrow();
  adminId = admin.id;
  const citizen = await db
    .insertInto("users")
    .values({ email: `report-citizen-${Date.now()}@example.com`, password_hash: "x", full_name: "Report Citizen", role: "citizen" })
    .returningAll()
    .executeTakeFirstOrThrow();
  citizenId = citizen.id;
});

afterAll(async () => {
  await db.deleteFrom("generated_reports").where("id", "in", reportIds).execute();
  await db.deleteFrom("users").where("id", "in", [adminId, citizenId]).execute();
  await db.destroy();
});

beforeEach(() => {
  mockAuth.mockReset();
  mockGetClientIp.mockReset();
  mockGetClientIp.mockResolvedValue(`report-test-ip-${Math.random()}`);
});

describe("generateReportAction", () => {
  it("rejects a non-admin session", async () => {
    mockAuth.mockResolvedValue(CITIZEN_SESSION());
    const result = await generateReportAction("summary_pdf");
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid report type", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    // @ts-expect-error intentionally invalid input to verify server-side validation
    const result = await generateReportAction("not_a_real_type");
    expect(result.ok).toBe(false);
  });

  it("generates a real PDF summary report, uploads it to real storage, and marks it completed", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const result = await generateReportAction("summary_pdf");
    expect(result.ok).toBe(true);
    expect(result.reportId).toBeDefined();
    reportIds.push(result.reportId!);

    const row = await db
      .selectFrom("generated_reports")
      .selectAll()
      .where("id", "=", result.reportId!)
      .executeTakeFirstOrThrow();
    expect(row.status).toBe("completed");
    expect(row.storage_key).toBe(`reports/${result.reportId}.pdf`);
    expect(row.completed_at).not.toBeNull();
    expect(row.requested_by).toBe(adminId);

    const meta = await headObject(row.storage_key!);
    expect(meta.contentType).toBe("application/pdf");
    expect(meta.contentLength).toBeGreaterThan(0);
  });

  it("generates a real CSV report and uploads it to real storage", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const result = await generateReportAction("complaints_csv");
    expect(result.ok).toBe(true);
    reportIds.push(result.reportId!);

    const row = await db
      .selectFrom("generated_reports")
      .selectAll()
      .where("id", "=", result.reportId!)
      .executeTakeFirstOrThrow();
    expect(row.status).toBe("completed");
    expect(row.storage_key).toBe(`reports/${result.reportId}.csv`);

    const meta = await headObject(row.storage_key!);
    expect(meta.contentType).toBe("text/csv");
  });

  it("appears in the report history with a working signed download URL", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const result = await generateReportAction("summary_pdf");
    reportIds.push(result.reportId!);

    const history = await getGeneratedReports();
    const entry = history.find((r) => r.id === result.reportId);
    expect(entry).toBeDefined();
    expect(entry!.status).toBe("completed");
    expect(entry!.requestedByName).toBe("Report Admin");
    expect(entry!.downloadUrl).toMatch(/^http/);

    const response = await fetch(entry!.downloadUrl!);
    expect(response.status).toBe(200);
    const buffer = Buffer.from(await response.arrayBuffer());
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
