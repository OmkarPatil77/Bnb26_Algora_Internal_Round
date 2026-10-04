import json
import os
import sys
import io
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

_BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_BASE_DIR))

from src.diagnose import diagnose, _load_artifacts
from src.probes import get_probe, evaluate_probe_answer
from src.interventions import get_intervention, get_trap_item, personalise
from src.sandbox import run_code
from src.tracer import trace_code

app = FastAPI(
    title="Re:Learn ML Service",
    description="Intelligent diagnostic, probing, and pedagogical feedback engine for introductory Python misconceptions.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Pydantic Models -----------------

class DiagnoseRequest(BaseModel):
    problem_id: str = Field(..., description="Problem identifier from data/problems.json")
    code: str = Field(..., description="Student Python source code submission")
    unknown_threshold: Optional[float] = Field(0.60, description="Unknown threshold")

class CandidateItem(BaseModel):
    id: str
    label: str
    probability: float

class ProbeEvaluateRequest(BaseModel):
    label: str = Field(..., description="Misconception ID (e.g. M01)")
    selected_option_index: int = Field(..., ge=0, description="0-indexed chosen option")
    current_top2: List[Dict[str, Any]] = Field(..., description="Top candidate probability list")

class PersonaliseRequest(BaseModel):
    code: str = Field(..., description="Submitted Python source code")
    label: str = Field(..., description="Misconception ID")

class TraceRequest(BaseModel):
    code: str = Field(..., description="Python code to trace")
    call: Optional[str] = Field(None, description="Optional invocation expression like func(3)")

# ----------------- Helper Functions -----------------

def _get_cards():
    cards_path = _BASE_DIR / 'data' / 'cards.json'
    if cards_path.exists():
        with open(cards_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def _get_problems():
    prob_path = _BASE_DIR / 'data' / 'problems.json'
    if prob_path.exists():
        with open(prob_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def _get_card_title(card_id: str) -> str:
    cards = _get_cards()
    for c in cards:
        if c.get('id') == card_id:
            return c.get('title', card_id)
    if card_id == "NONE":
        return "No Misconception"
    if card_id == "UNKNOWN":
        return "Uncertain / Anomaly"
    return card_id

# ----------------- API Endpoints -----------------

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Re:Learn ML Service", "version": "2.0.0"}

@app.get("/labels")
def get_labels():
    cards = _get_cards()
    return [{"id": c["id"], "title": c["title"]} for c in cards]

@app.get("/problems")
def list_problems():
    return _get_problems()

@app.get("/problems/{problem_id}")
def get_problem(problem_id: str):
    problems = _get_problems()
    problem = next((p for p in problems if p.get('id') == problem_id), None)
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Problem with id '{problem_id}' not found."
        )
    return problem

@app.post("/diagnose")
def diagnose_submission(req: DiagnoseRequest):
    _load_artifacts()
    problems = {p['id']: p for p in _get_problems()}
    if req.problem_id not in problems:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Problem with id '{req.problem_id}' not found in problems catalog."
        )

    diag_result = diagnose(req.problem_id, req.code, unknown_threshold=req.unknown_threshold or 0.60)

    # Extract real top-3 classes from predict_proba (no zero padding)
    from src.diagnose import _CLASSIFIER, _FEATURE_EXTRACTOR
    sample = {
        "problem_id": req.problem_id,
        "code": req.code,
        "tests": problems[req.problem_id].get("tests", {"inputs": [], "expected": []}),
        "passed": diag_result.get("passed_tests", [])
    }
    X = _FEATURE_EXTRACTOR.transform([sample])
    probs = _CLASSIFIER.predict_proba(X)[0]
    classes = _CLASSIFIER.classes_

    sorted_pairs = sorted(zip(classes, probs), key=lambda x: x[1], reverse=True)
    
    # Top 3 non-zero classes (or top 3 sorted classes with real probabilities)
    top3 = []
    for c, p in sorted_pairs[:3]:
        top3.append({
            "id": str(c),
            "label": _get_card_title(str(c)),
            "probability": float(round(p, 4))
        })

    diag_result["top3"] = top3
    return diag_result

@app.get("/probe/{label}")
def fetch_probe(label: str):
    probe = get_probe(label)
    if not probe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Diagnostic probe for misconception '{label}' not found."
        )
    return probe

@app.post("/probe/evaluate")
def evaluate_probe(req: ProbeEvaluateRequest):
    eval_res = evaluate_probe_answer(req.label, req.selected_option_index, req.current_top2)
    return eval_res

@app.get("/intervention/{label}")
def fetch_intervention(label: str):
    interv = get_intervention(label)
    if not interv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Intervention card for misconception '{label}' not found."
        )
    return interv

@app.post("/personalise")
def personalise_explanation(req: PersonaliseRequest):
    interv = get_intervention(req.label)
    if not interv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Misconception '{req.label}' not found."
        )
    try:
        explanation = personalise(req.code, req.label)
    except Exception:
        explanation = interv.get("why_wrong", "Review the bounds and variable references in your code.")
    return {
        "label": req.label,
        "explanation": explanation
    }

@app.get("/trap/{label}")
def fetch_trap_item(label: str, index: int = Query(0, ge=0, le=2)):
    # Check data/trap_items.json first
    trap_path = _BASE_DIR / 'data' / 'trap_items.json'
    if trap_path.exists():
        with open(trap_path, 'r', encoding='utf-8') as f:
            trap_data = json.load(f)
        items_for_label = trap_data.get('items', {}).get(label, [])
        if items_for_label:
            target_idx = min(index, len(items_for_label) - 1)
            return items_for_label[target_idx]

    # Fallback to single cards.json item
    single_trap = get_trap_item(label)
    if not single_trap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trap item for misconception '{label}' not found."
        )
    return single_trap

@app.get("/predict-then-run/{label}")
def get_predict_then_run(label: str):
    ptr_path = _BASE_DIR / 'data' / 'predict_then_run.json'
    if not ptr_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Predict-then-run dataset not found."
        )

    with open(ptr_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    item = data.get('items', {}).get(label)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Predict-then-run challenge for misconception '{label}' not found."
        )

    snippet = item.get("snippet", "")
    prompt = item.get("prompt", "")

    # Dynamically compute expected output at request time by executing snippet in sandbox
    # Execute snippet in isolated subprocess to capture real stdout
    import subprocess
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        script_file = os.path.join(tmpdir, "ptr_runner.py")
        with open(script_file, "w", encoding="utf-8") as sf:
            sf.write(snippet)
        try:
            res = subprocess.run([sys.executable, script_file], capture_output=True, text=True, timeout=5)
            if res.returncode == 0:
                expected_output = res.stdout.strip()
            else:
                expected_output = res.stderr.strip() or "Error"
        except subprocess.TimeoutExpired:
            expected_output = "Timeout"

    return {
        "label": label,
        "snippet": snippet,
        "prompt": prompt,
        "expected": expected_output
    }

@app.post("/trace")
def execute_trace(req: TraceRequest):
    result = trace_code(req.code, call=req.call, timeout_sec=5)
    return result
