export type MisconceptionStatus = "Active" | "Intervened" | "Resolved" | "Recurred";
export type ReassessmentStatus = "Resolved" | "Partially resolved" | "Still present";

export interface BKTParams {
  slip?: number; // default 0.10
  guess?: number; // default based on numOptions
  numOptions?: number; // default 4 -> guess = 0.25
}

/**
 * Updates the posterior probability p(Present) of holding a misconception using standard BKT.
 *
 * Let pKnow = 1 - pPresent (the belief that the student knows the correct concept).
 * - slip s = P(Incorrect | Know) = 0.10  => P(Correct | Know) = 1 - s = 0.90
 * - guess g = P(Correct | ~Know) = 1 / numOptions (e.g. 0.25 for 4 options)
 *
 * When student answers correctly:
 *   pKnow' = (pKnow * (1 - s)) / [pKnow * (1 - s) + (1 - pKnow) * g]
 * When student answers incorrectly:
 *   pKnow' = (pKnow * s) / [pKnow * s + (1 - pKnow) * (1 - g)]
 *
 * pPresent' = 1 - pKnow'
 */
export function updateBKT(
  pPresent: number,
  isCorrect: boolean,
  params: BKTParams = {}
): number {
  const s = params.slip ?? 0.10;
  const numOptions = params.numOptions ?? 4;
  const g = params.guess ?? (1.0 / numOptions);

  // Cap initial prior pPresent at 0.90 => min pKnow = 0.10
  const priorPresent = Math.min(Math.max(pPresent, 0.001), 0.90);
  const pKnow = 1.0 - priorPresent;

  let pKnowPosterior: number;
  if (isCorrect) {
    const num = pKnow * (1.0 - s);
    const den = pKnow * (1.0 - s) + (1.0 - pKnow) * g;
    pKnowPosterior = den > 0 ? num / den : 1.0;
  } else {
    const num = pKnow * s;
    const den = pKnow * s + (1.0 - pKnow) * (1.0 - g);
    pKnowPosterior = den > 0 ? num / den : 0.0;
  }

  const pPresentPosterior = 1.0 - pKnowPosterior;
  return parseFloat(Math.min(Math.max(pPresentPosterior, 0.001), 0.999).toFixed(3));
}

/**
 * Maps reassessment correct count out of 3 to status.
 */
export function getReassessmentStatus(score: number, total = 3): ReassessmentStatus {
  if (score >= 3) return "Resolved";
  if (score === 2) return "Partially resolved";
  return "Still present";
}

/**
 * Calculates learner misconception status transition upon new diagnosis.
 */
export function transitionOnDiagnosis(currentStatus?: MisconceptionStatus): MisconceptionStatus {
  if (!currentStatus) return "Active";
  if (currentStatus === "Resolved") return "Recurred";
  return currentStatus;
}
