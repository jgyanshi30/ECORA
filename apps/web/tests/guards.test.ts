import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

// Imported after the mock so it picks up the mocked "@/auth".
const { requireAdminApi } = await import("@/lib/auth/guards");

describe("requireAdminApi", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("rejects with 401 when there is no session", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await requireAdminApi();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("rejects with 403 when the session role is citizen", async () => {
    mockAuth.mockResolvedValue({ user: { id: "1", role: "citizen", email: "c@example.com" } });
    const result = await requireAdminApi();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("succeeds when the session role is admin", async () => {
    const session = { user: { id: "1", role: "admin", email: "a@example.com" } };
    mockAuth.mockResolvedValue(session);
    const result = await requireAdminApi();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session).toBe(session);
  });
});
