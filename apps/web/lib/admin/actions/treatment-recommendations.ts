"use server";

import { isDebrisClassName } from "@ecora/shared";
import { z } from "zod";

import { requireAdminAction } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { getClientIp, ipForStorage } from "@/lib/request-ip";

export interface TreatmentRecommendationResult {
  ok: boolean;
  error?: string;
}

const recommendationSchema = z.string().trim().min(5, "Recommendation is too short.").max(1000);

/**
 * CLAUDE.md §8: "Editable-by-admin ... store as data, not hardcoded switch
 * logic, so admins can edit." `treatment_recommendations` has no UUID PK
 * (`class_name` is TEXT), so `audit_logs.entity_id` — which is NOT NULL
 * UUID — gets a fresh random id here purely to satisfy that constraint; the
 * real identity of the edit is `className` in the before/after JSON, same
 * as every other field the audit log actually cares about.
 */
export async function updateTreatmentRecommendationAction(className: string, recommendation: string): Promise<TreatmentRecommendationResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error };

  const ip = await getClientIp();
  if (!checkRateLimit(`admin-treatment-recommendation:${ip}`, 40, 15 * 60 * 1000).allowed) {
    return { ok: false, error: "Too many requests. Wait a few minutes and try again." };
  }

  if (!isDebrisClassName(className)) {
    return { ok: false, error: "Invalid debris class." };
  }
  const parsed = recommendationSchema.safeParse(recommendation);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid recommendation." };

  const current = await db
    .selectFrom("treatment_recommendations")
    .select("recommendation")
    .where("class_name", "=", className)
    .executeTakeFirst();
  if (!current) return { ok: false, error: "Unknown debris class." };

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("treatment_recommendations")
      .set({
        recommendation: parsed.data,
        updated_by: guard.session.user.id,
        updated_at: new Date().toISOString(),
      })
      .where("class_name", "=", className)
      .execute();

    await trx
      .insertInto("audit_logs")
      .values({
        actor_id: guard.session.user.id,
        action: "treatment_recommendation_updated",
        entity_type: "treatment_recommendation",
        entity_id: crypto.randomUUID(),
        before: JSON.stringify({ className, recommendation: current.recommendation }),
        after: JSON.stringify({ className, recommendation: parsed.data }),
        ip_address: ipForStorage(ip),
      })
      .execute();
  });

  return { ok: true };
}
