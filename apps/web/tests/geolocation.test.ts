import { afterEach, describe, expect, it, vi } from "vitest";

import { getCurrentPosition } from "@/lib/complaints/geolocation";

describe("getCurrentPosition", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves ok:false/unavailable when the browser has no geolocation API", async () => {
    vi.stubGlobal("navigator", {});
    const result = await getCurrentPosition();
    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });

  it("resolves ok:true with mapped coords on success", async () => {
    const timestamp = Date.now();
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (success: PositionCallback) => {
          success({
            coords: { latitude: 18.922, longitude: 72.8347, accuracy: 12, altitude: 5.2 },
            timestamp,
          } as GeolocationPosition);
        },
      },
    });

    const result = await getCurrentPosition();
    expect(result).toEqual({
      ok: true,
      data: {
        lat: 18.922,
        lng: 72.8347,
        accuracyMeters: 12,
        altitudeMeters: 5.2,
        capturedAt: new Date(timestamp).toISOString(),
      },
    });
  });

  it("resolves ok:false/denied on PERMISSION_DENIED — an expected path, not a crash", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
        },
      },
    });

    const result = await getCurrentPosition();
    expect(result).toEqual({ ok: false, reason: "denied" });
  });

  it("resolves ok:false/timeout on TIMEOUT", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 3, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
        },
      },
    });

    const result = await getCurrentPosition();
    expect(result).toEqual({ ok: false, reason: "timeout" });
  });

  it("resolves ok:false/unavailable on POSITION_UNAVAILABLE", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 2, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
        },
      },
    });

    const result = await getCurrentPosition();
    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });
});
