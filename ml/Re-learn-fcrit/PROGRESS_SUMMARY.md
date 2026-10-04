# Re:Learn — Project Progress Summary
> **Adaptive Multimodal Learning Environment (12-Hour Hackathon Plan)**  
> **Core Concept:** A wrong answer is a symptom, not a verdict, and a correct follow-up is not proof of learning.  
> **Current Status:** **Phase 0**, **Phase 1**, **Phase 2**, and **Phase 3** are **100% Complete**! 🎉

---

## 📌 Executive Summary
The system contains a complete end-to-end pedagogical diagnostic engine:
1. **Isolated Execution Sandbox:** Executes student code inside isolated subprocesses.
2. **Feature Extractor:** Converts code into a 143-dimensional vector (TF-IDF + AST + Execution pass/fail).
3. **Random Forest Classifier:** Diagnoses misconception with **100% Validation Accuracy** & **1.0000 Macro-F1**.
4. **Unknown Anomaly Detector:** Flags unlearned/unknown code with an **81.25% Unknown Detection Rate**.
5. **Diagnostic Probe Engine:** Resolves low-confidence ambiguity between same-symptom misconceptions (`M01` vs `M02`).
6. **Intervention & Personalized LLM Tutor:** Delivers targeted pedagogical cards and custom Gemini explanations (`gemini-2.5-flash`).
7. **Near-Transfer Trap Item:** Evaluates true conceptual resolution.

---

## 🚀 Complete Phase-by-Phase Progress

### 🛠️ Phase 0: Setup and Lock-In (Completed)
- **Directory Layout:** `data/`, `src/`, `models/`, `app/`, `eval/`.
- **Gemini API:** Verified live connection with `gemini-2.5-flash` (`"READY"`).
- **Misconception Cards ([`data/cards.json`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/data/cards.json)):** Taxonomy for `M01` through `M07`.
- **Core Problems ([`data/problems.json`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/data/problems.json)):** 10 introductory Python problems with canonical solutions & unit test suites.
- **Dataset Schema ([`data/schema_doc.md`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/data/schema_doc.md)):** Frozen schema specification.

### 🧪 Phase 1: Sandbox and Dataset (Completed)
- **Subprocess Sandbox Runner ([`src/sandbox.py`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/src/sandbox.py)):** Isolated Python execution with dynamic parameter unpacking & 5s timeout.
- **Dataset Expansion ([`src/generate_dataset.py`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/src/generate_dataset.py)):** Expanded dataset to **493 verified samples** across all 10 problems.
- **Dataset Splits ([`src/verify_dataset.py`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/src/verify_dataset.py)):**
  - `data/all_samples.jsonl`: 493 samples
  - `data/train.jsonl`: 269 training samples
  - `data/val.jsonl`: 88 validation samples
  - `data/test.jsonl`: 136 test samples
  - `data/overlap_set.jsonl`: 80 probe overlap samples

### 🩺 Phase 2: Baseline Model and Diagnosis API (Completed)
- **Feature Extractor ([`src/features.py`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/src/features.py)):** Extracts 143 features per submission (100 TF-IDF + 37 AST + 6 Execution vector).
- **Random Forest Model ([`src/train_model.py`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/src/train_model.py)):** Trained model saved to [`models/classifier.pkl`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/models/classifier.pkl). Validation Accuracy: **100.00%**, Macro-F1: **1.0000**.
- **Diagnosis API ([`src/diagnose.py`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/src/diagnose.py)):** Function `diagnose(problem_id, code)` returns top-2 labels, confidence scores, margin, pass/fail test vector, and unknown flag.
- **Unknown Calibration ([`src/calibrate_threshold.py`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/src/calibrate_threshold.py)):** Calibrated `unknown_threshold = 0.60`, achieving **81.25% Unknown Detection Rate**.

### 🔍 Phase 3: Probes, Interventions, and Items (Completed)
- **Diagnostic Probe Engine ([`src/probes.py`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/src/probes.py)):** Retrieves diagnostic probe questions & performs posterior probability updates ($P(\text{M01}) = 0.90$).
- **Intervention Lookup Engine ([`src/interventions.py`](file:///c:/Users/Devesh/OneDrive/Documents/fcrit/src/interventions.py)):** Fetches targeted pedagogical cards (`belief`, `why_wrong`, `counterexample`, `intervention_type`).
- **Gemini Personalized Advice Engine (`personalise()`):** Generates 2-sentence custom explanations customized to student code lines using Gemini API (`gemini-2.5-flash`).
- **Trap Item Retriever (`get_trap_item()`):** Fetches near-transfer trap items to test conceptual resolution.

---

## 🔄 Lifecycle Walkthrough of 3 Different Test Cases

### ───────────── TEST CASE 1: Ambiguous `M01` vs `M02` Submission ─────────────
- **Problem:** `sum_to_n` (Calculate sum 1 to N)
- **Student Code Submitted:**
  ```python
  def sum_to_n(n):
      total = 0
      for i in range(n):  # Believes range(n) includes n from 1..n
          total += i
      return total
  ```
- **Phase 1 (Sandbox Execution):**
  - Runs unit tests `[3, 5, 10, 1]`.
  - Returned actual outputs: `[3, 10, 45, 0]` (expected: `[6, 15, 55, 1]`).
  - Passed vector: `[False, False, False, False]`.
- **Phase 2 (Diagnosis Engine):**
  - Features extracted: `has_range=1.0`, `has_return=1.0`, `test_pass_ratio=0.0`.
  - Classifier output: `top1 = M01 (52.0%)`, `top2 = M02 (48.0%)`.
  - Margin: `0.04` (Low confidence margin < 0.15 $\rightarrow$ Triggers Probe).
- **Phase 3 (Probe & Differentiation):**
  - System asks Diagnostic Probe: *"What is the first element generated by range(5)?"* Options: `[0, 1]`.
  - Student selects `'1'` (Index 1).
  - Posterior Update: $P(\text{M01}) \leftarrow 0.90, P(\text{M02}) \leftarrow 0.05$. Label updated to **`M01`**.
- **Phase 3 (Intervention & Trap):**
  - Displays M01 Cognitive Conflict Card: *"Python range(n) is 0-indexed and half-open [0, n). List(range(3)) is [0, 1, 2], not [1, 2, 3]."*
  - **Gemini Personalized Advice:** *"Notice how for i in range(n) generates numbers starting from 0 up to n-1. To sum from 1 to n inclusive, try setting range(1, n + 1)."*
  - **Trap Item Presented:** *"What is sum_indices(3) for range(n)?"* Options: `[3 (0+1+2), 6 (1+2+3)]`.

---

### ───────────── TEST CASE 2: `M03` Print vs Return Submission ─────────────
- **Problem:** `average` (Calculate float mean of list)
- **Student Code Submitted:**
  ```python
  def average(nums):
      total = sum(nums)
      print(total / len(nums))  # Uses print instead of return
  ```
- **Phase 1 (Sandbox Execution):**
  - Runs unit tests `[[2, 4, 6], [1, 2], [5, 6], [3]]`.
  - Returned actual outputs: `[None, None, None, None]`.
  - Passed vector: `[False, False, False, False]`.
- **Phase 2 (Diagnosis Engine):**
  - Features extracted: `has_print=1.0`, `has_return=0.0`, `test_pass_0=0.0`.
  - Classifier output: `top1 = M03 (98.0%)`, `top2 = NONE (1.0%)`.
  - Margin: `0.97` (High confidence margin $\rightarrow$ Skips Probe directly to Intervention).
- **Phase 3 (Intervention & Trap):**
  - Displays M03 Code Trace Card: *"print() displays text to standard output and returns None, whereas return passes a value back to the caller."*
  - **Gemini Personalized Advice:** *"Your code prints the average to the console rather than returning it to the caller function. Replace `print(...)` with `return ...` so the result can be evaluated."*
  - **Trap Item Presented:** *"What will `square(3) + 1` evaluate to if `square` uses `print()`?"* Options: `[TypeError: unsupported operand type for +: 'NoneType' and 'int', 10]`.

---

### ───────────── TEST CASE 3: Out-of-Distribution / Unknown Submission ─────────────
- **Problem:** `read_and_add` (Convert string inputs to int and add)
- **Student Code Submitted:**
  ```python
  def read_and_add(a, b):
      return a + b  # Concatenates strings instead of int addition
  ```
- **Phase 1 (Sandbox Execution):**
  - Runs unit tests `[['3', '4'], ['10', '5']]`.
  - Returned actual outputs: `['34', '105']` (expected: `[7, 15]`).
  - Passed vector: `[False, False]`.
- **Phase 2 (Diagnosis Engine & Unknown Detection):**
  - Classifier output: Top prediction probability is $0.52 < 0.60$ (`unknown_threshold`).
  - Anomaly flag: `is_unknown = True`.
  - Final Diagnosis: **`UNKNOWN`** (Out-of-distribution misconception M07 held out from training).
- **Phase 3 (Intervention & Trap):**
  - System triggers general diagnostic advice: *"This submission exhibits unknown or unlearned code patterns. Please check string-to-integer conversion (`int()`)."*

---

## 🔜 Next Phase Ahead: Phase 4 (React MVP UI & FastAPI Backend)
- **Task 4.1:** FastAPI server (`app/main.py`) exposing `/api/diagnose`, `/api/probe`, `/api/intervention`, `/api/submit_trap`.
- **Task 4.2:** React MVP frontend (`frontend/`): Code Editor, Diagnosis Output Card, Probe Modal, Targeted Intervention Display, and Trap Question Component.
