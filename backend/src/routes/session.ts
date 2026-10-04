import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { mlClient, MLError } from "../ml/client.js";
import { Session } from "../models/Session.js";
import { Learner } from "../models/Learner.js";
import { AttemptLog } from "../models/AttemptLog.js";
import { getHighlightedLines } from "../utils/highlighter.js";
import { updateBKT, getReassessmentStatus, transitionOnDiagnosis } from "../utils/bkt.js";

const router = Router();

function getSessionId(req: Request): string {
  const sid = req.headers["x-session-id"] || req.query.sessionId;
  if (!sid || typeof sid !== "string") {
    return "demo-session-default";
  }
  return sid;
}

// 1. GET /api/session/question
router.get("/question", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = getSessionId(req);
    const problemId = (req.query.problemId as string) || "sum_to_n";

    const problem = await mlClient.getProblem(problemId);

    // Starter stub based on problem ID
    const stub = problem.canonical_solution
      ? problem.canonical_solution.split("\n")[0] + "\n    # Write your solution here\n    pass"
      : `def ${problemId}():\n    pass`;

    await Session.findOneAndUpdate(
      { sessionId },
      {
        $setOnInsert: { sessionId },
        $set: { questionId: problemId, reassessStep: 0, reassessScore: 0, resolved: false, probeAsked: false },
      },
      { upsert: true, new: true }
    );

    res.json({
      id: problem.id,
      kind: "fix",
      prompt: problem.statement,
      code: stub,
    });
  } catch (err) {
    next(err);
  }
});

// 2. POST /api/session/attempt
const AttemptSchema = z.object({
  questionId: z.string(),
  answer: z.string(),
  reasoning: z.string().optional().default(""),
});

router.post("/attempt", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = getSessionId(req);
    const body = AttemptSchema.parse(req.body);

    const diag = await mlClient.diagnose(body.questionId, body.answer);

    // Determine outcome
    let outcome: "misconception" | "uncertain" | "correct" | "unknown";
    if (diag.all_passed && diag.predicted_label === "NONE") {
      outcome = "correct";
    } else if (diag.is_unknown || diag.predicted_label === "UNKNOWN") {
      outcome = "unknown";
    } else if (diag.margin < 0.15) {
      outcome = "uncertain";
    } else {
      outcome = "misconception";
    }

    const misconceptionId = diag.predicted_label !== "NONE" && diag.predicted_label !== "UNKNOWN" ? diag.predicted_label : undefined;
    const labelTitle = mlClient.getLabelTitle(diag.predicted_label);
    const headlineLabel = misconceptionId ? `You may think ${labelTitle}` : (outcome === "correct" ? "No misconception detected" : "Code behavior is uncertain");

    const highlightedLines = getHighlightedLines(body.answer, misconceptionId);

    // Format top3 candidates from real probabilities
    const candidates = (diag.top3 || []).map((c) => ({
      id: c.id,
      label: c.label || mlClient.getLabelTitle(c.id),
      confidence: Math.round(c.probability * 100),
    }));

    const confidencePct = Math.round(diag.confidence * 100);

    // Update Session
    await Session.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          questionId: body.questionId,
          activeMisconceptionId: misconceptionId,
          lastDiagnosis: {
            outcome,
            misconceptionId,
            label: headlineLabel,
            confidence: confidencePct,
            uncertain: outcome === "uncertain",
            margin: diag.margin,
            highlightedLines,
            candidates,
          },
          reassessStep: 0,
          reassessScore: 0,
          resolved: false,
        },
        $push: {
          answers: {
            type: "attempt",
            answer: body.answer,
            correct: outcome === "correct",
            timestamp: new Date(),
          },
        },
      },
      { upsert: true }
    );

    // Log Attempt
    await AttemptLog.create({
      sessionId,
      questionId: body.questionId,
      code: body.answer,
      reasoning: body.reasoning,
      outcome,
      misconceptionId,
      confidence: confidencePct,
    });

    // Update Learner Profile
    if (misconceptionId) {
      let learner = await Learner.findOne({ sessionId });
      if (!learner) {
        learner = await Learner.create({ sessionId, misconceptions: [], stats: { ideasExplored: 1, probeAccuracy: 0, ideasResolved: 0, streakDays: 1 } });
      }

      const existingIndex = learner.misconceptions.findIndex((m) => m.id === misconceptionId);
      if (existingIndex >= 0) {
        const item = learner.misconceptions[existingIndex];
        item.attempts += 1;
        item.lastSeen = new Date();
        item.status = transitionOnDiagnosis(item.status);
      } else {
        learner.misconceptions.push({
          id: misconceptionId,
          label: labelTitle,
          pPresent: 0.70,
          status: "Active",
          attempts: 1,
          firstSeen: new Date(),
          lastSeen: new Date(),
        });
        learner.stats.ideasExplored = learner.misconceptions.length;
      }
      await learner.save();
    }

    res.json({
      outcome,
      misconceptionId,
      label: headlineLabel,
      confidence: confidencePct,
      uncertain: outcome === "uncertain",
      highlightedLines,
      candidates,
    });
  } catch (err) {
    next(err);
  }
});

// 3. GET /api/session/probe
router.get("/probe", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = getSessionId(req);
    const session = await Session.findOne({ sessionId });
    
    const misconceptionId = (req.query.misconceptionId as string) || session?.activeMisconceptionId || session?.lastDiagnosis?.misconceptionId || "M01";

    const probe = await mlClient.getProbe(misconceptionId);

    if (session) {
      session.probeAsked = true;
      await session.save();
    }

    res.json({
      id: probe.misconception_id,
      prompt: probe.question,
      options: probe.options,
    });
  } catch (err) {
    next(err);
  }
});

// 4. POST /api/session/probe/answer
const ProbeAnswerSchema = z.object({
  selectedOptionIndex: z.number().int().min(0),
});

router.post("/probe/answer", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = getSessionId(req);
    const body = ProbeAnswerSchema.parse(req.body);

    const session = await Session.findOne({ sessionId });
    const misconceptionId = session?.activeMisconceptionId || session?.lastDiagnosis?.misconceptionId || "M01";

    // Build current top-2 from stored diagnosis
    const candidates = session?.lastDiagnosis?.candidates || [];
    const currentTop2 = candidates.slice(0, 2).map((c) => ({
      label: c.id,
      probability: c.confidence / 100.0,
    }));

    const evalResult = await mlClient.evaluateProbe(misconceptionId, body.selectedOptionIndex, currentTop2);

    const beforeCandidates = candidates.slice(0, 2);
    const afterCandidates = (evalResult.updated_top2 || evalResult.updated_candidates || []).map((c: any) => ({
      id: c.label,
      label: mlClient.getLabelTitle(c.label),
      confidence: Math.round(c.probability * 100),
    }));

    // Update session active misconception if changed
    if (session) {
      session.activeMisconceptionId = evalResult.predicted_label;
      if (session.lastDiagnosis) {
        session.lastDiagnosis.confidence = Math.round(evalResult.confidence * 100);
        session.lastDiagnosis.misconceptionId = evalResult.predicted_label;
        session.lastDiagnosis.label = `You may think ${mlClient.getLabelTitle(evalResult.predicted_label)}`;
        session.lastDiagnosis.candidates = afterCandidates;
      }
      session.answers.push({
        type: "probe",
        answer: String(body.selectedOptionIndex),
        correct: evalResult.predicted_label === misconceptionId,
        timestamp: new Date(),
      });
      await session.save();
    }

    res.json({
      predictedMisconceptionId: evalResult.predicted_label,
      label: mlClient.getLabelTitle(evalResult.predicted_label),
      confidence: Math.round(evalResult.confidence * 100),
      before: beforeCandidates,
      after: afterCandidates,
      updated: evalResult.updated,
    });
  } catch (err) {
    next(err);
  }
});

function buildTraceCall(problem: { id: string; canonical_solution?: string; tests?: { inputs: any[] } }): string {
  const funcName = problem.id;
  if (!problem.tests || !problem.tests.inputs || problem.tests.inputs.length === 0) {
    return `${funcName}()`;
  }
  const firstInput = problem.tests.inputs[0];

  let paramCount = 1;
  if (problem.canonical_solution) {
    const match = problem.canonical_solution.match(/def\s+\w+\s*\(([^)]*)\)/);
    if (match && match[1]) {
      const params = match[1].split(",").map((s) => s.trim()).filter(Boolean);
      paramCount = params.length;
    }
  }

  if (paramCount > 1 && Array.isArray(firstInput) && firstInput.length === paramCount) {
    return `${funcName}(${firstInput.map((arg) => JSON.stringify(arg)).join(", ")})`;
  } else {
    return `${funcName}(${JSON.stringify(firstInput)})`;
  }
}

// 5. GET /api/session/intervention
router.get("/intervention", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = getSessionId(req);
    const session = await Session.findOne({ sessionId });

    const misconceptionId = (req.query.misconceptionId as string) || session?.activeMisconceptionId || session?.lastDiagnosis?.misconceptionId || "M01";
    const problemId = (req.query.problemId as string) || (req.query.questionId as string) || session?.questionId || "sum_to_n";

    // Retrieve last attempt code
    const lastAttempt = session?.answers.filter((a) => a.type === "attempt").slice(-1)[0];
    const code = lastAttempt?.answer || (req.query.code as string) || "def sum_to_n(n):\n    total = 0\n    for i in range(n):\n        total += i\n    return total";

    let callString = `${problemId}(3)`;
    try {
      const problem = await mlClient.getProblem(problemId);
      callString = buildTraceCall(problem);
    } catch {
      // Keep default fallback call string
    }

    const interv = await mlClient.getIntervention(misconceptionId);

    let degraded = false;
    let personaRes = { label: misconceptionId, explanation: "" };
    let traceRes = { steps: [] as any[], output: "", returnValue: null as any };
    let ptrRes = { label: misconceptionId, snippet: "", prompt: "", expected: "" };

    const [pResult, tResult, ptrResult] = await Promise.allSettled([
      mlClient.personalise(code, misconceptionId),
      mlClient.trace(code, callString),
      mlClient.getPredictThenRun(misconceptionId),
    ]);

    if (pResult.status === "fulfilled") {
      personaRes = pResult.value;
    } else {
      degraded = true;
    }

    if (tResult.status === "fulfilled") {
      traceRes = tResult.value;
    } else {
      degraded = true;
      traceRes = { steps: [], output: "", returnValue: null };
    }

    if (ptrResult.status === "fulfilled") {
      ptrRes = ptrResult.value;
    } else {
      degraded = true;
    }

    const explanation = personaRes.explanation || interv.why_wrong || "Review how Python processes this syntax.";

    // Update Learner state to 'Intervened'
    const learner = await Learner.findOne({ sessionId });
    if (learner) {
      const item = learner.misconceptions.find((m) => m.id === misconceptionId);
      if (item && item.status !== "Resolved") {
        item.status = "Intervened";
        await learner.save();
      }
    }

    res.json({
      misconceptionId: interv.id,
      title: interv.title,
      interventionType: interv.intervention_type,
      explanation,
      counterexample: interv.counterexample,
      trace: traceRes.steps || [],
      output: traceRes.output || "",
      returnValue: traceRes.returnValue,
      predictThenRun: ptrRes,
      degraded,
    });
  } catch (err) {
    next(err);
  }
});

// 6. GET /api/session/reassessment
router.get("/reassessment", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = getSessionId(req);
    const session = await Session.findOne({ sessionId });

    const misconceptionId = session?.activeMisconceptionId || session?.lastDiagnosis?.misconceptionId || "M01";
    const step = session?.reassessStep ?? 0;

    const trap = await mlClient.getTrapItem(misconceptionId, step);

    res.json({
      step,
      delayed: step === 2,
      problemId: trap.problem_id,
      statement: trap.statement,
      options: trap.options,
    });
  } catch (err) {
    next(err);
  }
});

// 7. POST /api/session/reassessment/answer
const ReassessAnswerSchema = z.object({
  selectedOptionIndex: z.number().int().min(0),
});

router.post("/reassessment/answer", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = getSessionId(req);
    const body = ReassessAnswerSchema.parse(req.body);

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const misconceptionId = session.activeMisconceptionId || session.lastDiagnosis?.misconceptionId || "M01";
    const step = session.reassessStep || 0;

    // Fetch trap item to verify correct index
    const trap = await mlClient.getTrapItem(misconceptionId, step);
    const isCorrect = body.selectedOptionIndex === trap.correct_index;

    session.reassessScore = (session.reassessScore || 0) + (isCorrect ? 1 : 0);
    const newStep = step + 1;
    session.reassessStep = newStep;

    const isComplete = newStep >= 3;
    const resolved = isComplete && session.reassessScore === 3;
    const status = getReassessmentStatus(session.reassessScore);

    session.resolved = resolved;
    session.answers.push({
      type: "reassessment",
      step,
      answer: String(body.selectedOptionIndex),
      correct: isCorrect,
      timestamp: new Date(),
    });
    await session.save();

    // Update Learner BKT
    let pPresentUpdated = 0.50;
    const learner = await Learner.findOne({ sessionId });
    if (learner) {
      const item = learner.misconceptions.find((m) => m.id === misconceptionId);
      if (item) {
        item.pPresent = updateBKT(item.pPresent, isCorrect, { numOptions: trap.options.length });
        pPresentUpdated = item.pPresent;
        if (resolved) {
          item.status = "Resolved";
          learner.stats.ideasResolved += 1;
        } else if (isComplete && session.reassessScore === 2) {
          // Partially resolved keeps Intervened or Active
        }
        await learner.save();
      }
    }

    res.json({
      correct: isCorrect,
      status,
      score: session.reassessScore,
      step,
      nextStep: newStep,
      resolved,
      pPresent: pPresentUpdated,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
