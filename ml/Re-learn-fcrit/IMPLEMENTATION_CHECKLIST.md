# Re:Learn — Implementation Plan & Phase Checklists
> **Adaptive Multimodal Learning Environment (12-Hour Hackathon Plan)**  
> **Core Concept:** A wrong answer is a symptom, not a verdict, and a correct follow-up is not proof of learning.

---

## 📊 Existing Datasets Summary
Nine verified dataset files have been ingested into the workspace:
1. **`sum_to_n_verified.jsonl`** (76 samples): `problem_id`: `"sum_to_n"` (`M01`, `M02`, `M03`, `M06`, `NONE`)
2. **`factorial.jsonl`** (76 samples): `problem_id`: `"factorial"` (`M01`, `M02`, `M03`, `M06`, `NONE`)
3. **`average_verified.jsonl`** (59 samples): `problem_id`: `"average"` (`M05`, `M03`, `M06`, `NONE`)
4. **`add_item.jsonl`** (44 samples): `problem_id`: `"add_item"` (`M04`, `M03`, `NONE`)
5. **`double_each.jsonl`** (44 samples): `problem_id`: `"double_each"` (`M04`, `M03`, `NONE`)
6. **`count_evens.jsonl`** (44 samples): `problem_id`: `"count_evens"` (`M06`, `M03`, `NONE`)
7. **`max_of_list.jsonl`** (44 samples): `problem_id`: `"max_of_list"` (`M06`, `M03`, `NONE`)
8. **`read_and_add.jsonl`** (44 samples): `problem_id`: `"read_and_add"` (`M07`, `M03`, `NONE`)
9. **`square.jsonl`** (20 samples): `problem_id`: `"square"` (`M03`, `NONE`)

**Total Verified Samples Loaded:** 451 samples across 9 core problem types.

---

## 🏷️ Misconception Taxonomy (M01 – M07)

| ID | Misconception | Key Characteristics / Symptom | Status / Role |
| :--- | :--- | :--- | :--- |
| **M01** | `range(n)` runs `1..n` | Believes `n` is included in `range(n)` | Included in `sum_to_n_verified.jsonl` (Same-symptom pair with M02) |
| **M02** | `range(a, b)` includes `b` | Believes upper bound `b` is inclusive | Included in `sum_to_n_verified.jsonl` (Same-symptom pair with M01) |
| **M03** | `print` and `return` are the same | Prints output inside function instead of returning | Included in `sum_to_n_verified.jsonl` & `average_verified.jsonl` |
| **M04** | `b = a` copies a list | Aliasing confusion | To be added / generated for list problems |
| **M05** | `/` vs `//` confusion | Uses integer division `//` when float expected (or vice versa) | Included in `average_verified.jsonl` |
| **M06** | Accumulator initialised inside loop | Resets accumulator state on each iteration | Included in `sum_to_n_verified.jsonl` & `average_verified.jsonl` |
| **M07** | `input()` returns a number | Forgets `int()`/`float()` conversion | **Held out of training** to demonstrate "unknown" detection |

*Note: M01/M02 form the primary same-symptom overlap pair for posterior probe differentiation.*

---

## 📋 Phase-by-Phase Checklists

### 🚀 Phase 0: Setup and Lock-In (Hour 0–1)
**Goal:** Establish code contracts, frozen schemas, and development environment.

- [x] **0.1** Set up repository directory structure: `data/`, `src/`, `models/`, `app/`, `eval/`.
- [x] **0.2** Environment & Dependencies setup: `transformers`, `torch`, `scikit-learn`, `fastapi`, `uvicorn`, `google-genai`, `React` (Vite), `plotly`, `ast`, `difflib`.
- [x] **0.3** Obtain & configure Gemini API Key (`Google AI Studio`).
- [x] **0.4** Author the 7 misconception cards (`cards.json`): belief, why wrong, counterexample, intervention type, probe, trap item.
- [x] **0.5** Select 10 core problems with statements, canonical solutions, and 3–5 test cases (`problems.json`).
- [x] **0.6** Freeze JSON schema for code samples: `(id, problem_id, problem, code, label, tests, actual, passed, source)`.
- [x] **Deliverables:** `cards.json`, `problems.json`, `schema_doc.md`.
- [x] **Exit Check:** Every module contract locked in; Gemini API connection tested & operational.

---

### 🧪 Phase 1: Sandbox and Dataset (Hour 1–3.5)
**Goal:** Complete dataset of ~500 verified samples across problem types.

- [x] **1.1** Implement Sandbox runner: `run_code(code, tests)` returning `actual`, `passed`, `error` with `subprocess` execution and 5s timeout ([`src/sandbox.py`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/src/sandbox.py)).
- [x] **1.2** Ingest existing datasets: 9 uploaded dataset files (451 samples total across 9 problem types).
- [x] **1.3** Dataset generation script to expand remaining problems and misconceptions ([`src/generate_dataset.py`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/src/generate_dataset.py)).
- [x] **1.4** Apply verification filter: correct samples pass all tests; buggy samples fail at least one test without unrelated crashes.
- [x] **1.5** Compute `actual` and `passed` outputs dynamically via Sandbox execution (never hand-code results).
- [x] **1.6** Hand-write ~30 messy real-world student code samples & spot-check 10% of generated data.
- [x] **1.7** Tag M01/M02 same-symptom overlap set (`data/overlap_set.jsonl`: 80 samples).
- [x] **1.8** Perform train/val/test split by problem (holding out `factorial` & `double_each`, reserving `M07` for unknown evaluation).
- [x] **Deliverables:** `data/all_samples.jsonl` (493 samples), `data/train.jsonl` (269 samples), `data/val.jsonl` (88 samples), `data/test.jsonl` (136 samples), `data/overlap_set.jsonl` (80 samples).
- [x] **Exit Check:** Datasets ingested and written to `data/` without hanging; class counts printed and verified.

---

### 🩺 Phase 2: Baseline Model and Diagnosis API (Hour 2.5–5)
**Goal:** Build a functional baseline model for misconception diagnosis.

- [x] **2.1** Feature extraction pipeline ([`src/features.py`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/src/features.py)):
  - TF-IDF on tokenized code (100 features).
  - AST node frequency counts & domain indicators (37 features).
  - Test case execution pass/fail vector (6 features).
- [x] **2.2** Train Random Forest classifier on `data/train.jsonl` using `CodeFeatureExtractor` ([`src/train_model.py`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/src/train_model.py)) and save to `models/classifier.pkl`.
- [x] **2.3** Evaluate model accuracy and macro-F1 score on validation set (`data/val.jsonl`: 100% Accuracy, 1.0 Macro-F1).
- [x] **2.4** Implement `diagnose(problem_id, code)` API in [`src/diagnose.py`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/src/diagnose.py):
  - Returns top-2 predicted misconception labels with confidence probabilities.
  - Returns confidence margin score and unknown detection flag.
- [x] **2.5** Calibrate unknown detection threshold (`max_prob < 0.60`) on validation set containing held-out `M07` samples (achieves 81.25% unknown detection).
- [x] **Deliverables:** `models/classifier.pkl`, `models/feature_extractor.pkl`, `src/train_model.py`, `src/diagnose.py`, `src/calibrate_threshold.py`.
- [x] **Exit Check:** Calling `diagnose("sum_to_n", m01_code)` returns top label `M01` (confidence: 0.95, margin: 0.90).

---

### 🔍 Phase 3: Probes, Interventions, and Items (Hour 1–5, parallel)
**Goal:** Construct pedagogical content for differentiation and intervention.

- [x] **3.1** Probe differentiation engine for M01/M02 pair ([`src/probes.py`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/src/probes.py)):
  - Applies posterior probability update: $P(\text{M01} \mid \text{ans}) = 0.90$ for answer '1', $P(\text{M02} \mid \text{ans}) = 0.90$ for answer '5'.
- [x] **3.2** Intervention lookup engine ([`src/interventions.py`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/src/interventions.py)):
  - Loads intervention cards from `data/cards.json` for all 7 misconceptions (`predict-then-reveal`, `cognitive_conflict`, `analogy`, `code_trace`).
- [x] **3.3** Implement `personalise(code, misconception)` using Gemini API (`gemini-2.5-flash`) with student's code and fallback text if offline.
- [x] **3.4** Assessment & trap question retriever for resolution verification.
- [x] **Deliverables:** `src/probes.py`, `src/interventions.py`, `personalise()` function.
- [x] **Exit Check:** Able to retrieve intervention, trap item, and Gemini personalized advice for all 7 misconceptions.

---

### 🖥️ Phase 4: React UI Loop, End to End (Hour 3.5–6)
**Goal:** End-to-end interactive workflow in React application connected to Python diagnosis API backend.

- [ ] **4.1** UI Component: React Code Editor component $\rightarrow$ FastAPI sandbox/`diagnose()` endpoint $\rightarrow$ Display label & confidence.
- [ ] **4.2** Ambiguity resolution: Trigger probe UI modal when diagnosis margin is low, re-diagnose based on probe response.
- [ ] **4.3** Display targeted intervention card component (with Gemini personalised explanation).
- [ ] **4.4** Resolution step: Present trap item component to student and record submission pass/fail state.
- [ ] **Deliverables:** Working React web application (`app/` or `frontend/`) and FastAPI backend server (`backend/`).
- [ ] **Exit Check (Hour 6 Checkpoint):** Uninformed user can complete full flow (diagnosis $\rightarrow$ probe $\rightarrow$ intervention $\rightarrow$ trap question) in the React app without UI errors.

---

### 🔄 Phase 5: Resolution Assessment and Learner Model (Hour 6–8)
**Goal:** Implement non-naive learner belief tracking and state updates.

- [ ] **5.1** Strict resolution criterion: Misconception marked `resolved` ONLY if trap item passes AND a second check (near-transfer or explain-why) passes.
- [ ] **5.2** Automated "Explain-why" scoring using Gemini against misconception card criteria.
- [ ] **5.3** Bayesian-style belief state updates:
  - If trap passed: $\text{Belief} \leftarrow \text{Belief} \times 0.3$
  - If trap failed: $\text{Belief} \leftarrow \min(1.0, \text{Belief} + 0.15)$
- [ ] **5.4** Learner state machine: `active` $\rightarrow$ `suspected` $\rightarrow$ `resolved` $\rightarrow$ `recurring`.
- [ ] **5.5** React dashboard component showing belief state per misconception over attempt history.
- [ ] **5.6** Build "Lucky Guess" demo path: passes initial follow-up, fails trap item, remains `active`.
- [ ] **Deliverables:** `learner_model.py`, dashboard UI component, lucky-guess demonstration case.
- [ ] **Exit Check:** Simulated student attempts trigger accurate state transitions, including `resolved` reverting to `recurring` on repeat failure.

---

### 🧠 Phase 6: Simplified LLM Fallback Classifier (Hour 3.5–8, parallel)
**Goal:** Add lightweight Gemini zero-shot fallback for low-confidence inputs (replaces heavy CodeBERT GPU training for fast MVP delivery).

- [ ] **6.1** Gemini Fallback Classifier ([`src/llm_classifier.py`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/src/llm_classifier.py)):
  - Calls Gemini API with `cards.json` prompt context when RF classifier confidence is below threshold.
- [ ] **Deliverables:** `src/llm_classifier.py`.
- [ ] **Exit Check:** Low-confidence inputs trigger Gemini fallback diagnosis smoothly.

---

### 📈 Phase 7: Evaluation & Quick Metrics (Hour 8–10.5)
**Goal:** Generate evaluation metrics and presentation visuals.

- [ ] **7.1** Benchmark evaluation on test set (`data/test.jsonl`): Compute accuracy, macro-F1 score, and confusion matrix.
- [ ] **7.2** Generate 2 visual charts using Plotly/Matplotlib in `eval/`:
  1. Misconception Diagnosis Accuracy & F1 Score.
  2. Probe Differentiation Accuracy Improvement.
- [ ] **Deliverables:** `eval/results.json`, 2 exported chart image files.
- [ ] **Exit Check:** Benchmark results saved and charts rendered.

---

### 🛡️ Phase 8: Integration and Hardening (Hour 8–11, parallel with Phase 7)
**Goal:** System stability, error handling, offline fallback, and code freeze.

- [ ] **8.1** Integration test: Verify all 7 misconceptions execute flawlessly through full React app loop.
- [ ] **8.2** Implement response caching for Gemini API calls (prevent rate limits and handle network drops).
- [ ] **8.3** Hardening: Gracefully handle sandbox timeouts, syntax errors, and empty code input in React frontend and Python API backend.
- [ ] **8.4** Curate 3 saved demo presets:
  1. Ambiguous M01 code sample.
  2. M03 print-vs-return sample.
  3. Lucky-guess sample.
- [ ] **8.5** **Code Freeze at Hour 11.**
- [ ] **Deliverables:** Hardened React web application & Python backend API, pre-configured demo presets.
- [ ] **Exit Check:** 3 consecutive full end-to-end demo runs without errors (including 1 offline run with Wi-Fi disabled).

---

### 🎬 Phase 9: Demo and Submission (Hour 11–12)
**Goal:** 3-minute pitch, slide deck, backup video, and repository submission.

- [ ] **9.1** Prepare 5–7 presentation slides:
  - Problem & Core Concept ("Symptom, not a verdict").
  - Architecture & Loop.
  - Dataset & Misconception Taxonomy.
  - Quantitative Results & Model Comparisons.
  - Live Demo walkthrough.
  - Limitations & Future Scope.
- [ ] **9.2** Rehearse 3-minute presentation with timer (2 iterations).
- [ ] **9.3** Record high-quality backup video of live demo flow.
- [ ] **9.4** Finalize comprehensive `README.md` with setup instructions and run commands.
- [ ] **9.5** Submit hackathon entry prior to final deadline.
- [ ] **Deliverables:** Slide deck (`slides.pdf`), backup video (`demo.mp4`), finalized `README.md`.
- [ ] **Exit Check:** Submission files uploaded and confirmed accessible before deadline.

---

## ✂️ Fallback / Feature Trimming Hierarchy (If Behind Schedule)
If time constraints require cutting scope, cut features in this exact order:
1. ❌ **Gemini few-shot comparison** (keep Random Forest baseline)
2. ❌ **Complex Ablation Studies** (keep overall accuracy & F1 score)
3. ❌ **Dashboard Visual Polish** (keep essential UI cards)
4. 🛑 **NEVER CUT:** Verified dataset (493 samples), Diagnosis engine, Probe differentiation, Trap-item resolution, or Final Demo.

---

## 🛠️ Streamlined Technology Stack (MVP)

| Layer | Selected Technology |
| :--- | :--- |
| **Machine Learning** | Python 3.10+, `scikit-learn` (Random Forest), `numpy` |
| **LLM & Prompting** | Gemini API (`gemini-2.5-flash`), `google-genai` |
| **Code Execution** | Subprocess Sandbox (5s timeout, isolated temp directory) |
| **Code Analysis** | Python `ast`, `difflib`, `TfidfVectorizer` |
| **Backend API** | FastAPI / `uvicorn` (Python 3.10+) |
| **Web UI** | React (Vite) with Tailwind / Vanilla CSS |
| **Visualization** | Plotly / Matplotlib / Recharts |
| **Data Storage** | JSON / JSONL files, React State / LocalStorage |
