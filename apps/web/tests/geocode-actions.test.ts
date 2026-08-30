import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGetClientIp = vi.fn();
vi.mock("@/lib/request-ip", () => ({ getClientIp: mockGetClientIp }));

const mockReverseGeocode = vi.fn();
const mockSearchAddress = vi.fn();
vi.mock("@/lib/geocoding/nominatim", () => ({
  reverseGeocode: mockReverseGeocode,
  searchAddress: mockSearchAddress,
}));

// Imported after the mocks so they pick up the mocked modules.
const { reverseGeocodeAction, searchAddressAction } = await import("@/lib/complaints/actions/geocode");

const SESSION = { user: { id: "1", role: "citizen", email: "c@example.com" } };

describe("reverseGeocodeAction", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockGetClientIp.mockReset();
    mockReverseGeocode.mockReset();
    mockGetClientIp.mockResolvedValue(`test-ip-${Math.random()}`);
  });

  it("rejects when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await reverseGeocodeAction(18.9, 72.8);
    expect(result.ok).toBe(false);
    expect(mockReverseGeocode).not.toHaveBeenCalled();
  });

  it("rejects invalid coordinates without calling the geocoder", async () => {
    mockAuth.mockResolvedValue(SESSION);
    const result = await reverseGeocodeAction(999, 72.8);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/invalid coordinates/i);
    expect(mockReverseGeocode).not.toHaveBeenCalled();
  });

  it("returns the geocoded address on success", async () => {
    mockAuth.mockResolvedValue(SESSION);
    const address = { locality: "Colaba", city: "Mumbai", district: "Mumbai City", state: "Maharashtra", pinCode: "400005", displayName: "x" };
    mockReverseGeocode.mockResolvedValue(address);

    const result = await reverseGeocodeAction(18.922, 72.8347);
    expect(result.ok).toBe(true);
    expect(result.address).toEqual(address);
  });

  it("fails gracefully (not throw) when the geocoder returns null", async () => {
    mockAuth.mockResolvedValue(SESSION);
    mockReverseGeocode.mockResolvedValue(null);
    const result = await reverseGeocodeAction(18.9, 72.8);
    expect(result.ok).toBe(false);
  });

  it("fails gracefully when the geocoder throws", async () => {
    mockAuth.mockResolvedValue(SESSION);
    mockReverseGeocode.mockRejectedValue(new Error("network down"));
    const result = await reverseGeocodeAction(18.9, 72.8);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/manually/i);
  });

  it("rate-limits repeated calls from the same caller", async () => {
    mockAuth.mockResolvedValue(SESSION);
    mockReverseGeocode.mockResolvedValue({ locality: "", city: "", district: "", state: "", pinCode: "", displayName: "" });
    const ip = `rate-limit-test-${Math.random()}`;
    mockGetClientIp.mockResolvedValue(ip);

    for (let i = 0; i < 20; i++) {
      const result = await reverseGeocodeAction(18.9, 72.8);
      expect(result.ok).toBe(true);
    }
    const limited = await reverseGeocodeAction(18.9, 72.8);
    expect(limited.ok).toBe(false);
    expect(limited.error).toMatch(/too many/i);
  });
});

describe("searchAddressAction", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockGetClientIp.mockReset();
    mockSearchAddress.mockReset();
    mockGetClientIp.mockResolvedValue(`test-ip-${Math.random()}`);
  });

  it("rejects when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await searchAddressAction("Marina Beach");
    expect(result.ok).toBe(false);
    expect(mockSearchAddress).not.toHaveBeenCalled();
  });

  it("rejects a too-short query without calling the geocoder", async () => {
    mockAuth.mockResolvedValue(SESSION);
    const result = await searchAddressAction("ab");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/at least 3 characters/i);
    expect(mockSearchAddress).not.toHaveBeenCalled();
  });

  it("returns search results on success", async () => {
    mockAuth.mockResolvedValue(SESSION);
    const results = [{ lat: 18.9, lng: 72.8, locality: "", city: "Mumbai", district: "", state: "MH", pinCode: "", displayName: "Mumbai" }];
    mockSearchAddress.mockResolvedValue(results);

    const result = await searchAddressAction("Mumbai");
    expect(result.ok).toBe(true);
    expect(result.results).toEqual(results);
  });

  it("fails gracefully when the geocoder throws", async () => {
    mockAuth.mockResolvedValue(SESSION);
    mockSearchAddress.mockRejectedValue(new Error("network down"));
    const result = await searchAddressAction("Mumbai");
    expect(result.ok).toBe(false);
    expect(result.results).toEqual([]);
  });
});
