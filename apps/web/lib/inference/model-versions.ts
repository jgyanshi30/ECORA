import { DEBRIS_CLASSES } from "@ecora/shared";

import { db } from "@/lib/db";

export interface InferenceServiceHealth {
  status: string;
  model_version: string;
  runtime: "pt" | "onnx";
  model_loaded: boolean;
  model_path: string;
}

export async function fetchInferenceServiceHealth(baseUrl: string): Promise<InferenceServiceHealth> {
  const response = await fetch(`${baseUrl}/health`);
  if (!response.ok) {
    throw new Error(`Inference service health check failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Upserts the `model_versions` row for whatever the inference service
 * reports it's actually running — this service is the single source of
 * truth for its own version/runtime/path (CLAUDE.md §6), not a value
 * duplicated into apps/web's own env vars. `class_map` is our own shared
 * constant since the /health contract doesn't (and shouldn't) echo the full
 * class list back on every call.
 */
export async function ensureModelVersion(health: InferenceServiceHealth): Promise<string> {
  const existing = await db
    .selectFrom("model_versions")
    .select("id")
    .where("version", "=", health.model_version)
    .executeTakeFirst();
  if (existing) return existing.id;

  const inserted = await db
    .insertInto("model_versions")
    .values({
      version: health.model_version,
      runtime: health.runtime,
      model_path: health.model_path,
      class_map: JSON.stringify(DEBRIS_CLASSES),
    })
    .onConflict((oc) => oc.column("version").doNothing())
    .returning("id")
    .executeTakeFirst();

  if (inserted) return inserted.id;

  // Lost a race with another worker inserting the same version concurrently.
  const row = await db
    .selectFrom("model_versions")
    .select("id")
    .where("version", "=", health.model_version)
    .executeTakeFirstOrThrow();
  return row.id;
}
