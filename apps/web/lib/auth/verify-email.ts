import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth/tokens";

export type VerifyEmailResult = "verified" | "invalid" | "expired" | "already-verified";

/** Called directly from app/verify-email/page.tsx (a GET link, no form) — not a "use server" action. */
export async function consumeEmailVerificationToken(rawToken: string): Promise<VerifyEmailResult> {
  const tokenHash = hashToken(rawToken);
  const tokenRow = await db
    .selectFrom("email_verification_tokens")
    .selectAll()
    .where("token_hash", "=", tokenHash)
    .executeTakeFirst();

  if (!tokenRow) return "invalid";
  if (tokenRow.consumed_at) return "already-verified";
  if (tokenRow.expires_at < new Date()) return "expired";

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("users")
      .set({ email_verified_at: new Date().toISOString() })
      .where("id", "=", tokenRow.user_id)
      .execute();
    await trx
      .updateTable("email_verification_tokens")
      .set({ consumed_at: new Date().toISOString() })
      .where("id", "=", tokenRow.id)
      .execute();
  });

  return "verified";
}
