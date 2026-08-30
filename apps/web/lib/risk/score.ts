import type { RiskLevel } from "@ecora/shared";

/**
 * CLAUDE.md §7: risk scoring — "implement as a small, swappable scoring
 * module (not inline in a route handler) so weights can be tuned later.
 * Always store and surface *why* a score was assigned (factor breakdown),
 * not just the final level."
 *
 * Every factor here is a 0-100 sub-score; the final score is their weighted
 * sum. Weights and thresholds are tunable constants, same philosophy as
 * CLAUDE.md §8's treatment-recommendation mapping — expect to retune against
 * real debris reports in production, not treat these as fixed truths.
 *
 * Honesty note on `locationSensitivity`: CLAUDE.md §7 lists "proximity to
 * population/waterways/protected areas" as a factor. Computing that for real
 * needs a geospatial reference dataset (population density, waterway/
 * protected-area polygons) that does not exist anywhere in this repo. Rather
 * than fabricate a number, this factor is a documented placeholder that
 * always contributes a neutral midpoint score — the factor-breakdown record
 * says so explicitly, so nobody mistakes it for a real signal. Wiring in a
 * real dataset later only means changing this one function.
 */

export const CLASS_RISK_WEIGHT: Record<string, number> = {
  net: 1.0, // entanglement/wildlife risk — CLAUDE.md §8's highest-caution category
  electronics: 0.9,
  cellphone: 0.9, // hazardous e-waste
  Mask: 0.8,
  glove: 0.8, // potential biohazard
  gbottle: 0.6, // sharp-edge risk
  tire: 0.5,
  can: 0.4,
  metal: 0.4,
  plastic: 0.3,
  pbag: 0.3,
  pbottle: 0.3,
  misc: 0.2,
  rod: 0.2,
  sunglasses: 0.2,
};

const OBJECT_COUNT_CAP = 10;
const AREA_RATIO_CAP = 0.5;
const NEARBY_COMPLAINTS_CAP = 5;
const COMPLAINT_AGE_CAP_DAYS = 30;
const LOCATION_SENSITIVITY_PLACEHOLDER_SCORE = 50;

export const RISK_WEIGHTS = {
  debrisCategory: 0.3,
  objectCount: 0.15,
  detectionAreaRatio: 0.15,
  locationSensitivity: 0.1,
  nearbyComplaints: 0.15,
  complaintAge: 0.15,
} as const;

export interface RiskFactorScore {
  score: number; // 0-100
  weight: number;
  contribution: number; // score * weight
  detail: string;
}

export interface RiskFactorBreakdown {
  debrisCategory: RiskFactorScore;
  objectCount: RiskFactorScore;
  detectionAreaRatio: RiskFactorScore;
  locationSensitivity: RiskFactorScore;
  nearbyComplaints: RiskFactorScore;
  complaintAge: RiskFactorScore;
}

export interface RiskAssessmentResult {
  level: RiskLevel;
  score: number; // 0-100
  factorBreakdown: RiskFactorBreakdown;
}

export interface RiskFactorInputs {
  detections: { className: string; bboxAreaPx: number }[];
  imageAreaPx: number;
  nearbyComplaintCount: number;
  complaintAgeDays: number;
}

function levelForScore(score: number): RiskLevel {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}

export function assessRisk(inputs: RiskFactorInputs): RiskAssessmentResult {
  const { detections, imageAreaPx, nearbyComplaintCount, complaintAgeDays } = inputs;

  const debrisCategoryRaw =
    detections.length === 0 ? 0 : Math.max(...detections.map((d) => CLASS_RISK_WEIGHT[d.className] ?? 0.2));
  const debrisCategory: RiskFactorScore = {
    score: debrisCategoryRaw * 100,
    weight: RISK_WEIGHTS.debrisCategory,
    contribution: debrisCategoryRaw * 100 * RISK_WEIGHTS.debrisCategory,
    detail:
      detections.length === 0
        ? "No detections — no category risk to score."
        : `Highest-risk detected category weight: ${(debrisCategoryRaw * 100).toFixed(0)}/100.`,
  };

  const objectCountScoreRaw = Math.min(detections.length, OBJECT_COUNT_CAP) / OBJECT_COUNT_CAP;
  const objectCount: RiskFactorScore = {
    score: objectCountScoreRaw * 100,
    weight: RISK_WEIGHTS.objectCount,
    contribution: objectCountScoreRaw * 100 * RISK_WEIGHTS.objectCount,
    detail: `${detections.length} object(s) detected (capped at ${OBJECT_COUNT_CAP} for scoring).`,
  };

  const totalDetectionArea = detections.reduce((sum, d) => sum + d.bboxAreaPx, 0);
  const areaRatio = imageAreaPx > 0 ? totalDetectionArea / imageAreaPx : 0;
  const areaRatioScoreRaw = Math.min(areaRatio / AREA_RATIO_CAP, 1);
  const detectionAreaRatio: RiskFactorScore = {
    score: areaRatioScoreRaw * 100,
    weight: RISK_WEIGHTS.detectionAreaRatio,
    contribution: areaRatioScoreRaw * 100 * RISK_WEIGHTS.detectionAreaRatio,
    detail: `Detected debris covers ~${(areaRatio * 100).toFixed(1)}% of the image.`,
  };

  const locationSensitivity: RiskFactorScore = {
    score: LOCATION_SENSITIVITY_PLACEHOLDER_SCORE,
    weight: RISK_WEIGHTS.locationSensitivity,
    contribution: LOCATION_SENSITIVITY_PLACEHOLDER_SCORE * RISK_WEIGHTS.locationSensitivity,
    detail:
      "Placeholder — no population/waterway/protected-area geospatial dataset is wired in yet; always scores at a neutral midpoint until one is.",
  };

  const nearbyScoreRaw = Math.min(nearbyComplaintCount, NEARBY_COMPLAINTS_CAP) / NEARBY_COMPLAINTS_CAP;
  const nearbyComplaints: RiskFactorScore = {
    score: nearbyScoreRaw * 100,
    weight: RISK_WEIGHTS.nearbyComplaints,
    contribution: nearbyScoreRaw * 100 * RISK_WEIGHTS.nearbyComplaints,
    detail: `${nearbyComplaintCount} other complaint(s) within 500m in the last 90 days.`,
  };

  const ageScoreRaw = Math.min(Math.max(complaintAgeDays, 0), COMPLAINT_AGE_CAP_DAYS) / COMPLAINT_AGE_CAP_DAYS;
  const complaintAge: RiskFactorScore = {
    score: ageScoreRaw * 100,
    weight: RISK_WEIGHTS.complaintAge,
    contribution: ageScoreRaw * 100 * RISK_WEIGHTS.complaintAge,
    detail: `${complaintAgeDays.toFixed(1)} day(s) since submission (capped at ${COMPLAINT_AGE_CAP_DAYS} for scoring).`,
  };

  const factorBreakdown: RiskFactorBreakdown = {
    debrisCategory,
    objectCount,
    detectionAreaRatio,
    locationSensitivity,
    nearbyComplaints,
    complaintAge,
  };

  const score = Object.values(factorBreakdown).reduce((sum, f) => sum + f.contribution, 0);

  return { level: levelForScore(score), score, factorBreakdown };
}
