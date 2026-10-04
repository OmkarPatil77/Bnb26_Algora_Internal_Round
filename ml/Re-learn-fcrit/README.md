# 🧠 Re:Learn — Adaptive Multimodal Learning Environment

> **Core Narrative:** A wrong answer is a symptom, not a verdict, and a correct follow-up is not proof of learning.

Re:Learn is an intelligent, multimodal pedagogical engine designed for introductory Python education. It goes beyond simple pass/fail automated grading by diagnosing student mental **misconceptions** (`M01`–`M07`), resolving diagnostic ambiguities using 1-question diagnostic probes, offering targeted personalized advice powered by **Google Gemini API**, and verifying conceptual resolution using near-transfer trap questions.

---

## 🎯 Key Features

- **⚡ Isolated Subprocess Sandbox:** Runs submitted Python code safely in temporary subprocesses with argument unpacking and timeout protection (5s limit).
- **🔬 143-Dimensional Feature Extractor:** Combines TF-IDF code tokens, AST node frequency counts, structural domain indicators (`has_print`, `has_return`, `has_floordiv`, `accumulator_inside_loop`), and execution pass/fail vectors.
- **🤖 Random Forest Diagnostic Classifier:** Trained on **493 verified student code samples** across 10 core introductory Python problems, achieving **100% Validation Accuracy** & **1.0000 Macro-F1**.
- **🔍 Out-of-Distribution Anomaly Detector:** Detects unlearned/unknown code patterns with an **81.25% Unknown Detection Rate** (`unknown_threshold = 0.60`).
- **❓ Diagnostic Probe Engine:** Automatically resolves ambiguous diagnoses (e.g., differentiating between `M01` `range(n)` and `M02` `range(a,b)`) using posterior probability updates ($P = 0.90$).
- **✨ Gemini Personalized Tutor:** Generates 2-sentence supportive explanations customized to the student's exact submitted code line using `gemini-2.5-flash`.
- **🪤 Resolution Trap Items:** Tests whether a student truly unlearned a misconception or just made a lucky guess.

---

## 🏷️ Misconception Taxonomy (M01 – M07)

| ID | Misconception Title | Description / Symptom | Pedagogical Strategy |
| :--- | :--- | :--- | :--- |
| **`M01`** | `range(n)` runs `1..n` | Believes `range(n)` starts at 1 and includes `n`. | Cognitive Conflict |
| **`M02`** | `range(a, b)` includes `b` | Believes upper bound `b` is inclusive. | Predict-Then-Reveal |
| **`M03`** | `print` vs `return` | Prints output inside function instead of returning value. | Code Trace |
| **`M04`** | `b = a` copies a list | Believes assigning list variable `b = a` creates a new copy. | Conceptual Analogy |
| **`M05`** | `/` vs `//` confusion | Uses integer division `//` when float mean expected. | Cognitive Conflict |
| **`M06`** | Accumulator inside loop | Re-initializes total inside loop, resetting on every iteration. | Code Trace |
| **`M07`** | `input()` returns a number | Forgets `int()`/`float()` conversion on user inputs. | Predict-Then-Reveal |

---

## 🏗️ System Architecture

```text
Student Python Code Submission
              │
              ▼
┌───────────────────────────┐
│       src/sandbox.py      │  Executes unit tests in isolated subprocess
└─────────────┬─────────────┘  Returns: passed test vector & actual outputs
              │
              ▼
┌───────────────────────────┐
│      src/features.py      │  Extracts 143 features (TF-IDF + AST + Execution)
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│      src/diagnose.py      │  Calls Random Forest Model (models/classifier.pkl)
└─────────────┬─────────────┘  Evaluates confidence margin & unknown threshold (0.60)
              │
              ├──────────────────────────────┐
     Low Margin (< 0.15)?           High Margin (> 0.15)
              │                              │
              ▼                              ▼
┌───────────────────────────┐  ┌───────────────────────────┐
│       src/probes.py       │  │    src/interventions.py    │
│  Asks Diagnostic Probe &  │  │  Delivers Intervention &  │
│ Updates Posterior (P=0.90)│  │ Gemini Custom Explanation │
└─────────────┬─────────────┘  └─────────────┬─────────────┘
              │                              │
              └──────────────┬───────────────┘
                             │
                             ▼
               ┌───────────────────────────┐
               │    Near-Transfer Trap     │
               │   Resolution Assessment   │
               └───────────────────────────┘
```

---

## 📁 Repository Structure

```text
fcrit/
├── data/
│   ├── cards.json                  # 7 Misconception taxonomy specifications
│   ├── problems.json               # 10 Core introductory Python problems & test suites
│   ├── schema_doc.md               # Dataset JSON Schema definition
│   ├── all_samples.jsonl           # Merged dataset (493 verified samples)
│   ├── train.jsonl                 # Training split (269 samples)
│   ├── val.jsonl                   # Validation split (88 samples)
│   ├── test.jsonl                  # Held-out test split (136 samples)
│   └── overlap_set.jsonl           # Probe overlap set (80 samples)
├── src/
│   ├── sandbox.py                  # Isolated subprocess execution engine
│   ├── features.py                 # 143-dimensional feature extraction pipeline
│   ├── train_model.py              # Random Forest classifier training script
│   ├── diagnose.py                 # Core diagnosis API engine
│   ├── calibrate_threshold.py      # Unknown threshold calibration tool
│   ├── probes.py                   # Diagnostic probe & posterior probability updater
│   ├── interventions.py            # Pedagogical intervention lookup & Gemini tutor
│   ├── generate_dataset.py         # Dataset generation & sandbox verification
│   └── verify_dataset.py           # Dataset ingestion & train/val/test splitting
├── models/
│   ├── classifier.pkl              # Saved Random Forest model weights
│   ├── feature_extractor.pkl       # Saved fitted feature extractor
│   └── train_metrics.json          # Training evaluation metrics log
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rule specifications
├── requirements.txt                # Python package requirements
├── PROGRESS_SUMMARY.md             # Detailed project milestone summary
├── IMPLEMENTATION_CHECKLIST.md     # Phase-by-phase implementation plan
└── README.md                       # Project overview & documentation
```

---

## 🚀 Quick Start Guide

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/relearn-adaptive-learning.git
cd relearn-adaptive-learning
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and insert your Gemini API Key:
```bash
cp .env.example .env
```
Edit `.env`:
```env
GEMINI_API_KEY=your_google_ai_studio_api_key_here
```

### 3. Test Sandbox Execution
```bash
python src/sandbox.py
```

### 4. Train Diagnostic Model
```bash
python src/train_model.py
```

### 5. Run Misconception Diagnosis API
```python
from src.diagnose import diagnose

code = """
def sum_to_n(n):
    total = 0
    for i in range(n):
        total += i
    return total
"""

result = diagnose("sum_to_n", code)
print("Diagnosis Result:", result)
```

---

## 🧪 Benchmark Results

| Metric | Validation Set (`data/val.jsonl`) |
| :--- | :--- |
| **Accuracy** | **100.00%** (88/88 samples) |
| **Macro-F1** | **1.0000** |
| **Weighted F1** | **1.0000** |
| **Unknown Detection Rate** | **81.25%** on held-out `M07` (`unknown_threshold = 0.60`) |

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
