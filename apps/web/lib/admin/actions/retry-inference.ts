"use server";

import { requireAdminAction } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { processInferenceJob } from "@/lib/inference/process-job";
import { getClientIp, ipForStorage } from "@/lib/request-ip";

export interface RetryInferenceResult {
  ok: boolean;
  error?: string;
}

/**
 * CLAUDE.md §13 (hackathon deployment): the retry story for a complaint
 * stuck at AI_ANALYSIS_PENDING after a transient inference failure during
 * submission (the inference service was briefly down, a timeout, a network
 * blip). `processInferenceJob` is idempotent-safe to call again for any
 * complaint still at that status — it's a no-op for anything else — so an
 * admin-visible retry button is the simplest real recovery path, and one
 * that needs no new infrastructure (no queue, no cron), appropriate for a
 * deployment that deliberately has neither.
 */
export async function retryInferenceAction(complaintId: string): Promise<RetryInferenceResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error };

  const ip = await getClientIp();
  if (!checkRateLimit(`admin-retry-inference:${ip}`, 20, 15 * 60 * 1000).allowed) {
    return { ok: false, error: "Too many requests. Wait a few minutes and try again." };
  }

  const complaint = await db.selectFrom("complaints").select(["id", "status"]).where("id", "=", complaintId).executeTakeFirst();
  if (!complaint) return { ok: false, error: "Complaint not found." };
  if (complaint.status !== "AI_ANALYSIS_PENDING") {
    return { ok: false, error: "This complaint is not awaiting analysis." };
  }

  try {
    await processInferenceJob(complaintId);
  } catch (error) {
    await db
      .insertInto("audit_logs")
      .values({
        actor_id: guard.session.user.id,
        action: "inference_retry_failed",
        entity_type: "complaint",
        entity_id: complaintId,
        before: null,
        after: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
        ip_address: ipForStorage(ip),
      })
      .execute();
    return { ok: false, error: "Inference still failed — check the inference service is reachable and try again." };
  }

  await db
    .insertInto("audit_logs")
    .values({
      actor_id: guard.session.user.id,
      action: "inference_retried",
      entity_type: "complaint",
      entity_id: complaintId,
      before: JSON.stringify({ status: "AI_ANALYSIS_PENDING" }),
      after: null,
      ip_address: ipForStorage(ip),
    })
    .execute();

  return { ok: true };
}
