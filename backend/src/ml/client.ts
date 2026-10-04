import { config } from "../config.js";

export class MLError extends Error {
  public statusCode: number;
  public hint: string;

  constructor(message: string, statusCode = 503, hint = "Ensure ML service is running at " + config.mlUrl + " (uvicorn service:app --port 8001)") {
    super(message);
    this.name = "MLError";
    this.statusCode = statusCode;
    this.hint = hint;
  }
}

export interface MLDiagnoseResponse {
  problem_id: string;
  predicted_label: string;
  confidence: number;
  candidates: Array<{ id: string; label: string; probability: number }>;
  top3: Array<{ id: string; label: string; probability: number }>;
  top2: Array<{ label: string; probability: number }>;
  margin: number;
  is_unknown: boolean;
  passed_tests: boolean[];
  all_passed: boolean;
}

export interface MLProbeResponse {
  misconception_id: string;
  title: string;
  question: string;
  options: string[];
}

export interface MLProbeEvaluateResponse {
  predicted_label: string;
  confidence: number;
  updated_candidates?: Array<{ label: string; probability: number }>;
  updated_top2?: Array<{ label: string; probability: number }>;
  updated: boolean;
}

export interface MLInterventionResponse {
  id: string;
  title: string;
  belief: string;
  why_wrong: string;
  counterexample: string;
  intervention_type: "cognitive_conflict" | "predict-then-reveal" | "code_trace" | "analogy";
  explanation?: string;
}

export interface MLPersonaliseResponse {
  label: string;
  explanation: string;
}

export interface MLTrapItemResponse {
  misconception_id: string;
  problem_id: string;
  statement: string;
  options: string[];
  correct_index: number;
  code?: string;
}

export interface MLPredictThenRunResponse {
  label: string;
  snippet: string;
  prompt: string;
  expected: string;
}

export interface MLTraceStep {
  line: number;
  label: string;
  variables: Record<string, string>;
}

export interface MLTraceResponse {
  steps: MLTraceStep[];
  output: string;
  returnValue: any;
  error?: string | null;
}

export interface MLLabelItem {
  id: string;
  title: string;
}

export interface MLProblemItem {
  id: string;
  title: string;
  statement: string;
  canonical_solution: string;
  tests: {
    inputs: any[];
    expected: any[];
  };
}

let cachedLabels: Map<string, string> | null = null;

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 1, timeoutMs = 8000): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.status >= 500 && attempt < retries) {
        await new Promise((res) => setTimeout(res, 200));
        continue;
      }
      return response;
    } catch (err: any) {
      clearTimeout(timer);
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, 200));
        continue;
      }
      if (err.name === "AbortError") {
        throw new MLError(`ML service request timed out after ${timeoutMs}ms: ${url}`);
      }
      throw new MLError(`Cannot connect to ML service at ${config.mlUrl}: ${err.message}`);
    }
  }
  throw new MLError(`ML service failed after retries: ${url}`);
}

export const mlClient = {
  async initLabelsCache(): Promise<Map<string, string>> {
    if (cachedLabels) return cachedLabels;
    try {
      const labels = await this.getLabels();
      cachedLabels = new Map<string, string>();
      for (const item of labels) {
        cachedLabels.set(item.id, item.title);
      }
      cachedLabels.set("NONE", "No Misconception");
      cachedLabels.set("UNKNOWN", "Uncertain / Anomaly");
      return cachedLabels;
    } catch (err: any) {
      // Fallback empty cache
      cachedLabels = new Map<string, string>();
      return cachedLabels;
    }
  },

  getLabelTitle(id: string): string {
    if (!cachedLabels) return id;
    return cachedLabels.get(id) || id;
  },

  async getHealth(): Promise<{ status: string }> {
    const res = await fetchWithRetry(`${config.mlUrl}/health`);
    if (!res.ok) throw new MLError(`ML health check failed: ${res.statusText}`);
    return (await res.json()) as { status: string };
  },

  async getLabels(): Promise<MLLabelItem[]> {
    const res = await fetchWithRetry(`${config.mlUrl}/labels`);
    if (!res.ok) throw new MLError(`Failed to fetch ML labels: ${res.statusText}`);
    return (await res.json()) as MLLabelItem[];
  },

  async getProblems(): Promise<MLProblemItem[]> {
    const res = await fetchWithRetry(`${config.mlUrl}/problems`);
    if (!res.ok) throw new MLError(`Failed to fetch ML problems: ${res.statusText}`);
    return (await res.json()) as MLProblemItem[];
  },

  async getProblem(id: string): Promise<MLProblemItem> {
    const res = await fetchWithRetry(`${config.mlUrl}/problems/${encodeURIComponent(id)}`);
    if (res.status === 404) throw new MLError(`Problem '${id}' not found in ML service`, 404);
    if (!res.ok) throw new MLError(`Failed to fetch ML problem '${id}': ${res.statusText}`);
    return (await res.json()) as MLProblemItem;
  },

  async diagnose(problemId: string, code: string, unknownThreshold = 0.60): Promise<MLDiagnoseResponse> {
    const res = await fetchWithRetry(`${config.mlUrl}/diagnose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problem_id: problemId, code, unknown_threshold: unknownThreshold }),
    });
    if (res.status === 404) throw new MLError(`Problem '${problemId}' not found`, 404);
    if (!res.ok) throw new MLError(`ML diagnosis failed: ${res.statusText}`);
    return (await res.json()) as MLDiagnoseResponse;
  },

  async getProbe(label: string): Promise<MLProbeResponse> {
    const res = await fetchWithRetry(`${config.mlUrl}/probe/${encodeURIComponent(label)}`);
    if (res.status === 404) throw new MLError(`Probe for label '${label}' not found`, 404);
    if (!res.ok) throw new MLError(`Failed to fetch probe for '${label}': ${res.statusText}`);
    return (await res.json()) as MLProbeResponse;
  },

  async evaluateProbe(label: string, selectedOptionIndex: number, currentTop2: Array<{ label: string; probability: number }>): Promise<MLProbeEvaluateResponse> {
    const res = await fetchWithRetry(`${config.mlUrl}/probe/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        selected_option_index: selectedOptionIndex,
        current_top2: currentTop2,
      }),
    });
    if (!res.ok) throw new MLError(`Failed to evaluate probe answer: ${res.statusText}`);
    return (await res.json()) as MLProbeEvaluateResponse;
  },

  async getIntervention(label: string): Promise<MLInterventionResponse> {
    const res = await fetchWithRetry(`${config.mlUrl}/intervention/${encodeURIComponent(label)}`);
    if (res.status === 404) throw new MLError(`Intervention for label '${label}' not found`, 404);
    if (!res.ok) throw new MLError(`Failed to fetch intervention for '${label}': ${res.statusText}`);
    return (await res.json()) as MLInterventionResponse;
  },

  async personalise(code: string, label: string): Promise<MLPersonaliseResponse> {
    const res = await fetchWithRetry(`${config.mlUrl}/personalise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, label }),
    });
    if (!res.ok) throw new MLError(`Failed to generate personalised explanation: ${res.statusText}`);
    return (await res.json()) as MLPersonaliseResponse;
  },

  async getTrapItem(label: string, index = 0): Promise<MLTrapItemResponse> {
    const res = await fetchWithRetry(`${config.mlUrl}/trap/${encodeURIComponent(label)}?index=${index}`);
    if (res.status === 404) throw new MLError(`Trap item for '${label}' not found`, 404);
    if (!res.ok) throw new MLError(`Failed to fetch trap item for '${label}': ${res.statusText}`);
    return (await res.json()) as MLTrapItemResponse;
  },

  async getPredictThenRun(label: string): Promise<MLPredictThenRunResponse> {
    const res = await fetchWithRetry(`${config.mlUrl}/predict-then-run/${encodeURIComponent(label)}`);
    if (res.status === 404) throw new MLError(`Predict-then-run challenge for '${label}' not found`, 404);
    if (!res.ok) throw new MLError(`Failed to fetch predict-then-run challenge: ${res.statusText}`);
    return (await res.json()) as MLPredictThenRunResponse;
  },

  async trace(code: string, call?: string): Promise<MLTraceResponse> {
    const res = await fetchWithRetry(`${config.mlUrl}/trace`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, call }),
    });
    if (!res.ok) throw new MLError(`Failed to execute code trace: ${res.statusText}`);
    return (await res.json()) as MLTraceResponse;
  },
};
