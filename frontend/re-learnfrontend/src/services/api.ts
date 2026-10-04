import type {
  Diagnosis,
  EvaluationMetrics,
  Intervention,
  LearnerProfile,
  Probe,
  ProbeAnswerResponse,
  Question,
  ReassessmentItem,
  ReassessmentResult,
} from "@/types";
import * as mockApi from "./api.mock";

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const SESSION_STORAGE_KEY = "relearn_session_id";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server-session";
  try {
    let sid = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sid) {
      sid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(SESSION_STORAGE_KEY, sid);
    }
    return sid;
  } catch {
    return "fallback-session-id";
  }
}

export class ApiError extends Error {
  public status: number;
  public hint?: string;

  constructor(message: string, status = 500, hint?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.hint = hint;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const sessionId = getOrCreateSessionId();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set("X-Session-Id", sessionId);

  const url = `${API_BASE_URL}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new ApiError("The tutor engine isn't reachable. Try again.", 0, errorMsg);
  }

  if (!response.ok) {
    let errorData: { error?: string; hint?: string } = {};
    try {
      errorData = (await response.json()) as { error?: string; hint?: string };
    } catch {
      // Ignored
    }

    if (response.status === 503 || response.status === 502 || response.status === 504) {
      throw new ApiError(
        "The tutor engine isn't reachable. Try again.",
        response.status,
        errorData.hint || errorData.error,
      );
    }

    if (response.status === 404) {
      throw new ApiError(errorData.error || "Requested resource not found.", 404);
    }

    throw new ApiError(
      errorData.error || `Server request failed with status ${response.status}`,
      response.status,
      errorData.hint,
    );
  }

  return (await response.json()) as T;
}

export async function getQuestion(problemId = "sum_to_n"): Promise<Question> {
  if (USE_MOCK) return mockApi.question;
  return request<Question>(`/session/question?problemId=${encodeURIComponent(problemId)}`);
}

export async function submitAttempt(
  answer: string,
  reasoning = "",
  questionId = "sum_to_n",
): Promise<Diagnosis> {
  if (USE_MOCK) return mockApi.submitAttempt(answer, reasoning);
  return request<Diagnosis>("/session/attempt", {
    method: "POST",
    body: JSON.stringify({ questionId, answer, reasoning }),
  });
}

export async function getProbe(misconceptionId?: string): Promise<Probe> {
  if (USE_MOCK) return mockApi.getProbe();
  const query = misconceptionId ? `?misconceptionId=${encodeURIComponent(misconceptionId)}` : "";
  return request<Probe>(`/session/probe${query}`);
}

export async function submitProbeAnswer(selectedOptionIndex: number): Promise<ProbeAnswerResponse> {
  if (USE_MOCK) {
    const res = await mockApi.getProbe();
    void res;
    return {
      predictedMisconceptionId: "M01",
      label: "range(n) runs 1..n",
      confidence: 90,
      before: [
        { id: "M01", label: "range(n) runs 1..n", confidence: 52 },
        { id: "M02", label: "range(a, b) includes b", confidence: 48 },
      ],
      after: [
        { id: "M01", label: "range(n) runs 1..n", confidence: 90 },
        { id: "M02", label: "range(a, b) includes b", confidence: 5 },
      ],
      updated: true,
    };
  }
  return request<ProbeAnswerResponse>("/session/probe/answer", {
    method: "POST",
    body: JSON.stringify({ selectedOptionIndex }),
  });
}

export async function getIntervention(
  misconceptionId?: string,
  code?: string,
): Promise<Intervention> {
  if (USE_MOCK) return mockApi.getIntervention();
  const params = new URLSearchParams();
  if (misconceptionId) params.set("misconceptionId", misconceptionId);
  if (code) params.set("code", code);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return request<Intervention>(`/session/intervention${qs}`);
}

export async function getReassessment(): Promise<ReassessmentItem> {
  if (USE_MOCK) {
    return {
      step: 0,
      delayed: false,
      problemId: "trap_range_start",
      statement: "What is sum_indices(3) in Python?",
      options: ["3 (0 + 1 + 2)", "6 (1 + 2 + 3)", "0", "TypeError"],
    };
  }
  return request<ReassessmentItem>("/session/reassessment");
}

export async function submitReassessment(selectedOptionIndex: number): Promise<ReassessmentResult> {
  if (USE_MOCK) return mockApi.submitReassessment(0, String(selectedOptionIndex));
  return request<ReassessmentResult>("/session/reassessment/answer", {
    method: "POST",
    body: JSON.stringify({ selectedOptionIndex }),
  });
}

export async function getLearner(): Promise<LearnerProfile> {
  if (USE_MOCK) return mockApi.getLearner() as unknown as LearnerProfile;
  return request<LearnerProfile>("/learner/profile");
}

export async function getEvaluation(): Promise<EvaluationMetrics> {
  if (USE_MOCK) return mockApi.getEvaluation();
  return request<EvaluationMetrics>("/evaluation/metrics");
}

export async function seedDemoProfile(): Promise<LearnerProfile> {
  return request<LearnerProfile>("/demo/seed", {
    method: "POST",
  });
}
