import { randomBytes, createHash } from "node:crypto";

/**
 * Used for email-verification and password-reset links. The raw token goes
 * in the emailed URL only; only its SHA-256 hash is ever persisted
 * (infra/db 0022/0023) — mirrors how passwords are handled, so a DB leak
 * alone can't be replayed as a working reset/verify link.
 */
export function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
