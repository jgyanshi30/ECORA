/**
 * Confirmed model class list (CLAUDE.md §6) — read directly from best.onnx's
 * embedded Ultralytics metadata (`names` property) and verified at load time
 * against services/inference/models/best.onnx. Do not reorder: ids are the
 * model's output indices, not display order.
 *
 * Mirrored (not imported — different runtime) into:
 *   - services/inference/app/constants.py (Python)
 *   - infra/db/migrations/0003_debris_classes.sql (Postgres reference table)
 * A class-list change requires updating all three, plus MODEL_VERSION.
 */
export const DEBRIS_CLASSES = {
  0: "Mask",
  1: "can",
  2: "cellphone",
  3: "electronics",
  4: "gbottle",
  5: "glove",
  6: "metal",
  7: "misc",
  8: "net",
  9: "pbag",
  10: "pbottle",
  11: "plastic",
  12: "rod",
  13: "sunglasses",
  14: "tire",
} as const;

export type DebrisClassId = keyof typeof DEBRIS_CLASSES;

export type DebrisClassName = (typeof DEBRIS_CLASSES)[keyof typeof DEBRIS_CLASSES];

export const DEBRIS_CLASS_NAMES: readonly DebrisClassName[] = Object.values(DEBRIS_CLASSES);

export const DEBRIS_CLASS_IDS: readonly number[] = Object.keys(DEBRIS_CLASSES).map(Number);

export function isDebrisClassName(value: string): value is DebrisClassName {
  return (DEBRIS_CLASS_NAMES as readonly string[]).includes(value);
}

export function debrisClassNameFromId(id: number): DebrisClassName | undefined {
  return (DEBRIS_CLASSES as Record<number, DebrisClassName>)[id];
}

/**
 * Suggested starting treatment-recommendation mapping (CLAUDE.md §8).
 * Stored as editable data in Postgres (`treatment_recommendations` table) —
 * this constant is only the seed default, not the authoritative runtime
 * source. Always render with a label that these are operational
 * recommendations requiring admin verification, not automatic instructions.
 */
export const DEFAULT_TREATMENT_RECOMMENDATIONS: Record<DebrisClassName, string> = {
  plastic: "Collection, segregation, transfer to authorised plastic-waste facility",
  pbag: "Collection, segregation, transfer to authorised plastic-waste facility",
  pbottle: "Collection, segregation, transfer to authorised plastic-waste facility",
  can: "Safe recovery, segregation, recycling",
  metal: "Safe recovery, segregation, recycling",
  net: "Specialist retrieval — entanglement/wildlife risk, do not remove by hand",
  electronics: "Hazardous handling, authorised e-waste processing",
  cellphone: "Hazardous handling, authorised e-waste processing",
  gbottle: "Protective handling (sharp-edge risk), glass recycling",
  tire: "Mechanical recovery, transfer to authorised recycler",
  Mask: "Treat as potential biohazard — protective handling, isolate before disposal",
  glove: "Treat as potential biohazard — protective handling, isolate before disposal",
  misc: "Manual inspection, category-specific disposal after review",
  rod: "Manual inspection, category-specific disposal after review",
  sunglasses: "Manual inspection, category-specific disposal after review",
};
