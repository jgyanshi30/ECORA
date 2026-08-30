import { afterEach, describe, expect, it, vi } from "vitest";

import { reverseGeocode, searchAddress } from "@/lib/geocoding/nominatim";

// Nominatim is a real, rate-limited public service — these tests mock fetch
// rather than hit it, so the suite is deterministic and never counts against
// its usage policy just by running the test suite repeatedly.
describe("reverseGeocode", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("maps a typical Indian address response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        lat: "18.9220",
        lon: "72.8347",
        display_name: "Colaba, Mumbai, Maharashtra, India",
        address: {
          suburb: "Colaba",
          city: "Mumbai",
          state_district: "Mumbai City",
          state: "Maharashtra",
          postcode: "400005",
        },
      }),
    }) as unknown as typeof fetch;

    const result = await reverseGeocode(18.922, 72.8347);
    expect(result).toEqual({
      locality: "Colaba",
      city: "Mumbai",
      district: "Mumbai City",
      state: "Maharashtra",
      pinCode: "400005",
      displayName: "Colaba, Mumbai, Maharashtra, India",
    });
  });

  it("falls back through the address hierarchy when preferred fields are missing", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        lat: "10.0",
        lon: "76.0",
        display_name: "Somewhere, Kerala, India",
        address: { village: "Small Village", county: "Some County", state: "Kerala" },
      }),
    }) as unknown as typeof fetch;

    const result = await reverseGeocode(10, 76);
    expect(result?.locality).toBe("Small Village");
    expect(result?.city).toBe(""); // no city/town/municipality present
    expect(result?.district).toBe("Some County");
  });

  it("returns null when Nominatim returns an error payload", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: "Unable to geocode" }),
    }) as unknown as typeof fetch;

    expect(await reverseGeocode(0, 0)).toBeNull();
  });

  it("returns null on a non-OK HTTP response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    expect(await reverseGeocode(18.9, 72.8)).toBeNull();
  });

  it("sends a descriptive User-Agent header (Nominatim usage policy)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lat: "0", lon: "0", display_name: "x", address: {} }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await reverseGeocode(18.9, 72.8);
    const [, options] = fetchMock.mock.calls[0]!;
    expect(options.headers["User-Agent"]).toMatch(/Ecora/);
  });
});

describe("searchAddress", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("maps multiple search results with coordinates", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { lat: "18.92", lon: "72.83", display_name: "Result 1", address: { city: "Mumbai", state: "Maharashtra" } },
        { lat: "13.05", lon: "80.27", display_name: "Result 2", address: { city: "Chennai", state: "Tamil Nadu" } },
      ],
    }) as unknown as typeof fetch;

    const results = await searchAddress("beach");
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ lat: 18.92, lng: 72.83, city: "Mumbai" });
    expect(results[1]).toMatchObject({ lat: 13.05, lng: 80.27, city: "Chennai" });
  });

  it("returns an empty array on a non-OK response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    expect(await searchAddress("anything")).toEqual([]);
  });
});
