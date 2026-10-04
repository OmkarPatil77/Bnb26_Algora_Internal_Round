import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/relearn",
  mlUrl: process.env.ML_URL || "http://127.0.0.1:8001",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  evalReportPath: process.env.EVAL_REPORT_PATH || path.resolve(__dirname, "../../ml/Re-learn-fcrit/models/eval_report.json"),
  nodeEnv: process.env.NODE_ENV || "development",
};
