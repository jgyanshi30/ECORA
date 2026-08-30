import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGetClientIp = vi.fn();
vi.mock("@/lib/request-ip", () => ({ getClientIp: mockGetClientIp, ipForStorage: () => null }));

const { updateTreatmentRecommendationAction } = await import("@/lib/admin/actions/treatment-recommendations");
const { getTreatmentRecommendations, getTreatmentRecommendation, TREATMENT_CATEGORIES } = await import("@/lib/admin/treatment-recommendations");
const { db } = await import("@/lib/db");

const TEST_CLASS = "sunglasses";
let adminId: string;
let citizenId: string;
let originalRecommendation: string;

const ADMIN_SESSION = () => ({ user: { id: adminId, role: "admin", email: "admin@example.com" } });
const CITIZEN_SESSION = () => ({ user: { id: citizenId, role: "citizen", email: "c@example.com" } });

beforeAll(async () => {
  const admin = await db
    .insertInto("users")
    .values({ email: `treatment-admin-${Date.now()}@example.com`, password_hash: "x", full_name: "Treatment Admin", role: "admin" })
    .returningAll()
    .executeTakeFirstOrThrow();
  adminId = admin.id;
  const citizen = await db
    .insertInto("users")
    .values({ email: `treatment-citizen-${Date.now()}@example.com`, password_hash: "x", full_name: "Citizen", role: "citizen" })
    .returningAll()
    .executeTakeFirstOrThrow();
  citizenId = citizen.id;

  const row = await db
    .selectFrom("treatment_recommendations")
    .select("recommendation")
    .where("class_name", "=", TEST_CLASS)
    .executeTakeFirstOrThrow();
  originalRecommendation = row.recommendation;
});

afterAll(async () => {
  await db
    .updateTable("treatment_recommendations")
    .set({ recommendation: originalRecommendation, updated_by: null })
    .where("class_name", "=", TEST_CLASS)
    .execute();
  await db.deleteFrom("audit_logs").where("actor_id", "=", adminId).where("action", "=", "treatment_recommendation_updated").execute();
  await db.deleteFrom("users").where("id", "in", [adminId, citizenId]).execute();
  await db.destroy();
});

beforeEach(() => {
  mockAuth.mockReset();
  mockGetClientIp.mockReset();
  mockGetClientIp.mockResolvedValue(`treatment-test-ip-${Math.random()}`);
});

describe("TREATMENT_CATEGORIES", () => {
  it("covers exactly the 15 verified debris classes, keyed off the actual classes not a parallel system", () => {
    const allClasses = TREATMENT_CATEGORIES.flatMap((c) => c.classNames);
    expect(allClasses).toHaveLength(15);
    expect(new Set(allClasses).size).toBe(15); // no duplicates across categories
  });
});

describe("getTreatmentRecommendations / getTreatmentRecommendation", () => {
  it("returns all 15 seeded rows", async () => {
    const map = await getTreatmentRecommendations();
    expect(map.size).toBe(15);
    expect(map.get("net")?.recommendation).toMatch(/entanglement/i);
  });

  it("looks up a single class", async () => {
    const rec = await getTreatmentRecommendation("net");
    expect(rec).toMatch(/entanglement/i);
  });

  it("returns null for an unknown class", async () => {
    const rec = await getTreatmentRecommendation("not-a-real-class");
    expect(rec).toBeNull();
  });
});

describe("updateTreatmentRecommendationAction", () => {
  it("rejects a non-admin session", async () => {
    mockAuth.mockResolvedValue(CITIZEN_SESSION());
    const result = await updateTreatmentRecommendationAction(TEST_CLASS, "New citizen-attempted recommendation text.");
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid debris class", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const result = await updateTreatmentRecommendationAction("not-a-real-class", "A perfectly good recommendation.");
    expect(result.ok).toBe(false);
  });

  it("rejects a too-short recommendation", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const result = await updateTreatmentRecommendationAction(TEST_CLASS, "hi");
    expect(result.ok).toBe(false);
  });

  it("updates the recommendation, records who/when, audits it, and leaves other classes untouched", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION());
    const newText = "Manual inspection — verified test recommendation for sunglasses.";

    const result = await updateTreatmentRecommendationAction(TEST_CLASS, newText);
    expect(result.ok).toBe(true);

    const row = await db.selectFrom("treatment_recommendations").selectAll().where("class_name", "=", TEST_CLASS).executeTakeFirstOrThrow();
    expect(row.recommendation).toBe(newText);
    expect(row.updated_by).toBe(adminId);

    // A sibling class in the same CLAUDE.md §8 category ("misc, rod, sunglasses") must be untouched.
    const sibling = await db.selectFrom("treatment_recommendations").selectAll().where("class_name", "=", "misc").executeTakeFirstOrThrow();
    expect(sibling.recommendation).not.toBe(newText);

    const audit = await db
      .selectFrom("audit_logs")
      .selectAll()
      .where("actor_id", "=", adminId)
      .where("action", "=", "treatment_recommendation_updated")
      .executeTakeFirstOrThrow();
    expect(audit.after).toMatchObject({ className: TEST_CLASS, recommendation: newText });
    expect(audit.before).toMatchObject({ className: TEST_CLASS, recommendation: originalRecommendation });
  });
});
