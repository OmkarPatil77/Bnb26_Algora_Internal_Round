import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../app.js";
import { mlClient, MLError } from "../ml/client.js";
import { Session } from "../models/Session.js";
import { Learner } from "../models/Learner.js";

let mongoServer: MongoMemoryServer;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Session.deleteMany({});
  await Learner.deleteMany({});
  vi.restoreAllMocks();
});

describe("Backend Session & Learning API", () => {
  const testSessionId = "test-session-uuid-1234";

  it("GET /api/health returns healthy status", async () => {
    vi.spyOn(mlClient, "getHealth").mockResolvedValueOnce({ status: "healthy" });

    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.mlStatus).toBe("healthy");
  });

  it("GET /api/session/question returns problem starter stub", async () => {
    vi.spyOn(mlClient, "getProblem").mockResolvedValueOnce({
      id: "sum_to_n",
      title: "Sum from 1 to N",
      statement: "Write a function sum_to_n(n) ...",
      canonical_solution: "def sum_to_n(n):\n    total = 0\n    return total",
      tests: { inputs: [3], expected: [6] },
    });

    const res = await request(app)
      .get("/api/session/question?problemId=sum_to_n")
      .set("X-Session-Id", testSessionId);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("sum_to_n");
    expect(res.body.kind).toBe("fix");
    expect(res.body.prompt).toContain("Write a function sum_to_n");
    expect(res.body.code).toContain("def sum_to_n(n):");

    const savedSession = await Session.findOne({ sessionId: testSessionId });
    expect(savedSession).toBeTruthy();
    expect(savedSession?.questionId).toBe("sum_to_n");
  });

  it("POST /api/session/attempt handles misconception outcome", async () => {
    vi.spyOn(mlClient, "diagnose").mockResolvedValueOnce({
      problem_id: "sum_to_n",
      predicted_label: "M01",
      confidence: 0.95,
      candidates: [{ id: "M01", label: "range(n) runs 1..n", probability: 0.95 }],
      top3: [
        { id: "M01", label: "range(n) runs 1..n", probability: 0.95 },
        { id: "M02", label: "range(a, b) includes b", probability: 0.05 },
      ],
      top2: [{ label: "M01", probability: 0.95 }, { label: "M02", probability: 0.05 }],
      margin: 0.90,
      is_unknown: false,
      passed_tests: [false, false],
      all_passed: false,
    });

    const code = `def sum_to_n(n):\n    total = 0\n    for i in range(n):\n        total += i\n    return total`;
    const res = await request(app)
      .post("/api/session/attempt")
      .set("X-Session-Id", testSessionId)
      .send({
        questionId: "sum_to_n",
        answer: code,
        reasoning: "Iterating through range(n)",
      });

    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe("misconception");
    expect(res.body.misconceptionId).toBe("M01");
    expect(res.body.confidence).toBe(95);
    expect(res.body.highlightedLines).toEqual([3]);
    expect(res.body.candidates.length).toBe(2);

    // Verify Learner Profile was updated
    const learner = await Learner.findOne({ sessionId: testSessionId });
    expect(learner).toBeTruthy();
    expect(learner?.misconceptions.length).toBe(1);
    expect(learner?.misconceptions[0].id).toBe("M01");
    expect(learner?.misconceptions[0].status).toBe("Active");
  });

  it("POST /api/session/attempt handles correct outcome", async () => {
    vi.spyOn(mlClient, "diagnose").mockResolvedValueOnce({
      problem_id: "sum_to_n",
      predicted_label: "NONE",
      confidence: 0.99,
      candidates: [{ id: "NONE", label: "No Misconception", probability: 0.99 }],
      top3: [{ id: "NONE", label: "No Misconception", probability: 0.99 }],
      top2: [{ label: "NONE", probability: 0.99 }],
      margin: 0.99,
      is_unknown: false,
      passed_tests: [true, true],
      all_passed: true,
    });

    const code = `def sum_to_n(n):\n    return n * (n + 1) // 2`;
    const res = await request(app)
      .post("/api/session/attempt")
      .set("X-Session-Id", testSessionId)
      .send({
        questionId: "sum_to_n",
        answer: code,
      });

    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe("correct");
    expect(res.body.uncertain).toBe(false);
  });

  it("GET /api/session/probe and POST /api/session/probe/answer update distribution", async () => {
    // Setup session state
    await Session.create({
      sessionId: testSessionId,
      questionId: "sum_to_n",
      activeMisconceptionId: "M01",
      lastDiagnosis: {
        outcome: "uncertain",
        misconceptionId: "M01",
        label: "You may think range(n) runs 1..n",
        confidence: 52,
        uncertain: true,
        margin: 0.04,
        highlightedLines: [3],
        candidates: [
          { id: "M01", label: "range(n) runs 1..n", confidence: 52 },
          { id: "M02", label: "range(a, b) includes b", confidence: 48 },
        ],
      },
    });

    vi.spyOn(mlClient, "getProbe").mockResolvedValueOnce({
      misconception_id: "M01",
      title: "range(n) runs 1..n",
      question: "What is the first element generated by range(5)?",
      options: ["0", "1"],
    });

    const probeRes = await request(app)
      .get("/api/session/probe")
      .set("X-Session-Id", testSessionId);

    expect(probeRes.status).toBe(200);
    expect(probeRes.body.id).toBe("M01");
    expect(probeRes.body.options).toEqual(["0", "1"]);

    vi.spyOn(mlClient, "evaluateProbe").mockResolvedValueOnce({
      predicted_label: "M01",
      confidence: 0.90,
      updated_top2: [
        { label: "M01", probability: 0.90 },
        { label: "M02", probability: 0.05 },
      ],
      updated: true,
    });

    const answerRes = await request(app)
      .post("/api/session/probe/answer")
      .set("X-Session-Id", testSessionId)
      .send({ selectedOptionIndex: 1 });

    expect(answerRes.status).toBe(200);
    expect(answerRes.body.predictedMisconceptionId).toBe("M01");
    expect(answerRes.body.confidence).toBe(90);
    expect(answerRes.body.before.length).toBe(2);
    expect(answerRes.body.after[0].confidence).toBe(90);
  });

  it("GET /api/session/intervention sends problem call string and returns trace steps (>8 steps for sum_to_n(3))", async () => {
    await Session.create({
      sessionId: testSessionId,
      questionId: "sum_to_n",
      activeMisconceptionId: "M01",
      answers: [{ type: "attempt", answer: "def sum_to_n(n):\n    total = 0\n    for i in range(n):\n        total += i\n    return total", timestamp: new Date() }],
    });

    vi.spyOn(mlClient, "getProblem").mockResolvedValueOnce({
      id: "sum_to_n",
      title: "Sum from 1 to N",
      statement: "Write a function sum_to_n(n)",
      canonical_solution: "def sum_to_n(n):\n    total = 0\n    for i in range(1, n + 1):\n        total += i\n    return total",
      tests: { inputs: [3, 5], expected: [6, 15] },
    });

    vi.spyOn(mlClient, "getIntervention").mockResolvedValueOnce({
      id: "M01",
      title: "range(n) runs 1..n",
      belief: "Belief text",
      why_wrong: "Why wrong text",
      counterexample: "list(range(3)) == [0, 1, 2]",
      intervention_type: "cognitive_conflict",
    });

    vi.spyOn(mlClient, "personalise").mockResolvedValueOnce({
      label: "M01",
      explanation: "Personalised Gemini advice",
    });

    // Mock trace returning 9 steps for sum_to_n(3)
    const traceSteps = Array.from({ length: 9 }, (_, i) => ({
      line: i + 1,
      label: `Step ${i + 1}`,
      variables: { total: `${i}`, i: `${i}` },
    }));

    const traceSpy = vi.spyOn(mlClient, "trace").mockResolvedValueOnce({
      steps: traceSteps,
      output: "",
      returnValue: 3,
    });

    vi.spyOn(mlClient, "getPredictThenRun").mockResolvedValueOnce({
      label: "M01",
      snippet: "print(list(range(3)))",
      prompt: "What will this print?",
      expected: "[0, 1, 2]",
    });

    const res = await request(app)
      .get("/api/session/intervention")
      .set("X-Session-Id", testSessionId);

    expect(res.status).toBe(200);
    expect(traceSpy).toHaveBeenCalledWith(
      expect.stringContaining("sum_to_n"),
      "sum_to_n(3)"
    );
    expect(res.body.misconceptionId).toBe("M01");
    expect(res.body.explanation).toBe("Personalised Gemini advice");
    expect(res.body.trace.length).toBeGreaterThan(8);
    expect(res.body.degraded).toBe(false);
    expect(res.body.predictThenRun.expected).toBe("[0, 1, 2]");
  });

  it("GET /api/session/intervention degrades gracefully without 503 if /personalise or /trace fails", async () => {
    await Session.create({
      sessionId: testSessionId,
      questionId: "sum_to_n",
      activeMisconceptionId: "M01",
      answers: [{ type: "attempt", answer: "def sum_to_n(n):\n    pass", timestamp: new Date() }],
    });

    vi.spyOn(mlClient, "getIntervention").mockResolvedValueOnce({
      id: "M01",
      title: "range(n) runs 1..n",
      belief: "Belief text",
      why_wrong: "Why wrong default text",
      counterexample: "list(range(3)) == [0, 1, 2]",
      intervention_type: "cognitive_conflict",
    });

    // Simulate personalise and trace failure / timeout
    vi.spyOn(mlClient, "personalise").mockRejectedValueOnce(new MLError("Personalise timeout", 504));
    vi.spyOn(mlClient, "trace").mockRejectedValueOnce(new MLError("Trace failed", 500));

    vi.spyOn(mlClient, "getPredictThenRun").mockResolvedValueOnce({
      label: "M01",
      snippet: "print(list(range(3)))",
      prompt: "What will this print?",
      expected: "[0, 1, 2]",
    });

    const res = await request(app)
      .get("/api/session/intervention")
      .set("X-Session-Id", testSessionId);

    expect(res.status).toBe(200); // Must never return 503 for these two
    expect(res.body.degraded).toBe(true);
    expect(res.body.explanation).toBe("Why wrong default text");
    expect(res.body.counterexample).toBe("list(range(3)) == [0, 1, 2]");
    expect(res.body.trace).toEqual([]);
    expect(res.body.predictThenRun.expected).toBe("[0, 1, 2]");
  });

  it("GET /api/learner/profile hides probeAccuracy until at least 3 probe answers exist", async () => {
    // 0 probe answers -> null
    let res = await request(app)
      .get("/api/learner/profile")
      .set("X-Session-Id", testSessionId);
    expect(res.status).toBe(200);
    expect(res.body.stats.probeAccuracy).toBeNull();

    // 2 probe answers -> still null
    await Session.create({
      sessionId: testSessionId,
      answers: [
        { type: "probe", answer: "1", correct: true, timestamp: new Date() },
        { type: "probe", answer: "0", correct: false, timestamp: new Date() },
      ],
    });

    res = await request(app)
      .get("/api/learner/profile")
      .set("X-Session-Id", testSessionId);
    expect(res.body.stats.probeAccuracy).toBeNull();

    // 3 probe answers (2 correct out of 3 = 67%)
    await Session.updateOne(
      { sessionId: testSessionId },
      {
        $push: {
          answers: { type: "probe", answer: "1", correct: true, timestamp: new Date() },
        },
      }
    );

    res = await request(app)
      .get("/api/learner/profile")
      .set("X-Session-Id", testSessionId);
    expect(res.body.stats.probeAccuracy).toBe(67);
  });

  it("handles 3-step reassessment flow and marks resolved on 3/3", async () => {
    await Session.create({
      sessionId: testSessionId,
      activeMisconceptionId: "M01",
      reassessStep: 0,
      reassessScore: 0,
    });

    await Learner.create({
      sessionId: testSessionId,
      misconceptions: [
        {
          id: "M01",
          label: "range(n) runs 1..n",
          pPresent: 0.70,
          status: "Intervened",
          attempts: 1,
          firstSeen: new Date(),
          lastSeen: new Date(),
        },
      ],
      stats: { ideasExplored: 1, probeAccuracy: 80, ideasResolved: 0, streakDays: 1 },
    });

    vi.spyOn(mlClient, "getTrapItem").mockResolvedValue({
      misconception_id: "M01",
      problem_id: "trap_m01",
      statement: "Trap question",
      options: ["Correct opt", "Wrong 1", "Wrong 2", "Wrong 3"],
      correct_index: 0,
    });

    // Step 0
    let res = await request(app)
      .post("/api/session/reassessment/answer")
      .set("X-Session-Id", testSessionId)
      .send({ selectedOptionIndex: 0 });
    expect(res.status).toBe(200);
    expect(res.body.correct).toBe(true);
    expect(res.body.score).toBe(1);
    expect(res.body.nextStep).toBe(1);
    expect(res.body.resolved).toBe(false);

    // Step 1
    res = await request(app)
      .post("/api/session/reassessment/answer")
      .set("X-Session-Id", testSessionId)
      .send({ selectedOptionIndex: 0 });
    expect(res.body.score).toBe(2);
    expect(res.body.nextStep).toBe(2);

    // Step 2 (delayed check step)
    res = await request(app)
      .post("/api/session/reassessment/answer")
      .set("X-Session-Id", testSessionId)
      .send({ selectedOptionIndex: 0 });
    expect(res.body.score).toBe(3);
    expect(res.body.status).toBe("Resolved");
    expect(res.body.resolved).toBe(true);

    const updatedLearner = await Learner.findOne({ sessionId: testSessionId });
    expect(updatedLearner?.misconceptions[0].status).toBe("Resolved");
    expect(updatedLearner?.stats.ideasResolved).toBe(1);
  });

  it("POST /api/demo/seed creates demo learner with isDemo: true", async () => {
    const res = await request(app)
      .post("/api/demo/seed")
      .set("X-Session-Id", testSessionId);

    expect(res.status).toBe(200);
    expect(res.body.isDemo).toBe(true);
    expect(res.body.misconceptions.length).toBe(4);
    expect(res.body.stats.ideasExplored).toBe(5);
  });

  it("Returns 503 when ML service is unreachable", async () => {
    vi.spyOn(mlClient, "diagnose").mockRejectedValueOnce(
      new MLError("Cannot connect to ML service at http://127.0.0.1:8001")
    );

    const res = await request(app)
      .post("/api/session/attempt")
      .set("X-Session-Id", testSessionId)
      .send({ questionId: "sum_to_n", answer: "pass" });

    expect(res.status).toBe(503);
    expect(res.body.error).toContain("Cannot connect to ML service");
    expect(res.body.hint).toContain("Ensure ML service is running");
  });
});
