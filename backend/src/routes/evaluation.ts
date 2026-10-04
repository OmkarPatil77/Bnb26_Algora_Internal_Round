import { Router, Request, Response, NextFunction } from "express";
import fs from "fs";
import { config } from "../config.js";

const router = Router();

// GET /api/evaluation/metrics
router.get("/metrics", (req: Request, res: Response, next: NextFunction) => {
  try {
    const reportPath = config.evalReportPath;
    if (!fs.existsSync(reportPath)) {
      return res.status(404).json({
        error: "Evaluation report file not found at " + reportPath,
        hint: "Run `python src/export_eval.py` in ml/Re-learn-fcrit to generate the benchmark artifact.",
      });
    }

    const fileContent = fs.readFileSync(reportPath, "utf-8");
    const data = JSON.parse(fileContent);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
