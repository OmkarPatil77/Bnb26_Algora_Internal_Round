import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { ZodError } from "zod";
import { config } from "./config.js";
import { mlClient, MLError } from "./ml/client.js";
import sessionRouter from "./routes/session.js";
import learnerRouter from "./routes/learner.js";
import evaluationRouter from "./routes/evaluation.js";

export function createApp() {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: [
        config.frontendOrigin,
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*",
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Session-Id"],
    })
  );

  app.use(express.json());

  // Health check
  app.get("/api/health", async (req: Request, res: Response) => {
    let mlStatus = "unknown";
    try {
      const health = await mlClient.getHealth();
      mlStatus = health.status;
    } catch {
      mlStatus = "disconnected";
    }

    res.json({
      status: "healthy",
      service: "Re:Learn Express Backend",
      version: "2.0.0",
      mlStatus,
    });
  });

  // Mount API routers
  app.use("/api/session", sessionRouter);
  app.use("/api/learner", learnerRouter);
  app.use("/api/demo", learnerRouter);
  app.use("/api/evaluation", evaluationRouter);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: `Route '${req.method} ${req.path}' not found` });
  });

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof MLError) {
      return res.status(err.statusCode).json({
        error: err.message,
        hint: err.hint,
      });
    }

    if (err instanceof ZodError) {
      return res.status(400).json({
        error: "Invalid request payload",
        details: err.errors,
      });
    }

    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      error: err.message || "Internal Server Error",
    });
  });

  return app;
}
