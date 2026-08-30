import { isIP } from "node:net";
import { headers } from "next/headers";

/** Best-effort client IP for rate limiting (CLAUDE.md §11). Next.js 16: headers() is async. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Validates a value before it's stored in a Postgres INET column
 * (audit_logs.ip_address). getClientIp() reads client-supplied headers
 * (x-forwarded-for/x-real-ip) — a misconfigured proxy or a deliberately
 * spoofed header can hand back something that isn't a real IP address at
 * all, which INET rejects outright. An audit-log insert failing on a
 * malformed IP must never abort the mutation it's supposed to be recording;
 * store null instead of guessing or throwing.
 */
export function ipForStorage(ip: string): string | null {
  return isIP(ip) ? ip : null;
}
