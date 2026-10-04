import { describe, it, expect } from "vitest";
import { updateBKT, getReassessmentStatus, transitionOnDiagnosis } from "./bkt.js";

describe("Bayesian Knowledge Tracing (BKT)", () => {
  it("decreases p(Present) upon correct answer", () => {
    const prior = 0.70;
    const posterior = updateBKT(prior, true, { slip: 0.10, numOptions: 4 });
    // Prior pPresent 0.70 => pKnow 0.30, slip 0.1, guess 0.25
    // num = 0.3 * 0.9 = 0.27
    // den = 0.27 + 0.7 * 0.25 = 0.445
    // pKnow' = 0.27 / 0.445 = 0.6067 => pPresent' = 0.393
    expect(posterior).toBeLessThan(prior);
    expect(posterior).toBeCloseTo(0.393, 2);
  });

  it("increases p(Present) upon incorrect answer", () => {
    const prior = 0.50;
    const posterior = updateBKT(prior, false, { slip: 0.10, numOptions: 4 });
    // Prior pPresent 0.50 => pKnow 0.50, slip 0.1, guess 0.25
    // num = 0.5 * 0.1 = 0.05
    // den = 0.05 + 0.5 * 0.75 = 0.425
    // pKnow' = 0.05 / 0.425 = 0.1176 => pPresent' = 0.882
    expect(posterior).toBeGreaterThan(prior);
    expect(posterior).toBeCloseTo(0.882, 2);
  });

  it("caps start prior at 0.90", () => {
    const highPrior = 0.98;
    const posterior = updateBKT(highPrior, true, { slip: 0.10, numOptions: 4 });
    expect(posterior).toBeLessThan(0.90);
  });

  it("matches reference sequence for guess 0.25 (slip 0.1, start pPresent 0.9)", () => {
    let p = 0.90;
    p = updateBKT(p, true, { slip: 0.10, guess: 0.25 });
    expect(p).toBe(0.714);

    p = updateBKT(p, true, { slip: 0.10, guess: 0.25 });
    expect(p).toBeCloseTo(0.410, 2);

    p = updateBKT(p, true, { slip: 0.10, guess: 0.25 });
    expect(p).toBeCloseTo(0.162, 2);
  });

  it("matches reference sequence for guess 0.5 (slip 0.1, start pPresent 0.9)", () => {
    let p = 0.90;
    p = updateBKT(p, true, { slip: 0.10, guess: 0.50 });
    expect(p).toBe(0.833);

    p = updateBKT(p, true, { slip: 0.10, guess: 0.50 });
    expect(p).toBe(0.735);

    p = updateBKT(p, true, { slip: 0.10, guess: 0.50 });
    expect(p).toBe(0.606);
  });

  it("evaluates reassessment resolution score correctly", () => {
    expect(getReassessmentStatus(3)).toBe("Resolved");
    expect(getReassessmentStatus(2)).toBe("Partially resolved");
    expect(getReassessmentStatus(1)).toBe("Still present");
    expect(getReassessmentStatus(0)).toBe("Still present");
  });

  it("handles transition on re-diagnosis", () => {
    expect(transitionOnDiagnosis(undefined)).toBe("Active");
    expect(transitionOnDiagnosis("Active")).toBe("Active");
    expect(transitionOnDiagnosis("Intervened")).toBe("Intervened");
    expect(transitionOnDiagnosis("Resolved")).toBe("Recurred");
  });
});
