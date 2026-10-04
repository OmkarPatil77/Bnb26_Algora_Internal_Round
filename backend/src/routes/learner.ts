import { Router, Request, Response, NextFunction } from "express";
import { Learner } from "../models/Learner.js";
import { Session } from "../models/Session.js";
import { mlClient } from "../ml/client.js";

const router = Router();

function getSessionId(req: Request): string {
  const sid = req.headers["x-session-id"] || req.query.sessionId;
  if (!sid || typeof sid !== "string") {
    return "demo-session-default";
  }
  return sid;
}

// GET /api/learner/profile
router.get("/profile", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = getSessionId(req);
    const [learner, session] = await Promise.all([
      Learner.findOne({ sessionId }),
      Session.findOne({ sessionId }),
    ]);

    const probeAnswers = session?.answers.filter((a) => a.type === "probe") || [];
    let probeAccuracy: number | null = null;
    if (learner?.isDemo) {
      probeAccuracy = learner.stats.probeAccuracy;
    } else if (probeAnswers.length >= 3) {
      const correctProbes = probeAnswers.filter((a) => a.correct).length;
      probeAccuracy = Math.round((correctProbes / probeAnswers.length) * 100);
    }

    if (!learner) {
      // Default empty learner
      return res.json({
        isDemo: false,
        misconceptions: [],
        stats: {
          ideasExplored: 0,
          probeAccuracy,
          ideasResolved: 0,
          streakDays: 1,
        },
      });
    }

    res.json({
      isDemo: learner.isDemo,
      misconceptions: learner.misconceptions.map((m) => ({
        id: m.id,
        label: m.label || mlClient.getLabelTitle(m.id),
        status: m.status,
        pPresent: m.pPresent,
        attempts: m.attempts,
      })),
      stats: {
        ideasExplored: learner.misconceptions.length,
        probeAccuracy,
        ideasResolved: learner.misconceptions.filter((m) => m.status === "Resolved").length,
        streakDays: learner.stats?.streakDays || 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/demo/seed
router.post("/seed", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = getSessionId(req);

    const demoMisconceptions = [
      {
        id: "M04",
        label: mlClient.getLabelTitle("M04") || "b = a copies a list (aliasing)",
        status: "Resolved" as const,
        pPresent: 0.08,
        attempts: 5,
        firstSeen: new Date(Date.now() - 3 * 86400000),
        lastSeen: new Date(Date.now() - 1 * 86400000),
      },
      {
        id: "M01",
        label: mlClient.getLabelTitle("M01") || "range(n) runs 1..n",
        status: "Active" as const,
        pPresent: 0.71,
        attempts: 2,
        firstSeen: new Date(Date.now() - 2 * 86400000),
        lastSeen: new Date(),
      },
      {
        id: "M03",
        label: mlClient.getLabelTitle("M03") || "print and return are the same",
        status: "Intervened" as const,
        pPresent: 0.33,
        attempts: 3,
        firstSeen: new Date(Date.now() - 2 * 86400000),
        lastSeen: new Date(),
      },
      {
        id: "M06",
        label: mlClient.getLabelTitle("M06") || "Accumulator initialised inside loop",
        status: "Recurred" as const,
        pPresent: 0.54,
        attempts: 4,
        firstSeen: new Date(Date.now() - 3 * 86400000),
        lastSeen: new Date(),
      },
    ];

    const learner = await Learner.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          sessionId,
          isDemo: true,
          misconceptions: demoMisconceptions,
          stats: {
            ideasExplored: 5,
            probeAccuracy: 82,
            ideasResolved: 1,
            streakDays: 3,
          },
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      message: "Demo learner profile seeded successfully",
      isDemo: learner.isDemo,
      misconceptions: learner.misconceptions,
      stats: learner.stats,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
