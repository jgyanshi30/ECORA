"use server";

import { isRiskLevel } from "@ecora/shared";
import { z } from "zod";

import { requireAdminAction } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { getClientIp, ipForStorage } from "@/lib/request-ip";

export interface RiskOverrideResult {
  ok: boolean;
  error?: string;
}

const schema = z.object({
  riskLevel: z.string(),
  reason: z.string().trim().min(10, "Provide a reason of at least 10 characters."),
});

/**
 * CLAUDE.md §7: "Admin override requires a mandatory reason, stored in
 * RiskAssessments/AuditLogs." Never mutates the prior assessment row — flips
 * its `is_current` off and inserts a new current row in the same
 * transaction, preserving the original AI-computed score/breakdown for
 * history (CLAUDE.md §0/§6's "never destructive-overwrite" principle
 * extends to risk, not just detections).
 */
export async function overrideRiskAction(
  complaintId: string,
  riskLevel: string,
  reason: string
): Promise<RiskOverrideResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error };

  const ip = await getClientIp();
  if (!checkRateLimit(`admin-risk-override:${ip}`, 20, 15 * 60 * 1000).allowed) {
    return { ok: false, error: "Too many requests. Wait a few minutes and try again." };
  }

  const parsed = schema.safeParse({ riskLevel, reason });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const newRiskLevel = parsed.data.riskLevel;
  if (!isRiskLevel(newRiskLevel)) {
    return { ok: false, error: "Invalid risk level." };
  }

  const current = await db
    .selectFrom("risk_assessments")
    .select(["id", "risk_level", "score"])
    .where("complaint_id", "=", complaintId)
    .where("is_current", "=", true)
    .executeTakeFirst();

  await db.transaction().execute(async (trx) => {
    if (current) {
      await trx.updateTable("risk_assessments").set({ is_current: false }).where("id", "=", current.id).execute();
    }

    await trx
      .insertInto("risk_assessments")
      .values({
        complaint_id: complaintId,
        risk_level: newRiskLevel,
        score: current ? Number(current.score) : 0,
        factor_breakdown: JSON.stringify({
          note: "Admin override — the original AI-computed breakdown is preserved on the prior (now non-current) row, not recomputed here.",
        }),
        is_admin_override: true,
        override_reason: parsed.data.reason,
        overridden_by: guard.session.user.id,
        is_current: true,
      })
      .execute();

    await trx
      .insertInto("audit_logs")
      .values({
        actor_id: guard.session.user.id,
        action: "risk_override",
        entity_type: "complaint",
        entity_id: complaintId,
        before: JSON.stringify({ riskLevel: current?.risk_level ?? null }),
        after: JSON.stringify({ riskLevel: newRiskLevel, reason: parsed.data.reason }),
        ip_address: ipForStorage(ip),
      })
      .execute();
  });

  return { ok: true };
}
