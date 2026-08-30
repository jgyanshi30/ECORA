/**
 * Complaint numbering (CLAUDE.md §4): `CLN-YYYYMMDD-XXXXXX`, a 6-char
 * uppercase alphanumeric suffix, e.g. `CLN-20260829-A4B721`.
 *
 * This module only provides format/validation helpers and a cryptographically
 * random suffix generator. It deliberately does NOT generate a full,
 * guaranteed-unique complaint number: per spec, generation must happen
 * server-side with a DB uniqueness check and retry-on-collision loop, which
 * belongs in the API layer (apps/web), not here.
 */

const SUFFIX_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SUFFIX_LENGTH = 6;

export const COMPLAINT_NUMBER_REGEX = /^CLN-(\d{8})-([A-Z0-9]{6})$/;

export function isValidComplaintNumber(value: string): boolean {
  return COMPLAINT_NUMBER_REGEX.test(value);
}

/** Formats YYYYMMDD from a Date, in UTC to avoid server-timezone drift. */
export function formatDateStamp(date: Date): string {
  const y = date.getUTCFullYear().toString().padStart(4, "0");
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = date.getUTCDate().toString().padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Cryptographically random 6-char uppercase alphanumeric suffix.
 * Never use Math.random() or a sequential counter for this — CLAUDE.md §4
 * explicitly calls out predictable IDs as an enumeration risk.
 */
export function generateComplaintNumberSuffix(): string {
  const bytes = new Uint8Array(SUFFIX_LENGTH);
  crypto.getRandomValues(bytes);
  let suffix = "";
  for (const b of bytes) {
    suffix += SUFFIX_ALPHABET[b % SUFFIX_ALPHABET.length];
  }
  return suffix;
}

export function formatComplaintNumber(date: Date, suffix: string): string {
  if (!/^[A-Z0-9]{6}$/.test(suffix)) {
    throw new Error(`Invalid complaint number suffix: ${suffix}`);
  }
  return `CLN-${formatDateStamp(date)}-${suffix}`;
}

/** Generates a candidate complaint number for a single attempt; caller retries on DB collision. */
export function generateComplaintNumberCandidate(date: Date = new Date()): string {
  return formatComplaintNumber(date, generateComplaintNumberSuffix());
}
