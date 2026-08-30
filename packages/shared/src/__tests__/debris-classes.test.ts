import { describe, expect, it } from "vitest";
import {
  DEBRIS_CLASSES,
  DEBRIS_CLASS_NAMES,
  DEBRIS_CLASS_IDS,
  DEFAULT_TREATMENT_RECOMMENDATIONS,
  debrisClassNameFromId,
  isDebrisClassName,
} from "../index.js";

describe("DEBRIS_CLASSES", () => {
  it("has exactly the 15 confirmed classes, id-ordered, from CLAUDE.md §6", () => {
    expect(DEBRIS_CLASS_IDS).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(DEBRIS_CLASS_NAMES).toEqual([
      "Mask",
      "can",
      "cellphone",
      "electronics",
      "gbottle",
      "glove",
      "metal",
      "misc",
      "net",
      "pbag",
      "pbottle",
      "plastic",
      "rod",
      "sunglasses",
      "tire",
    ]);
  });

  it("maps specific ids to the names verified against best.onnx metadata", () => {
    expect(DEBRIS_CLASSES[0]).toBe("Mask");
    expect(DEBRIS_CLASSES[11]).toBe("plastic");
    expect(DEBRIS_CLASSES[14]).toBe("tire");
    expect(debrisClassNameFromId(9)).toBe("pbag");
    expect(debrisClassNameFromId(99)).toBeUndefined();
  });

  it("isDebrisClassName narrows correctly", () => {
    expect(isDebrisClassName("plastic")).toBe(true);
    expect(isDebrisClassName("Plastic")).toBe(false);
    expect(isDebrisClassName("banana")).toBe(false);
  });
});

describe("DEFAULT_TREATMENT_RECOMMENDATIONS", () => {
  it("has a recommendation for every one of the 15 classes", () => {
    for (const name of DEBRIS_CLASS_NAMES) {
      expect(DEFAULT_TREATMENT_RECOMMENDATIONS[name]).toBeTruthy();
    }
    expect(Object.keys(DEFAULT_TREATMENT_RECOMMENDATIONS)).toHaveLength(15);
  });
});
