/**
 * Deterministic jitter for public/citizen-facing map points (CLAUDE.md §0:
 * "exact residential coordinates are not publicly exposed... exact GPS
 * lat/lng is admin-only"). The offset is seeded off the complaint's own id
 * so a given complaint always jitters to the same displayed point (doesn't
 * jump between page loads/refreshes), without ever being reversible back to
 * the true coordinate from the outside — this function must only ever be
 * called server-side with the real lat/lng; the jittered result is the only
 * thing that ever reaches a public/citizen-facing response.
 */
const JITTER_RADIUS_METERS = 300;
const EARTH_RADIUS_METERS = 6371000;

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

export function jitterCoordinate(lat: number, lng: number, seed: string): { lat: number; lng: number } {
  const h = hashSeed(seed);
  const angle = ((h % 3600) / 3600) * 2 * Math.PI;
  const distanceFraction = Math.floor(h / 3600) % 1000 / 1000;
  const distance = distanceFraction * JITTER_RADIUS_METERS;

  const deltaLat = ((distance * Math.cos(angle)) / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const deltaLng =
    ((distance * Math.sin(angle)) / (EARTH_RADIUS_METERS * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);

  return { lat: lat + deltaLat, lng: lng + deltaLng };
}
