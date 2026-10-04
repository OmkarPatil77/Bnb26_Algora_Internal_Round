import mongoose, { Schema, Document } from "mongoose";

export interface ISessionAnswer {
  type: "attempt" | "probe" | "reassessment";
  step?: number;
  answer: string;
  correct?: boolean;
  timestamp: Date;
}

export interface ISession extends Document {
  sessionId: string;
  questionId: string;
  lastDiagnosis?: {
    outcome: string;
    misconceptionId?: string;
    label: string;
    confidence: number;
    uncertain: boolean;
    margin: number;
    highlightedLines: number[];
    candidates: Array<{ id: string; label: string; confidence: number }>;
  };
  activeMisconceptionId?: string;
  probeAsked: boolean;
  reassessStep: number;
  reassessScore: number;
  resolved: boolean;
  answers: ISessionAnswer[];
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    questionId: { type: String, default: "sum_to_n" },
    lastDiagnosis: { type: Schema.Types.Mixed },
    activeMisconceptionId: { type: String },
    probeAsked: { type: Boolean, default: false },
    reassessStep: { type: Number, default: 0 },
    reassessScore: { type: Number, default: 0 },
    resolved: { type: Boolean, default: false },
    answers: [
      {
        type: { type: String, enum: ["attempt", "probe", "reassessment"], required: true },
        step: { type: Number },
        answer: { type: String, required: true },
        correct: { type: Boolean },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const Session = mongoose.model<ISession>("Session", SessionSchema);
