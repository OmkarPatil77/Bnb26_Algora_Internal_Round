import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../app.js";
import { config } from "../config.js";

let mongoServer: MongoMemoryServer;
let app: ReturnType<typeof createApp>;
let isMLRunning = false;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  app = createApp();

  try {
    const res = await fetch(`${config.mlUrl}/health`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) isMLRunning = true;
  } catch {
    isMLRunning = false;
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("End-to-End ML Integration Test", () => {
  it("executes full live demo loop if ML service is running", async () => {
    if (!isMLRunning) {
      console.log(`Live ML service at ${config.mlUrl} is offline. Skipping live E2E test.`);
      return;
    }

    const sessionId = `e2e-session-${Date.now()}`;

    // 1. Get starter question
    const qRes = await request(app)
      .get("/api/session/question?problemId=sum_to_n")
      .set("X-Session-Id", sessionId);
    expect(qRes.status).toBe(200);
    expect(qRes.body.id).toBe("sum_to_n");

    // 2. Submit M01 buggy code
    const m01Code = "def sum_to_n(n):\n    total = 0\n    for i in range(n):\n        total += i\n    return total";
    const aRes = await request(app)
      .post("/api/session/attempt")
      .set("X-Session-Id", sessionId)
      .send({ questionId: "sum_to_n", answer: m01Code, reasoning: "Testing M01" });
    expect(aRes.status).toBe(200);
    expect(aRes.body.misconceptionId).toBe("M01");

    // 3. Get Diagnostic Probe
    const pRes = await request(app)
      .get("/api/session/probe")
      .set("X-Session-Id", sessionId);
    expect(pRes.status).toBe(200);
    expect(pRes.body.options.length).toBeGreaterThan(0);

    // 4. Submit Probe Answer
    const paRes = await request(app)
      .post("/api/session/probe/answer")
      .set("X-Session-Id", sessionId)
      .send({ selectedOptionIndex: 1 });
    expect(paRes.status).toBe(200);
    expect(paRes.body.predictedMisconceptionId).toBe("M01");

    // 5. Get Intervention
    const iRes = await request(app)
      .get("/api/session/intervention")
      .set("X-Session-Id", sessionId);
    expect(iRes.status).toBe(200);
    expect(iRes.body.misconceptionId).toBe("M01");
    expect(iRes.body.trace.length).toBeGreaterThan(0);

    // 6. Complete 3-step Reassessment
    for (let step = 0; step < 3; step++) {
      const rRes = await request(app)
        .get("/api/session/reassessment")
        .set("X-Session-Id", sessionId);
      expect(rRes.status).toBe(200);
      expect(rRes.body.step).toBe(step);

      const raRes = await request(app)
        .post("/api/session/reassessment/answer")
        .set("X-Session-Id", sessionId)
        .send({ selectedOptionIndex: 0 }); // Option 0 is correct in verified trap items
      expect(raRes.status).toBe(200);
      expect(raRes.body.correct).toBe(true);
      if (step === 2) {
        expect(raRes.body.resolved).toBe(true);
        expect(raRes.body.status).toBe("Resolved");
      }
    }

    // 7. Check Learner Profile
    const lpRes = await request(app)
      .get("/api/learner/profile")
      .set("X-Session-Id", sessionId);
    expect(lpRes.status).toBe(200);
    const m01Record = lpRes.body.misconceptions.find((m: any) => m.id === "M01");
    expect(m01Record).toBeTruthy();
    expect(m01Record.status).toBe("Resolved");
  }, 30000);
});
