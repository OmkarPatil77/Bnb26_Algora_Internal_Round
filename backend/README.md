# Re:Learn Backend Service

> **Stack:** Node.js 20+, Express, MongoDB (Mongoose), TypeScript, Zod, Vitest.  
> **API Contract:** Adheres strictly to [docs/API_CONTRACT.md (v2)](file:///c:/Users/anish/OneDrive/Desktop/BNB-Algora/docs/API_CONTRACT.md).

---

## 1. Quick Start

### 1.1 Install Dependencies
```bash
npm install
```

### 1.2 Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/relearn
ML_URL=http://127.0.0.1:8001
FRONTEND_ORIGIN=http://localhost:5173
```

---

## 2. Running the Server

### 2.1 Development Mode
```bash
npm run dev
```

### 2.2 Production Build & Run
```bash
npm run build
npm start
```

---

## 3. Running Tests & Smoke Script

### 3.1 Unit & Integration Test Suite (Vitest)
```bash
npm test
```
Runs unit tests for line highlighting heuristics, BKT Bayesian updates, and supertest API route tests (using in-memory MongoDB with mocked ML client, plus optional live E2E test).

### 3.2 Live Demo Smoke Test
To execute the full end-to-end demo flow against a running backend and ML service:
```bash
npm run smoke
```

---

## 4. API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check and ML connection status. |
| `GET` | `/api/session/question` | Returns Question 1 starter problem stub (`sum_to_n`). |
| `POST` | `/api/session/attempt` | Submits student code attempt; returns diagnosis and unpadded top-3 candidates. |
| `GET` | `/api/session/probe` | Fetches multiple-choice diagnostic probe item. |
| `POST` | `/api/session/probe/answer` | Submits probe answer; returns `before` and `after` distributions. |
| `GET` | `/api/session/intervention` | Delivers Gemini-tailored explanation, counterexample, line-by-line variable trace, and predict-then-run challenge. |
| `GET` | `/api/session/reassessment` | Fetches active 4-option near-transfer trap item (Transfer 1, Transfer 2, Delayed Check). |
| `POST` | `/api/session/reassessment/answer` | Submits trap item answer; updates BKT $p(\text{Present})$ and returns resolution state. |
| `GET` | `/api/learner/profile` | Fetches learner misconceptions state and longitudinal metrics from MongoDB. |
| `POST` | `/api/demo/seed` | Seeds a demo learner flagged `isDemo: true`. |
| `GET` | `/api/evaluation/metrics` | Serves frozen evaluation benchmark from `ml/Re-learn-fcrit/models/eval_report.json`. |
