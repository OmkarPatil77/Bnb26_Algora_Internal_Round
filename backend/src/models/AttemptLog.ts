import mongoose, { Schema, Document } from "mongoose";

export interface IAttemptLog extends Document {
  sessionId: string;
  questionId: string;
  code: string;
  reasoning?: string;
  outcome: "misconception" | "uncertain" | "correct" | "unknown";
  misconceptionId?: string;
  confidence: number;
  timestamp: Date;
}

const AttemptLogSchema = new Schema<IAttemptLog>(
  {
    sessionId: { type: String, required: true, index: true },
    questionId: { type: String, required: true },
    code: { type: String, required: true },
    reasoning: { type: String },
    outcome: {
      type: String,
      enum: ["misconception", "uncertain", "correct", "unknown"],
      required: true,
    },
    misconceptionId: { type: String },
    confidence: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const AttemptLog = mongoose.model<IAttemptLog>("AttemptLog", AttemptLogSchema);
