import type {
  Diagnosis,
  EvaluationMetrics,
  Intervention,
  LearnerMisconception,
  Probe,
  Question,
  ReassessmentResult,
} from "@/types";

export const USE_MOCK = true;
const wait = () => new Promise((resolve) => setTimeout(resolve, 320));

export const question: Question = {
  id: "list-aliasing",
  kind: "predict",
  prompt: "What do you think will be printed? Take a moment to picture what each name points to.",
  code: "a = [1, 2]\nb = a\nb.append(3)\nprint(a)",
};

export async function submitAttempt(answer: string, reasoning: string): Promise<Diagnosis> {
  await wait();
  void answer;
  void reasoning;
  return {
    outcome: "misconception",
    misconceptionId: "M04",
    label: "You may think `b = a` makes a separate copy of the list",
    confidence: 58,
    uncertain: false,
    candidates: [
      { id: "M04", label: "Assignment makes a copy", confidence: 58 },
      { id: "M01", label: "Changing `b` also changes `a`", confidence: 31 },
      { id: "M06", label: "`append()` creates a new list", confidence: 11 },
    ],
    highlightedLines: [2, 3],
  };
}

export async function getProbe(): Promise<Probe> {
  await wait();
  return {
    id: "alias-probe",
    prompt: "One more small check: after these lines, what is in `first`?",
    options: ["[8, 9]", "[8]"],
  };
}

export async function getIntervention(): Promise<Intervention> {
  await wait();
  return {
    misconceptionId: "M04",
    title: "b = a copies a list (aliasing)",
    interventionType: "cognitive_conflict",
    explanation:
      "In Python, a list lives in one place in memory. `b = a` gives that same list a second name—it doesn't make a new list. So when `b` changes the list, looking through `a` shows the change too.",
    counterexample: "b = a does not clone a list; use b = list(a) or a.copy() instead.",
    trace: [
      { line: 1, label: "Python makes one list", variables: { a: "[1, 2] → list #1", b: "—" } },
      {
        line: 2,
        label: "A second name points to list #1",
        variables: { a: "[1, 2] → list #1", b: "[1, 2] → list #1" },
      },
      {
        line: 3,
        label: "The shared list gains a value",
        variables: { a: "[1, 2, 3] → list #1", b: "[1, 2, 3] → list #1" },
      },
      {
        line: 4,
        label: "Both names show the same list",
        variables: { a: "[1, 2, 3]", b: "[1, 2, 3]" },
      },
    ],
    predictThenRun: {
      snippet: "a = [1]\nb = a\nb.append(2)\nprint(a)",
      prompt: "What will print(a) output?",
      expected: "[1, 2]",
    },
    degraded: false,
  };
}

export async function submitReassessment(
  step: number,
  answer: string,
): Promise<ReassessmentResult> {
  await wait();
  void answer;
  return {
    correct: true,
    status: step >= 2 ? "Resolved" : "Partially resolved",
    score: step >= 2 ? 3 : 2,
    step,
    nextStep: step + 1,
    resolved: step >= 2,
    pPresent: step >= 2 ? 0.08 : 0.35,
  };
}

export async function getLearner(): Promise<{
  isDemo: boolean;
  misconceptions: LearnerMisconception[];
  stats: LearnerProfile["stats"];
}> {
  await wait();
  return {
    isDemo: true,
    misconceptions: [
      {
        id: "M04",
        label: "List assignment vs. copying",
        status: "Resolved",
        pPresent: 0.08,
        attempts: 5,
      },
      { id: "M01", label: "Where `range()` stops", status: "Active", pPresent: 0.71, attempts: 2 },
      {
        id: "M02",
        label: "Which way assignment goes",
        status: "Intervened",
        pPresent: 0.33,
        attempts: 3,
      },
      {
        id: "M06",
        label: "Loop values on each turn",
        status: "Recurred",
        pPresent: 0.54,
        attempts: 4,
      },
      { id: "M03", label: "`return` vs. `print`", status: "Active", pPresent: 0.64, attempts: 1 },
    ],
    stats: {
      ideasExplored: 5,
      probeAccuracy: 82,
      ideasResolved: 1,
      streakDays: 3,
    },
  };
}

export async function getEvaluation(): Promise<EvaluationMetrics> {
  await wait();
  return {
    headline: {
      test_accuracy: 0.84,
      test_macro_f1: 0.81,
      test_weighted_f1: 0.83,
      classes: [
        { id: "M04", name: "Aliasing", f1: 0.91, support: 20 },
        { id: "M01", name: "Range", f1: 0.82, support: 20 },
        { id: "M02", name: "Assignment", f1: 0.86, support: 20 },
        { id: "M06", name: "Loops", f1: 0.78, support: 20 },
        { id: "M03", name: "Return / print", f1: 0.84, support: 20 },
      ],
      confusion_matrix: {
        class_order: ["M04", "M01", "M02", "M06", "M03"],
        matrix: [
          [18, 1, 0, 1, 0],
          [1, 16, 2, 1, 0],
          [0, 1, 17, 1, 1],
          [1, 1, 1, 16, 1],
          [0, 0, 1, 1, 18],
        ],
      },
      unseen_misconception_detection: {
        target_class: "M07",
        unknown_threshold: 0.6,
        detection_rate: 0.8125,
        samples_tested: 16,
      },
      probe_uplift: {
        mode: "simulated",
        before_probe_accuracy: 0.65,
        after_probe_accuracy: 0.84,
        uplift_delta: 0.19,
        overlap_samples_evaluated: 80,
      },
    },
    validation: {
      val_accuracy: 1.0,
      val_macro_f1: 1.0,
      val_weighted_f1: 1.0,
      samples_evaluated: 88,
    },
    split_leakage: {
      method: "variable_normalized_ast_exact_match",
      val_overlap_share: 0.1932,
      test_overlap_share: 0.0,
      val_overlap_count: 17,
      test_overlap_count: 0,
      description: "Normalized AST overlap",
    },
    splits: {
      train_samples: 269,
      val_samples: 88,
      test_samples: 136,
      overlap_set_samples: 80,
      total_samples: 493,
    },
  };
}
