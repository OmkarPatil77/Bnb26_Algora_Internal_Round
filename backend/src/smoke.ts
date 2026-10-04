/**
 * End-to-End Demo Smoke Test Script
 * Run with: npm run smoke (or npx tsx src/smoke.ts)
 */
import { config } from "./config.js";

const BACKEND_URL = `http://127.0.0.1:${config.port}`;
const SESSION_ID = `smoke-session-${Date.now()}`;

async function main() {
  console.log("=" .repeat(60));
  console.log("Re:Learn End-to-End Demo Smoke Test");
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Session ID:  ${SESSION_ID}`);
  console.log("=" .repeat(60));

  const headers = {
    "Content-Type": "application/json",
    "X-Session-Id": SESSION_ID,
  };

  // 1. Health check
  console.log("\n[1/8] Checking Health Endpoint...");
  const hRes = await fetch(`${BACKEND_URL}/api/health`);
  const hData: any = await hRes.json();
  console.log("Health Status:", hData);
  if (!hRes.ok) throw new Error("Health check failed");

  // 2. Fetch starter question
  console.log("\n[2/8] Fetching Question 1 (sum_to_n)...");
  const qRes = await fetch(`${BACKEND_URL}/api/session/question?problemId=sum_to_n`, { headers });
  const qData: any = await qRes.json();
  console.log(`Received Question: ${qData.id} (${qData.kind})`);
  console.log(`Prompt: ${qData.prompt.slice(0, 80)}...`);

  // 3. Submit attempt with M01 range bug
  console.log("\n[3/8] Submitting Attempt with range(n) Misconception...");
  const m01Code = `def sum_to_n(n):\n    total = 0\n    for i in range(n):\n        total += i\n    return total`;
  const aRes = await fetch(`${BACKEND_URL}/api/session/attempt`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      questionId: "sum_to_n",
      answer: m01Code,
      reasoning: "I iterated through range(n) and added to total.",
    }),
  });
  const aData: any = await aRes.json();
  console.log("Diagnosis Outcome:", aData.outcome);
  console.log("Diagnosed Label:", aData.label);
  console.log("Confidence:", `${aData.confidence}%`);
  console.log("Highlighted Lines:", aData.highlightedLines);
  console.log("Top Candidates:", aData.candidates);

  // 4. Fetch diagnostic probe
  console.log("\n[4/8] Fetching Diagnostic Probe...");
  const pRes = await fetch(`${BACKEND_URL}/api/session/probe`, { headers });
  const pData: any = await pRes.json();
  console.log(`Probe Question: ${pData.prompt}`);
  console.log(`Probe Options: ${JSON.stringify(pData.options)}`);

  // 5. Submit probe answer
  console.log("\n[5/8] Submitting Probe Answer (Option 1 = '1')...");
  const paRes = await fetch(`${BACKEND_URL}/api/session/probe/answer`, {
    method: "POST",
    headers,
    body: JSON.stringify({ selectedOptionIndex: 1 }),
  });
  const paData: any = await paRes.json();
  console.log("Updated Misconception:", paData.predictedMisconceptionId);
  console.log("Confidence Shift:", `${paData.before[0]?.confidence}% -> ${paData.after[0]?.confidence}%`);

  // 6. Fetch pedagogical intervention & trace
  console.log("\n[6/8] Fetching Pedagogical Intervention & Trace...");
  const iRes = await fetch(`${BACKEND_URL}/api/session/intervention`, { headers });
  const iData: any = await iRes.json();
  console.log("Intervention Type:", iData.interventionType);
  console.log("Personalised Explanation:", iData.explanation);
  console.log("Counterexample:", iData.counterexample);
  console.log(`Trace Steps Captured: ${iData.trace?.length || 0} steps`);
  console.log("Predict-Then-Run Challenge:", iData.predictThenRun);

  // 7. Complete 3-step reassessment
  console.log("\n[7/8] Executing 3-Step Near-Transfer Reassessment...");
  for (let s = 0; s < 3; s++) {
    const rItemRes = await fetch(`${BACKEND_URL}/api/session/reassessment`, { headers });
    const rItem: any = await rItemRes.json();
    console.log(`  Step ${s + 1}/3 (${rItem.delayed ? "Delayed Check" : "Transfer"}): ${rItem.statement.slice(0, 60)}...`);

    // Submit correct answer (option index 0 in verified trap items)
    const raRes = await fetch(`${BACKEND_URL}/api/session/reassessment/answer`, {
      method: "POST",
      headers,
      body: JSON.stringify({ selectedOptionIndex: 0 }),
    });
    const raData: any = await raRes.json();
    console.log(`    Result: ${raData.correct ? "CORRECT" : "INCORRECT"} | Score: ${raData.score}/3 | Status: ${raData.status} | p(Present): ${raData.pPresent}`);
    if (s === 2) {
      console.log(`    Final Resolution: ${raData.resolved ? "RESOLVED (Mastery Achieved)" : "NOT RESOLVED"}`);
    }
  }

  // 8. Fetch learner profile
  console.log("\n[8/8] Fetching Updated Learner Profile...");
  const lpRes = await fetch(`${BACKEND_URL}/api/learner/profile`, { headers });
  const lpData: any = await lpRes.json();
  console.log("Learner Misconceptions State:", lpData.misconceptions);
  console.log("Learner Stats:", lpData.stats);

  console.log("\n" + "=" .repeat(60));
  console.log("Smoke Test Completed Successfully!");
  console.log("=" .repeat(60));
}

main().catch((err) => {
  console.error("\nSmoke Test Failed:", err.message);
  process.exit(1);
});
