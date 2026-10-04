import mongoose, { Schema, Document } from "mongoose";
import { MisconceptionStatus } from "../utils/bkt.js";

export interface ILearnerMisconception {
  id: string;
  label: string;
  pPresent: number;
  status: MisconceptionStatus;
  attempts: number;
  firstSeen: Date;
  lastSeen: Date;
}

export interface ILearnerStats {
  ideasExplored: number;
  probeAccuracy: number;
  ideasResolved: number;
  streakDays: number;
}

export interface ILearner extends Document {
  sessionId: string;
  isDemo: boolean;
  misconceptions: ILearnerMisconception[];
  stats: ILearnerStats;
  createdAt: Date;
  updatedAt: Date;
}

const LearnerMisconceptionSchema = new Schema<ILearnerMisconception>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    pPresent: { type: Number, required: true, default: 0.70 },
    status: {
      type: String,
      enum: ["Active", "Intervened", "Resolved", "Recurred"],
      default: "Active",
      required: true,
    },
    attempts: { type: Number, default: 1 },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
  },
  { _id: false }
);

const LearnerStatsSchema = new Schema<ILearnerStats>(
  {
    ideasExplored: { type: Number, default: 0 },
    probeAccuracy: { type: Number, default: 0 },
    ideasResolved: { type: Number, default: 0 },
    streakDays: { type: Number, default: 1 },
  },
  { _id: false }
);

const LearnerSchema = new Schema<ILearner>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    isDemo: { type: Boolean, default: false },
    misconceptions: [LearnerMisconceptionSchema],
    stats: {
      type: LearnerStatsSchema,
      default: () => ({
        ideasExplored: 0,
        probeAccuracy: 0,
        ideasResolved: 0,
        streakDays: 1,
      }),
    },
  },
  { timestamps: true }
);

export const Learner = mongoose.model<ILearner>("Learner", LearnerSchema);
