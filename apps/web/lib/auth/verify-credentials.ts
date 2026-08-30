import { verifyPassword } from "./passwords";
import { checkRateLimit } from "./rate-limit";
import { findUserByEmail } from "./users";

export class RateLimitExceededError extends Error {}

/**
 * Single chokepoint for credential verification + rate limiting, shared by
 * auth.ts's authorize() (the real NextAuth entrypoint, reachable directly via
 * /api/auth/callback/credentials) and adminLoginAction's pre-check (which
 * must know the role BEFORE establishing a session — see actions/login.ts
 * for why "sign in, then sign back out if wrong role" isn't safe to rely on).
 */
export async function verifyCredentials(email: string, password: string, ip: string) {
  const rateLimit = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!rateLimit.allowed) throw new RateLimitExceededError();

  const user = await findUserByEmail(email);
  if (!user || !user.is_active || user.deleted_at) return null;

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return null;

  return user;
}
