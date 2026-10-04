# Re:Learn

Re:Learn is a neuro-symbolic diagnostic and pedagogical tutoring system for introductory Python programming. Rather than merely checking whether student code passes unit tests, Re:Learn identifies underlying conceptual misconceptions from syntax and semantic patterns, clarifies ambiguities with targeted diagnostic probes, and guides students through interactive code tracing and near-transfer reassessment.

---

## Key Features

- **Misconception Diagnosis**: Analyzes Python code submissions using a Random Forest classifier combined with AST and TF-IDF feature extractors to detect specific introductory programming misconceptions (e.g., `range()` upper bound off-by-one, accumulator variable re-initialization inside loops, returning early inside loops, mutable default arguments).
- **Bayesian Disambiguation Probes**: When multiple misconception hypotheses exhibit close probabilities, the system presents targeted multiple-choice diagnostic questions to disambiguate the student's exact mental model.
- **Interactive Execution Tracing**: Provides a step-by-step variable state debugger and execution visualizer so students can observe code behavior line by line.
- **Predict-Then-Run Interventions**: Highlights counterexamples and asks learners to predict program output before revealing execution results to challenge incorrect assumptions.
- **Near-Transfer Reassessment**: Evaluates conceptual repair through a structured 3-step reassessment sequence (Immediate Transfer, Variation Transfer, and Delayed Validation).
- **Bayesian Knowledge Tracing (BKT)**: Tracks learner mastery longitudinally over time, updating misconception presence probabilities ($P(\text{Present})$) and status transitions (`Active`, `Intervened`, `Resolved`, `Recurred`).
- **Learner Profile & Evaluation Dashboards**: Displays individual student misconception histories and system-level classifier performance metrics (confusion matrix, F1-scores, out-of-distribution unknown detection).

---

## System Architecture

The project is structured into three decoupled layers communicating over HTTP:

```
┌─────────────────────────┐
│        Frontend         │  React 19 + TanStack Router + Monaco Editor
│ (re-learnfrontend:8080) │  Interactive UI, code editor, trace stepper
└────────────┬────────────┘
             │ HTTP / JSON
┌────────────▼────────────┐
│         Backend         │  Node.js 20 + Express + TypeScript + MongoDB
│     (backend:3000)      │  BKT engine, session & learner profile management
└────────────┬────────────┘
             │ HTTP / JSON
┌────────────▼────────────┐
│       ML Service        │  FastAPI + scikit-learn + Python 3.10+
│  (Re-learn-fcrit:8001)  │  AST classifier, execution tracer, probe selector
└─────────────────────────┘
```

1. **Frontend (`/frontend/re-learnfrontend`)**: Single-page application built with React, Vite, TanStack Router, Tailwind CSS, and Monaco Editor. Handles student interactions, diagnostic visualization, probe answering, and execution tracing.
2. **Backend (`/backend`)**: Express application written in TypeScript. Implements session management, BKT posterior updates ($s = 0.10, g = 1/N$), learner state machines, and MongoDB persistence.
3. **ML Microservice (`/ml/Re-learn-fcrit`)**: FastAPI service running the diagnostic Random Forest model, Python AST feature extraction, sandboxed execution tracing, and Gemini-assisted pedagogical personalization.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite, TanStack Router, Tailwind CSS, Monaco Editor, Lucide React
- **Backend**: Node.js 20, Express, TypeScript, MongoDB (Mongoose), Zod, Vitest
- **ML / AI**: Python 3.10+, FastAPI, scikit-learn, Google GenAI SDK (Gemini), AST parsing

---

## Getting Started

### Prerequisites

- **Node.js**: v20 or newer (`npm`)
- **Python**: v3.10 or newer with `pip`
- **MongoDB**: A running local MongoDB instance or a MongoDB Atlas connection string

---

### 1. ML Microservice Setup

```bash
cd ml/Re-learn-fcrit

# Install dependencies
pip install -r requirements.txt

# (Optional) Create .env if using personalized Gemini feedback
# GEMINI_API_KEY=your_key_here

# Run the FastAPI service
uvicorn service:app --host 127.0.0.1 --port 8001 --reload
```

The ML service will be available at `http://127.0.0.1:8001`.

---

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables (.env)
# PORT=3000
# MONGODB_URI=mongodb://localhost:27017/relearn   # or your MongoDB Atlas URI
# ML_URL=http://127.0.0.1:8001
# FRONTEND_URL=http://localhost:8080

# Seed initial problem and probe collections
npm run init-db

# Run development server
npm run dev
```

The backend API will be available at `http://127.0.0.1:3000`.

To run backend test suites:
```bash
npm test
```

---

### 3. Frontend Setup

```bash
cd frontend/re-learnfrontend

# Install dependencies
npm install

# Configure environment variables (.env)
# VITE_API_URL=http://127.0.0.1:3000/api
# VITE_USE_MOCK=false

# Start development server
npm run dev
```

The application interface will be available at `http://localhost:8080`.

---