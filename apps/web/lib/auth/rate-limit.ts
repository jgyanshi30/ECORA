/**
 * CLAUDE.md §11: rate limiting on auth and submission endpoints.
 *
 * In-memory fixed-window limiter. This is deliberately minimal for the
 * current single-instance dev/staging setup — it does NOT survive a process
 * restart and does NOT coordinate across multiple server instances. This
 * deployment has no Redis (CLAUDE.md §13: dropped along with the worker for
 * the serverless hackathon target) and Vercel functions don't share memory
 * across invocations either — if this needs to survive either of those,
 * swap this module's internals for a shared external store (e.g. Upstash
 * Redis, or a Postgres table) behind the same `checkRateLimit` signature.
 */

interface Bucket {
  count: number;
  windowStartMs: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStartMs >= windowMs) {
    buckets.set(key, { count: 1, windowStartMs: now });
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count };
}
