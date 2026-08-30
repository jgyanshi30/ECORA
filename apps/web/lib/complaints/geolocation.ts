export interface GeolocationCapture {
  lat: number;
  lng: number;
  accuracyMeters: number;
  altitudeMeters: number | null;
  capturedAt: string;
}

export type GeolocationFailureReason = "denied" | "unavailable" | "timeout";

export type GeolocationResult =
  | { ok: true; data: GeolocationCapture }
  | { ok: false; reason: GeolocationFailureReason };

/**
 * Denial is an expected, non-error path (CLAUDE.md step 5b spec) — this
 * never throws, it always resolves with a discriminated result the caller
 * branches on.
 */
export function getCurrentPosition(): Promise<GeolocationResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve({ ok: false, reason: "unavailable" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          ok: true,
          data: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
            altitudeMeters: position.coords.altitude,
            capturedAt: new Date(position.timestamp).toISOString(),
          },
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) resolve({ ok: false, reason: "denied" });
        else if (error.code === error.TIMEOUT) resolve({ ok: false, reason: "timeout" });
        else resolve({ ok: false, reason: "unavailable" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}
