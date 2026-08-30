import { describe, expect, it } from "vitest";

import { jitterCoordinate } from "@/lib/geo/jitter";

const EARTH_RADIUS_METERS = 6371000;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

describe("jitterCoordinate", () => {
  it("is deterministic — the same seed always produces the same offset", () => {
    const a = jitterCoordinate(18.922, 72.8347, "complaint-123");
    const b = jitterCoordinate(18.922, 72.8347, "complaint-123");
    expect(a).toEqual(b);
  });

  it("produces different offsets for different seeds", () => {
    const a = jitterCoordinate(18.922, 72.8347, "complaint-1");
    const b = jitterCoordinate(18.922, 72.8347, "complaint-2");
    expect(a).not.toEqual(b);
  });

  it("never moves the point more than the documented radius (300m)", () => {
    for (const seed of ["a", "b", "c", "some-uuid-1234", "some-uuid-5678", "x".repeat(40)]) {
      const jittered = jitterCoordinate(18.922, 72.8347, seed);
      const distance = haversineMeters(18.922, 72.8347, jittered.lat, jittered.lng);
      expect(distance).toBeLessThanOrEqual(300.5); // small float tolerance
    }
  });

  it("actually moves the point (not a no-op) for a typical seed", () => {
    const jittered = jitterCoordinate(18.922, 72.8347, "some-real-uuid");
    expect(jittered.lat === 18.922 && jittered.lng === 72.8347).toBe(false);
  });
});
