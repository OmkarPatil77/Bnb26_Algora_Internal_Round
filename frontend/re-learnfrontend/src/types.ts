export type Candidate = {
  id: string;
  label: string;
  confidence: number;
};

export type Question = {
  id: string;
  kind: "fix" | "predict";
  prompt: string;
  code: string;
};

export type AttemptPayload = {
  questionId: string;
  answer: string;
  reasoning?: string;
};

export type DiagnosisOutcome = "misconception" | "uncertain" | "correct" | "unknown";

export type Diagnosis = {
  outcome: DiagnosisOutcome;
  misconceptionId?: string;
  label: string;
  confidence: number;
  uncertain: boolean;
  highlightedLines: number[];
  candidates: Candidate[];
};

export type Probe = {
  id: string;
  prompt: string;
  options: string[];
};

export type ProbeAnswerResponse = {
  predictedMisconceptionId: string;
  label: string;
  confidence: number;
  before: Candidate[];
  after: Candidate[];
  updated: boolean;
};

export type TraceStep = {
  line: number;
  label: string;
  variables: Record<string, string>;
};

export type PredictThenRun = {
  snippet: string;
  prompt: string;
  expected: string;
};

export type Intervention = {
  misconceptionId: string;
  title: string;
  interventionType:
    "cognitive_conflict" | "predict-then-reveal" | "code_trace" | "analogy" | string;
  explanation: string;
  counterexample: string;
  trace: TraceStep[];
  output?: string;
  returnValue?: unknown;
  predictThenRun: PredictThenRun;
  degraded?: boolean;
};

export type ReassessmentItem = {
  step: number;
  delayed: boolean;
  problemId: string;
  statement: string;
  options: string[];
};

export type ReassessmentResult = {
  correct: boolean;
  status: "Resolved" | "Partially resolved" | "Still present";
  score: number;
  step: number;
  nextStep: number;
  resolved: boolean;
  pPresent: number;
};

export type LearnerMisconception = {
  id: string;
  label: string;
  status: "Active" | "Intervened" | "Resolved" | "Recurred";
  pPresent: number;
  attempts: number;
};

export type LearnerStats = {
  ideasExplored: number;
  probeAccuracy: number | null;
  ideasResolved: number;
  streakDays: number;
};

export type LearnerProfile = {
  isDemo: boolean;
  misconceptions: LearnerMisconception[];
  stats: LearnerStats;
};

export type EvaluationMetrics = {
  headline: {
    test_accuracy: number;
    test_macro_f1: number;
    test_weighted_f1: number;
    classes: Array<{
      id: string;
      name: string;
      precision?: number;
      recall?: number;
      f1: number;
      support: number;
    }>;
    confusion_matrix: {
      class_order: string[];
      matrix: number[][];
    };
    unseen_misconception_detection: {
      target_class: string;
      unknown_threshold: number;
      detection_rate: number;
      samples_tested: number;
    };
    probe_uplift: {
      mode?: string;
      before_probe_accuracy: number;
      after_probe_accuracy: number;
      uplift_delta: number;
      overlap_samples_evaluated: number;
    };
  };
  validation: {
    val_accuracy: number;
    val_macro_f1: number;
    val_weighted_f1: number;
    samples_evaluated: number;
  };
  split_leakage: {
    method: string;
    val_overlap_share: number;
    test_overlap_share: number;
    val_overlap_count?: number;
    test_overlap_count?: number;
    description?: string;
    details?: string;
  };
  splits: {
    train_samples: number;
    val_samples: number;
    test_samples: number;
    overlap_set_samples: number;
    total_samples: number;
  };
};
