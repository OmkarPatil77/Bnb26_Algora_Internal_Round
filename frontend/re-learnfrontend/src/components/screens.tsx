import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowLeft,
  BookOpen,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Code2,
  HelpCircle,
  Leaf,
  Lightbulb,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import studyImage from "@/assets/relearn-study.png";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/session-context";
import {
  getEvaluation,
  getIntervention,
  getLearner,
  getProbe,
  getQuestion,
  getReassessment,
  submitAttempt,
  submitProbeAnswer,
  submitReassessment,
} from "@/services/api";
import {
  AppFrame,
  CalmErrorState,
  CodeEditor,
  ConfidenceBars,
  DemoHelper,
  PageHeading,
  StepPills,
  Surface,
} from "@/components/learning";
import type {
  Diagnosis,
  EvaluationMetrics,
  Intervention,
  LearnerMisconception,
  LearnerProfile,
  Probe,
  ProbeAnswerResponse,
  Question,
  ReassessmentItem,
  ReassessmentResult,
} from "@/types";

const routeWrap = (content: React.ReactNode, isDemo = false) => (
  <AppFrame isDemo={isDemo}>
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">{content}</div>
  </AppFrame>
);

// -------------------------------------------------------------
// 1. HOME SCREEN
// -------------------------------------------------------------
export function HomeScreen() {
  const { resetSession } = useSession();

  return (
    <AppFrame>
      <div className="mx-auto max-w-7xl px-5 pb-14 pt-8 sm:px-8 sm:pt-12">
        <section className="grid items-center gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="py-5 sm:py-12">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/75 px-3.5 py-2 text-xs font-semibold text-secondary-foreground">
              <span className="size-2 rounded-full bg-sage" />A gentler way to learn Python
            </div>
            <h1 className="max-w-2xl font-display text-4xl font-extrabold leading-[1.1] text-foreground sm:text-6xl">
              The answer is only <span className="text-primary">the beginning.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              Other platforms ask “is it right?” Re:Learn asks “what do you believe, and how do we
              know it’s changed?”
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-7 text-base">
                <Link to="/session/question" onClick={resetSession}>
                  Start session
                  <ArrowRight size={18} />
                </Link>
              </Button>
              <Link
                to="/dashboard"
                className="rounded-full px-4 py-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-sage-soft"
              >
                My learning
              </Link>
            </div>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-peach-soft px-3 py-1.5 text-xs font-semibold text-accent-foreground">
              <Code2 size={14} />
              Python Basics
            </div>
            <div
              className="mt-9 flex max-w-xl items-center gap-2 sm:gap-3"
              aria-label="Learning steps"
            >
              <StepItem number="01" label="Notice" />
              <span className="h-px flex-1 bg-border" />
              <StepItem number="02" label="Understand" />
              <span className="h-px flex-1 bg-border" />
              <StepItem number="03" label="Try again" />
            </div>
          </div>
          <div className="relative min-h-72 overflow-hidden rounded-3xl border border-border/70 bg-peach-soft/30 sm:min-h-[410px]">
            <img
              src={studyImage}
              alt="An open notebook with Python code, a pencil and leafy plants"
              width={1440}
              height={1008}
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/90 px-3.5 py-2 text-xs font-semibold text-secondary-foreground">
              <Sparkles size={14} />
              Mistakes are how we find what to learn
            </div>
          </div>
        </section>
        <section className="mt-14 border-t border-border/70 pt-7">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="font-display text-xl font-bold">A little at a time, together.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Start with a hunch. Leave with a stronger understanding.
              </p>
            </div>
            <div className="flex items-center gap-5 text-sm">
              <Link
                to="/evaluation"
                className="font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Evaluation view
              </Link>
              <Link
                to="/dashboard"
                className="font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Learner dashboard
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppFrame>
  );
}

function StepItem({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded-full bg-sage-soft text-[10px] font-bold text-secondary-foreground">
        {number}
      </span>
      <span className="text-xs font-semibold text-muted-foreground sm:text-sm">{label}</span>
    </div>
  );
}

// -------------------------------------------------------------
// 2. QUESTION SCREEN (Fix/Write Code)
// -------------------------------------------------------------
export function QuestionScreen() {
  const navigate = useNavigate();
  const {
    activeQuestion,
    setActiveQuestion,
    answer,
    setAnswer,
    reasoning,
    setReasoning,
    setDiagnosis,
  } = useSession();
  const [loading, setLoading] = useState(!activeQuestion);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProblem = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = await getQuestion("sum_to_n");
      setActiveQuestion(q);
      setAnswer(q.code);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to load problem");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeQuestion) {
      void fetchProblem();
    } else {
      if (!answer) setAnswer(activeQuestion.code);
      setLoading(false);
    }
  }, []);

  const handleSubmit = async () => {
    if (!answer.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const diag = await submitAttempt(answer, reasoning, activeQuestion?.id || "sum_to_n");
      setDiagnosis(diag);
      void navigate({ to: "/session/diagnosis" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to analyze code");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return routeWrap(
      <div className="py-20 text-center text-muted-foreground">
        Loading your session challenge…
      </div>,
    );
  }

  if (error && !activeQuestion) {
    return routeWrap(<CalmErrorState message={error} onRetry={fetchProblem} />);
  }

  return routeWrap(
    <>
      <PageHeading
        eyebrow="Your session · 01 / 04"
        title="Let's start with a hunch."
        description="There’s no score here. We’re just getting curious about what you already know."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Surface>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-primary">
                Your Code Submission
              </span>
              <span className="text-xs text-muted-foreground">Python 3</span>
            </div>
            <CodeEditor value={answer} onChange={setAnswer} readOnly={false} height="320px" />
          </Surface>
          <Surface className="bg-sage-soft/50">
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary-foreground">
              <BookOpen size={16} />
              Problem Goal
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{activeQuestion?.prompt}</p>
          </Surface>
        </div>
        <Surface>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-lavender-soft px-3 py-1.5 text-xs font-semibold text-foreground">
            <Code2 size={14} />
            Write your solution
          </div>
          <h2 className="font-display text-xl font-bold leading-7 text-foreground">
            {activeQuestion?.prompt}
          </h2>

          <div className="mt-6">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Anything about your thinking you'd like to share? (optional)
              </span>
              <Textarea
                className="min-h-24 resize-y rounded-xl bg-background"
                placeholder="Share any thoughts, intuitions, or questions…"
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                aria-label="Anything about your thinking you'd like to share? (optional)"
              />
            </label>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-peach/50 bg-peach-soft p-3 text-xs text-accent-foreground">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">Take your time · Step 1 of 4</p>
            <Button
              size="lg"
              className="h-11 rounded-full px-6"
              disabled={!answer.trim() || busy}
              onClick={handleSubmit}
            >
              {busy ? "Analyzing…" : "Submit answer"}
              <ArrowRight size={16} />
            </Button>
          </div>
        </Surface>
      </div>
      <DemoHelper
        step="See what your answer tells us"
        to="/session/diagnosis"
        label="Go to diagnosis"
      />
    </>,
  );
}

// -------------------------------------------------------------
// 3. DIAGNOSIS SCREEN
// -------------------------------------------------------------
export function DiagnosisScreen() {
  const navigate = useNavigate();
  const { diagnosis, answer } = useSession();

  if (!diagnosis) {
    return routeWrap(
      <div className="py-20 text-center">
        <p className="text-muted-foreground">No active diagnosis found for this session.</p>
        <Button
          className="mt-4 rounded-full"
          onClick={() => void navigate({ to: "/session/question" })}
        >
          Start with a question
        </Button>
      </div>,
    );
  }

  // Route outcomes: correct | unknown | uncertain | misconception
  if (diagnosis.outcome === "correct") {
    return routeWrap(
      <div className="mx-auto max-w-2xl py-8">
        <Surface className="bg-sage-soft/70 text-center p-8 sm:p-10">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-card text-primary mb-4 shadow-sm">
            <Check size={32} />
          </div>
          <div className="inline-flex rounded-full bg-card px-3.5 py-1.5 text-xs font-bold text-secondary-foreground mb-3">
            All Tests Passed
          </div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
            No misconception detected!
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Your code ran cleanly and passed all validation tests. Great work!
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild className="h-11 rounded-full px-6">
              <Link to="/session/question">Try another challenge</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-full px-6">
              <Link to="/dashboard">My learning</Link>
            </Button>
          </div>
        </Surface>
      </div>,
    );
  }

  if (diagnosis.outcome === "unknown") {
    return routeWrap(
      <div className="mx-auto max-w-2xl py-8">
        <Surface className="bg-peach-soft/60 text-center p-8 sm:p-10">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-card text-accent-foreground mb-4 shadow-sm">
            <HelpCircle size={32} />
          </div>
          <div className="inline-flex rounded-full bg-card px-3.5 py-1.5 text-xs font-bold text-accent-foreground mb-3">
            Uncertain Behavior
          </div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
            We couldn't detect a specific pattern.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Your code produced unexpected outputs, but did not match a known standard misconception.
            Take another look at variable bounds and return values.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild className="h-11 rounded-full px-7">
              <Link to="/session/question">Try again</Link>
            </Button>
          </div>
        </Surface>
      </div>,
    );
  }

  const isUncertain = diagnosis.outcome === "uncertain" || diagnosis.uncertain;

  return routeWrap(
    <>
      <PageHeading
        eyebrow="Your session · 02 / 04"
        title="Let's look at this together."
        description="A small clue is helping us understand how you picture the code."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_0.94fr]">
        <div className="space-y-4">
          <Surface className="bg-peach-soft/50">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-peach-soft text-accent-foreground">
                <Lightbulb size={19} />
              </span>
              <div>
                <div className="text-sm font-semibold">A possibility we’re exploring</div>
                <h2 className="mt-1 font-display text-lg font-bold leading-7">{diagnosis.label}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This is a common place to pause. Let’s see if one more example helps us understand
                  it better.
                </p>
              </div>
            </div>
          </Surface>
          <Surface>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-semibold">The moment that caught our eye</h3>
              {diagnosis.highlightedLines.length > 0 && (
                <span className="rounded-full bg-peach-soft px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                  Line {diagnosis.highlightedLines.join(", ")}
                </span>
              )}
            </div>
            <CodeEditor value={answer} highlightedLines={diagnosis.highlightedLines} />
          </Surface>
        </div>
        <Surface>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold">What might be going on?</h3>
              <p className="mt-1 text-sm text-muted-foreground">A working guess, not a grade.</p>
            </div>
            <span className="rounded-full bg-lavender-soft px-3 py-1.5 text-xs font-semibold text-foreground">
              {isUncertain ? "Still thinking" : "We have a hunch"}
            </span>
          </div>
          <div className="my-6 flex items-center gap-4">
            <div
              className="relative grid size-[76px] place-items-center rounded-full"
              style={{
                background: `conic-gradient(var(--color-sage) ${diagnosis.confidence}%, var(--color-muted) 0)`,
              }}
            >
              <div className="grid size-[62px] place-items-center rounded-full bg-card font-mono text-sm font-semibold">
                {diagnosis.confidence}%
              </div>
            </div>
            <div>
              <div className="font-semibold">Top Candidate</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {isUncertain ? "Multiple explanations are close" : "High confidence match"}
              </p>
            </div>
          </div>
          <ConfidenceBars items={diagnosis.candidates} animate />
          <div className="mt-6 border-t border-border pt-5">
            {isUncertain ? (
              <Button
                className="h-11 w-full rounded-full"
                onClick={() => void navigate({ to: "/session/probe" })}
              >
                Try a quick question
                <ArrowRight size={16} />
              </Button>
            ) : (
              <Button
                className="h-11 w-full rounded-full"
                onClick={() => void navigate({ to: "/session/learn" })}
              >
                Show me why
                <ArrowRight size={16} />
              </Button>
            )}
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Every answer gives us a better clue.
            </p>
          </div>
        </Surface>
      </div>
      <DemoHelper
        step={isUncertain ? "Answer one quick check-in" : "Explore the explanation"}
        to={isUncertain ? "/session/probe" : "/session/learn"}
        label="Continue session"
      />
    </>,
  );
}

// -------------------------------------------------------------
// 4. PROBE SCREEN (Multiple Choice & Bar Animation)
// -------------------------------------------------------------
export function ProbeScreen() {
  const navigate = useNavigate();
  const { diagnosis, probe, setProbe, probeResult, setProbeResult } = useSession();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(!probe);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProbeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProbe(diagnosis?.misconceptionId);
      setProbe(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to load diagnostic probe");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!probe) {
      void fetchProbeData();
    } else {
      setLoading(false);
    }
  }, []);

  const handleOptionSubmit = async () => {
    if (selectedIndex === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await submitProbeAnswer(selectedIndex);
      setProbeResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to evaluate probe answer");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return routeWrap(
      <div className="py-20 text-center text-muted-foreground">Preparing diagnostic question…</div>,
    );
  }

  if (error && !probe) {
    return routeWrap(<CalmErrorState message={error} onRetry={fetchProbeData} />);
  }

  return routeWrap(
    <>
      <PageHeading
        eyebrow="Your session · 02 / 04"
        title="One more little check."
        description="This helps us tell which idea is the best fit—no need to rush."
      />
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-lavender-soft px-3 py-1.5 text-xs font-semibold">
        <CircleHelp size={14} />
        Diagnostic question
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Surface>
          <h2 className="font-display text-xl font-bold leading-7 text-foreground">
            {probe?.prompt}
          </h2>
          <div className="mt-6 space-y-3">
            {probe?.options.map((optText, index) => {
              const isSelected = selectedIndex === index;
              return (
                <button
                  key={optText + index}
                  type="button"
                  disabled={Boolean(probeResult)}
                  onClick={() => setSelectedIndex(index)}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${isSelected
                      ? "border-primary bg-primary/5 font-semibold text-foreground ring-2 ring-primary/20"
                      : "border-border bg-card hover:bg-muted/40 text-foreground"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="font-mono text-sm">{optText}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-peach/50 bg-peach-soft p-3 text-xs text-accent-foreground">
              {error}
            </div>
          )}

          {!probeResult && (
            <div className="mt-6 flex justify-end">
              <Button
                className="h-11 rounded-full px-6"
                disabled={selectedIndex === null || busy}
                onClick={handleOptionSubmit}
              >
                {busy ? "Checking…" : "Check my thinking"}
                <ArrowRight size={16} />
              </Button>
            </div>
          )}
        </Surface>

        <Surface>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Candidate Hypotheses</h3>
            <span className="text-xs text-muted-foreground">
              {probeResult ? "Updated after your answer" : "Initial diagnosis"}
            </span>
          </div>

          {probeResult ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Before check-in
                </p>
                <ConfidenceBars items={probeResult.before} />
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase text-primary mb-2">After check-in</p>
                <ConfidenceBars items={probeResult.after} animate />
              </div>
            </div>
          ) : (
            <ConfidenceBars items={diagnosis?.candidates || []} />
          )}

          {probeResult && (
            <div className="mt-6 rounded-xl border border-sage/40 bg-sage-soft p-4">
              <p className="text-sm font-semibold text-secondary-foreground">
                Confidence updated to {probeResult.confidence}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                We now have a clearer hypothesis ({probeResult.label}).
              </p>
              <Button
                className="mt-4 h-10 w-full rounded-full"
                onClick={() => void navigate({ to: "/session/learn" })}
              >
                Continue to the explanation
                <ArrowRight size={15} />
              </Button>
            </div>
          )}
        </Surface>
      </div>
      <DemoHelper
        step="Explore how the code executes"
        to="/session/learn"
        label="Continue to explanation"
      />
    </>,
  );
}

// -------------------------------------------------------------
// 5. LEARN SCREEN (Stepper, Variables Table, Predict-Then-Run)
// -------------------------------------------------------------
export function LearnScreen() {
  const navigate = useNavigate();
  const { diagnosis, intervention, setIntervention, answer } = useSession();
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [prediction, setPrediction] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(!intervention);
  const [error, setError] = useState<string | null>(null);

  const fetchInterventionData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIntervention(diagnosis?.misconceptionId, answer);
      setIntervention(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to load explanation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!intervention) {
      void fetchInterventionData();
    } else {
      setLoading(false);
    }
  }, []);

  const trace = intervention?.trace || [];
  const maxStep = Math.max(0, trace.length - 1);

  useEffect(() => {
    if (!running || trace.length === 0) return;
    const timer = window.setInterval(() => {
      setStep((prev) => {
        if (prev >= maxStep) {
          setRunning(false);
          return maxStep;
        }
        return prev + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, maxStep, trace.length]);

  if (loading) {
    return routeWrap(
      <div className="py-20 text-center text-muted-foreground">
        Preparing interactive explanation…
      </div>,
    );
  }

  if (error && !intervention) {
    return routeWrap(<CalmErrorState message={error} onRetry={fetchInterventionData} />);
  }

  const currentTrace = trace[step];
  const isDegraded = Boolean(intervention?.degraded) || trace.length === 0;

  return routeWrap(
    <>
      <PageHeading
        eyebrow="Your session · 03 / 04"
        title="Let’s make it visible."
        description="Follow the code one line at a time. Notice what changes, and what stays shared."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          {!isDegraded ? (
            <Surface>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold">Execution Step</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {currentTrace?.label || `Step ${step + 1}`}
                  </p>
                </div>
                <div className="rounded-full bg-sage-soft px-3 py-1.5 font-mono text-xs text-secondary-foreground">
                  {step + 1} / {trace.length}
                </div>
              </div>

              {/* Code viewer with active line highlight */}
              <div className="overflow-hidden rounded-xl border border-border bg-muted/35">
                <div className="border-b border-border/70 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  main.py · Line {currentTrace?.line || "—"}
                </div>
                <div className="p-3 font-mono text-sm">
                  {answer.split("\n").map((lineText, index) => {
                    const isLineActive = currentTrace?.line === index + 1;
                    return (
                      <div
                        key={lineText + index}
                        className={`flex gap-4 rounded-md px-2 py-1.5 ${isLineActive
                            ? "code-line-active text-foreground font-semibold"
                            : "text-muted-foreground"
                          }`}
                      >
                        <span className="w-5 shrink-0 text-right text-xs opacity-60">
                          {index + 1}
                        </span>
                        <span>{lineText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stepper Controls */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="outline"
                  className="h-10 rounded-full"
                  disabled={step === 0}
                  onClick={() => setStep((v) => Math.max(0, v - 1))}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="min-h-10 min-w-10 rounded-full"
                    onClick={() => {
                      setStep(0);
                      setRunning(false);
                    }}
                    aria-label="Reset trace"
                  >
                    <RotateCcw size={15} />
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-10 rounded-full"
                    onClick={() => setRunning(!running)}
                  >
                    {running ? (
                      "Pause"
                    ) : (
                      <>
                        <Play size={15} className="mr-1" /> Play
                      </>
                    )}
                  </Button>
                  <Button
                    className="h-10 rounded-full"
                    disabled={step >= maxStep}
                    onClick={() => setStep((v) => Math.min(maxStep, v + 1))}
                  >
                    Next
                    <ArrowRight size={15} className="ml-1" />
                  </Button>
                </div>
              </div>
            </Surface>
          ) : (
            <Surface className="bg-muted/40 p-6">
              <p className="text-sm font-semibold text-foreground">
                Interactive trace currently degraded
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Read the explanation and counterexample below to verify your mental model.
              </p>
            </Surface>
          )}

          {/* Predict-Then-Run Challenge */}
          {intervention?.predictThenRun && (
            <Surface>
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Target size={17} className="text-primary" />
                Predict-Then-Run Challenge
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {intervention.predictThenRun.prompt}
              </p>

              <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-foreground">
                <pre>{intervention.predictThenRun.snippet}</pre>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Textarea
                  aria-label="Your prediction before running code"
                  className="min-h-12 resize-y rounded-xl bg-background"
                  placeholder="Your predicted output…"
                  value={prediction}
                  onChange={(e) => setPrediction(e.target.value)}
                />
                <Button
                  className="h-11 shrink-0 rounded-full px-5"
                  disabled={!prediction.trim()}
                  onClick={() => setRevealed(true)}
                >
                  <Play size={15} className="mr-1" />
                  Run
                </Button>
              </div>

              {revealed && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-sage/40 bg-sage-soft p-4">
                  <Check size={18} className="mt-0.5 shrink-0 text-primary" />
                  <div className="text-sm leading-6">
                    <p className="font-semibold text-secondary-foreground">
                      Execution Output:{" "}
                      <code className="font-mono">{intervention.predictThenRun.expected}</code>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Compare your prediction to the actual output to reinforce the concept
                      boundary.
                    </p>
                  </div>
                </div>
              )}
            </Surface>
          )}
        </div>

        {/* Right Column: Explanation, Variables Table, Counterexample */}
        <div className="space-y-5">
          <Surface className="bg-sage-soft/45">
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary-foreground">
              <Lightbulb size={16} />
              What to notice
            </div>
            <p className="mt-3 text-sm leading-7 text-foreground">{intervention?.explanation}</p>
          </Surface>

          {/* Variables Table */}
          {!isDegraded && (
            <Surface>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-base font-bold">Variables</h3>
                <span className="text-xs text-muted-foreground">Step {step + 1}</span>
              </div>
              <div className="divide-y divide-border/60 rounded-lg border border-border/70 overflow-hidden bg-background">
                {currentTrace?.variables && Object.keys(currentTrace.variables).length > 0 ? (
                  Object.entries(currentTrace.variables).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between px-3 py-2 text-xs font-mono"
                    >
                      <span className="font-semibold text-primary">{key}</span>
                      <span className="text-foreground">{val}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-xs text-muted-foreground">No active variables</div>
                )}
              </div>
            </Surface>
          )}

          {intervention?.counterexample && (
            <Surface className="bg-peach-soft/45">
              <div className="text-sm font-semibold text-accent-foreground">Counterexample</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground font-mono text-xs">
                {intervention.counterexample}
              </p>
            </Surface>
          )}

          <Button
            className="h-12 w-full rounded-full"
            onClick={() => void navigate({ to: "/session/reassess" })}
          >
            I think I get it, check me
            <ArrowRight size={16} className="ml-1" />
          </Button>
        </div>
      </div>
      <DemoHelper
        step="Try three fresh examples"
        to="/session/reassess"
        label="Start reassessment"
      />
    </>,
  );
}

// -------------------------------------------------------------
// 6. REASSESS SCREEN (4-Option MCQ, Transfer 1/2/Delayed Check)
// -------------------------------------------------------------
export function ReassessScreen() {
  const navigate = useNavigate();
  const { reassessStep, setReassessStep, resolved, setResolved } = useSession();
  const [item, setItem] = useState<ReassessmentItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<ReassessmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNextTrap = async () => {
    setLoading(true);
    setError(null);
    setSelectedIndex(null);
    try {
      const data = await getReassessment();
      setItem(data);
      setReassessStep(data.step);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to load reassessment question");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!resolved) {
      void fetchNextTrap();
    } else {
      setLoading(false);
    }
  }, [resolved]);

  const handleAnswer = async () => {
    if (selectedIndex === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await submitReassessment(selectedIndex);
      setLastResult(result);
      if (result.resolved) {
        setResolved(true);
      } else if (result.nextStep > reassessStep && result.nextStep < 3) {
        setReassessStep(result.nextStep);
        await fetchNextTrap();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to submit reassessment answer");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return routeWrap(
      <div className="py-20 text-center text-muted-foreground">
        Loading transfer verification item…
      </div>,
    );
  }

  if (error && !item && !resolved) {
    return routeWrap(<CalmErrorState message={error} onRetry={fetchNextTrap} />);
  }

  return routeWrap(
    <>
      <PageHeading
        eyebrow="Your session · 04 / 04"
        title={resolved ? "You found your way through." : "Let’s see what stuck."}
        description={
          resolved
            ? "You carried the idea into new examples. That’s real understanding."
            : "A few new examples help us check whether this idea travels."
        }
      />

      <div className="mb-7 flex justify-center">
        <StepPills active={reassessStep} />
      </div>

      {resolved ? (
        <div className="mx-auto max-w-2xl">
          <Surface className="bg-sage-soft/60 text-center p-8 sm:p-10">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-card text-primary shadow-sm mb-4">
              <Check size={30} />
            </div>
            <div className="inline-flex rounded-full bg-card px-3 py-1.5 text-xs font-bold text-secondary-foreground mb-3">
              Resolved
            </div>
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Concept Mastered</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              You recognized the pattern across transfer variations. When it appears in future
              problems, you'll know what to look for.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button asChild className="h-11 rounded-full px-6">
                <Link to="/dashboard">
                  See your learning
                  <ArrowRight size={16} className="ml-1" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-full px-6"
                onClick={() => void navigate({ to: "/" })}
              >
                Done for now
              </Button>
            </div>
          </Surface>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl">
          <Surface>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-primary">
                {item?.delayed ? "Delayed Check" : `Transfer Item ${reassessStep + 1}`}
              </span>
              <span className="text-xs text-muted-foreground">Problem: {item?.problemId}</span>
            </div>

            <h2 className="font-display text-lg font-bold leading-7 text-foreground">
              {item?.statement}
            </h2>

            <div className="mt-6 space-y-3">
              {item?.options.map((optionText, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={optionText + idx}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${isSelected
                        ? "border-primary bg-primary/5 font-semibold text-foreground ring-2 ring-primary/20"
                        : "border-border bg-card hover:bg-muted/40 text-foreground"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="font-mono text-sm">{optionText}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {lastResult && !resolved && (
              <div
                className={`mt-4 rounded-xl border p-4 text-xs ${lastResult.correct
                    ? "border-sage/50 bg-sage-soft text-secondary-foreground"
                    : "border-peach/50 bg-peach-soft text-accent-foreground"
                  }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {lastResult.correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  Status: {lastResult.status} (Score: {lastResult.score}/3)
                </div>
                <p className="mt-1">
                  Posterior $p(\text{"{Present}"}) = {lastResult.pPresent}$
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-peach/50 bg-peach-soft p-3 text-xs text-accent-foreground">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button
                className="h-11 rounded-full px-6"
                disabled={selectedIndex === null || busy}
                onClick={handleAnswer}
              >
                {busy ? "Evaluating…" : "Check my thinking"}
                <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </Surface>
        </div>
      )}
      <DemoHelper step="See your learning journey" to="/dashboard" label="Open dashboard" />
    </>,
  );
}

// -------------------------------------------------------------
// 7. DASHBOARD SCREEN (No Invented Links/Data)
// -------------------------------------------------------------
function StatusChip({ status }: { status: LearnerMisconception["status"] }) {
  const colors = {
    Active: "bg-peach-soft text-accent-foreground",
    Intervened: "bg-lavender-soft text-foreground",
    Resolved: "bg-sage-soft text-secondary-foreground",
    Recurred: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colors[status] || ""}`}>
      {status}
    </span>
  );
}

export function DashboardScreen() {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLearner();
      setProfile(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to load learner profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfile();
  }, []);

  if (loading) {
    return routeWrap(
      <div className="py-20 text-center text-muted-foreground">
        Gathering your learning journey…
      </div>,
    );
  }

  if (error && !profile) {
    return routeWrap(<CalmErrorState message={error} onRetry={fetchProfile} />);
  }

  const stats = profile?.stats || {
    ideasExplored: 0,
    probeAccuracy: null,
    ideasResolved: 0,
    streakDays: 1,
  };
  const misconceptions = profile?.misconceptions || [];
  const isDemo = Boolean(profile?.isDemo);

  const statCards = [
    { value: String(stats.ideasExplored), label: "Ideas explored", icon: Leaf },
    {
      value: stats.probeAccuracy !== null ? `${stats.probeAccuracy}%` : "—",
      label: stats.probeAccuracy !== null ? "Probe accuracy" : "Probe accuracy (needs 3+ probes)",
      icon: Target,
    },
    { value: String(stats.ideasResolved), label: "Ideas resolved", icon: Sparkles },
    {
      value: `${stats.streakDays} ${stats.streakDays === 1 ? "day" : "days"}`,
      label: "Learning streak",
      icon: TrendingUp,
    },
  ];

  return routeWrap(
    <>
      <PageHeading
        eyebrow="Your learning"
        title="Look how far you’ve come."
        description="A map of the ideas you’re exploring—at your pace, and in your own way."
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map(({ value, label, icon: Icon }) => (
          <Surface key={label} className="p-4 sm:p-5">
            <span className="grid size-9 place-items-center rounded-full bg-sage-soft text-primary">
              <Icon size={17} />
            </span>
            <p className="mt-4 font-display text-2xl font-extrabold">{value}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{label}</p>
          </Surface>
        ))}
      </div>

      {/* Misconceptions Table / List */}
      <div className="mt-6">
        <Surface>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold">Ideas Explored</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Knowledge states tracked via Bayesian Knowledge Tracing.
              </p>
            </div>
            <span className="grid size-10 place-items-center rounded-full bg-lavender-soft text-foreground">
              <Clock3 size={18} />
            </span>
          </div>

          {misconceptions.length > 0 ? (
            <div className="divide-y divide-border">
              {misconceptions.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-1"
                >
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.attempts} {item.attempts === 1 ? "moment" : "moments"} of practice ·
                      Posterior p(Present): {item.pPresent}
                    </p>
                  </div>
                  <StatusChip status={item.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No ideas tracked yet. Start your first problem session to begin mapping your learning!
            </p>
          )}
        </Surface>
      </div>
    </>,
    isDemo,
  );
}

// -------------------------------------------------------------
// 8. EVALUATION SCREEN (Real ML Metrics, No Defaults)
// -------------------------------------------------------------
export function EvaluationScreen() {
  const [data, setData] = useState<EvaluationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEval = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEvaluation();
      setData(res);
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      if (apiErr.status === 404) {
        setError("Evaluation report not generated yet");
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || "Failed to load evaluation metrics");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEval();
  }, []);

  if (loading) {
    return routeWrap(
      <div className="py-20 text-center text-muted-foreground">Loading benchmark metrics…</div>,
    );
  }

  if (error || !data) {
    return routeWrap(
      <div className="mx-auto max-w-lg py-12">
        <CalmErrorState
          message={error || "Evaluation report not generated yet"}
          onRetry={fetchEval}
        />
      </div>,
    );
  }

  const { headline, validation, split_leakage, splits } = data;
  const chartData = headline.classes.map((cls) => ({
    name: cls.name.length > 20 ? cls.name.slice(0, 18) + "…" : cls.name,
    f1: Math.round(cls.f1 * 100),
  }));

  const cm = headline.confusion_matrix;
  const unseen = headline.unseen_misconception_detection;
  const unseenCount = Math.round(unseen.detection_rate * unseen.samples_tested);

  return routeWrap(
    <>
      <PageHeading
        eyebrow="Evaluation"
        title="A clearer view of learning."
        description="Real benchmark performance on held-out test datasets and unseen misconception distributions."
      />

      {/* Top Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Surface>
          <span className="grid size-9 place-items-center rounded-full bg-sage-soft text-primary">
            <Target size={17} />
          </span>
          <div className="mt-4 font-display text-3xl font-extrabold">
            {(headline.test_accuracy * 100).toFixed(1)}%
          </div>
          <p className="mt-1 text-sm font-semibold">Test Accuracy</p>
          <p className="mt-1 text-xs text-muted-foreground">
            On held-out test.jsonl ({splits.test_samples} samples)
          </p>
        </Surface>

        <Surface>
          <span className="grid size-9 place-items-center rounded-full bg-sage-soft text-primary">
            <ArrowUpRight size={17} />
          </span>
          <div className="mt-4 font-display text-3xl font-extrabold">
            +{(headline.probe_uplift.uplift_delta * 100).toFixed(1)} pts
          </div>
          <p className="mt-1 text-sm font-semibold">
            Probe Uplift ({headline.probe_uplift.mode || "simulated"})
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(headline.probe_uplift.before_probe_accuracy * 100).toFixed(0)}% →{" "}
            {(headline.probe_uplift.after_probe_accuracy * 100).toFixed(0)}% accuracy jump
          </p>
        </Surface>

        <Surface>
          <span className="grid size-9 place-items-center rounded-full bg-sage-soft text-primary">
            <Sparkles size={17} />
          </span>
          <div className="mt-4 font-display text-3xl font-extrabold">
            {unseenCount} of {unseen.samples_tested}
          </div>
          <p className="mt-1 text-sm font-semibold">Held-Out {unseen.target_class} Detection</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(unseen.detection_rate * 100).toFixed(1)}% out-of-distribution unknown rate
          </p>
        </Surface>
      </div>

      {/* Confusion Matrix and F1 Bar Chart */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* Confusion Matrix */}
        <Surface>
          <div className="mb-4">
            <h2 className="font-display text-xl font-bold">Confusion Matrix</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Class order matches frozen ML benchmark ({cm.class_order.join(", ")}).
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs font-mono">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="p-2 text-left">True \ Pred</th>
                  {cm.class_order.map((cls) => (
                    <th key={cls} className="p-2">
                      {cls}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cm.matrix.map((row, rIdx) => (
                  <tr key={cm.class_order[rIdx]} className="border-b border-border/40">
                    <td className="p-2 text-left font-semibold text-foreground">
                      {cm.class_order[rIdx]}
                    </td>
                    {row.map((val, cIdx) => (
                      <td
                        key={`${rIdx}-${cIdx}`}
                        className={`p-2 ${rIdx === cIdx && val > 0
                            ? "bg-sage-soft font-bold text-secondary-foreground rounded"
                            : val > 0
                              ? "bg-peach-soft text-accent-foreground rounded"
                              : "text-muted-foreground/50"
                          }`}
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>

        {/* F1 Bar Chart */}
        <Surface>
          <div className="mb-4">
            <h2 className="font-display text-xl font-bold">Per-Class F1 Performance</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Macro-F1: {(headline.test_macro_f1 * 100).toFixed(1)}% · Weighted-F1:{" "}
              {(headline.test_weighted_f1 * 100).toFixed(1)}%
            </p>
          </div>
          <div className="h-[280px]" aria-label="Per-class F1 chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  textAnchor="end"
                  interval={0}
                  angle={-25}
                  fontSize={10}
                />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={10} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "var(--border)",
                    background: "var(--card)",
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="f1" name="F1 (%)" radius={[6, 6, 0, 0]}>
                  {chartData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index % 2 === 0 ? "var(--color-sage)" : "var(--color-peach)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </div>

      {/* Methodology & Split Information */}
      <Surface className="mt-6">
        <div className="flex items-center gap-2">
          <Code2 size={18} className="text-primary" />
          <h2 className="font-display text-lg font-bold">Methodology & Dataset Splits</h2>
        </div>
        <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border p-3">
            <p className="text-muted-foreground font-semibold">Training Set</p>
            <p className="mt-1 text-lg font-extrabold">{splits.train_samples} samples</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-muted-foreground font-semibold">Validation Set</p>
            <p className="mt-1 text-lg font-extrabold">{splits.val_samples} samples</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Acc: {(validation.val_accuracy * 100).toFixed(0)}% (isolated)
            </p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-muted-foreground font-semibold">Test Set (Headline)</p>
            <p className="mt-1 text-lg font-extrabold">{splits.test_samples} samples</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-muted-foreground font-semibold">AST Overlap Split Leakage</p>
            <p className="mt-1 text-lg font-extrabold">
              {(split_leakage.test_overlap_share * 100).toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Zero test split leakage</p>
          </div>
        </div>
      </Surface>
    </>,
  );
}
