import type { DebrisClassName } from "@ecora/shared";

import { db } from "@/lib/db";

/**
 * CLAUDE.md §8's own table groups the 15 verified debris classes (§6) into
 * these 8 categories for its suggested-mapping table. This is display-only
 * grouping for the admin UI — the data model stays keyed off the actual 15
 * classes (`treatment_recommendations.class_name`), never a parallel
 * category concept of its own.
 */
export const TREATMENT_CATEGORIES: { label: string; classNames: DebrisClassName[] }[] = [
  { label: "Plastics", classNames: ["plastic", "pbag", "pbottle"] },
  { label: "Metal & cans", classNames: ["can", "metal"] },
  { label: "Fishing nets", classNames: ["net"] },
  { label: "Batteries & electronics", classNames: ["electronics", "cellphone"] },
  { label: "Glass", classNames: ["gbottle"] },
  { label: "Tyres", classNames: ["tire"] },
  { label: "Medical & hazardous", classNames: ["Mask", "glove"] },
  { label: "Mixed / miscellaneous", classNames: ["misc", "rod", "sunglasses"] },
];

export interface TreatmentRecommendationRow {
  className: DebrisClassName;
  recommendation: string;
  updatedByName: string | null;
  updatedAt: Date;
}

/** All 15 rows — always exactly 15 since migration 0016 seeds one per verified class and class_name is a FK to debris_classes, not something admins can add/remove. */
export async function getTreatmentRecommendations(): Promise<Map<string, TreatmentRecommendationRow>> {
  const rows = await db
    .selectFrom("treatment_recommendations")
    .leftJoin("users", "users.id", "treatment_recommendations.updated_by")
    .select([
      "treatment_recommendations.class_name",
      "treatment_recommendations.recommendation",
      "treatment_recommendations.updated_at",
      "users.full_name as updated_by_name",
    ])
    .execute();

  const map = new Map<string, TreatmentRecommendationRow>();
  for (const r of rows) {
    map.set(r.class_name, {
      className: r.class_name as DebrisClassName,
      recommendation: r.recommendation,
      updatedByName: r.updated_by_name,
      updatedAt: r.updated_at,
    });
  }
  return map;
}

/** Single-row lookup for the admin complaint-review page — the current recommendation for one complaint's (AI-suggested or admin-corrected) class. */
export async function getTreatmentRecommendation(className: string): Promise<string | null> {
  const row = await db
    .selectFrom("treatment_recommendations")
    .select("recommendation")
    .where("class_name", "=", className)
    .executeTakeFirst();
  return row?.recommendation ?? null;
}
