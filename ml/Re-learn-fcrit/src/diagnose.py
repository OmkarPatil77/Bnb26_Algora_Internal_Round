import json
import os
import sys
import pickle
from pathlib import Path
import numpy as np
from typing import Dict, Any, List

sys.path.insert(0, '.')
from src.sandbox import run_code
from src.features import CodeFeatureExtractor

_BASE_DIR = Path(__file__).resolve().parent.parent

# Global cached artifacts
_FEATURE_EXTRACTOR = None
_CLASSIFIER = None
_PROBLEMS = None

def _load_artifacts():
    global _FEATURE_EXTRACTOR, _CLASSIFIER, _PROBLEMS
    
    if _FEATURE_EXTRACTOR is None:
        extractor_path = str(_BASE_DIR / 'models' / 'feature_extractor.pkl')
        if not os.path.exists(extractor_path):
            raise FileNotFoundError(f"Feature extractor artifact missing at {extractor_path}. Run src/train_model.py first.")
        _FEATURE_EXTRACTOR = CodeFeatureExtractor.load(extractor_path)

    if _CLASSIFIER is None:
        classifier_path = str(_BASE_DIR / 'models' / 'classifier.pkl')
        if not os.path.exists(classifier_path):
            raise FileNotFoundError(f"Classifier artifact missing at {classifier_path}. Run src/train_model.py first.")
        with open(classifier_path, 'rb') as f:
            _CLASSIFIER = pickle.load(f)

    if _PROBLEMS is None:
        problems_path = str(_BASE_DIR / 'data' / 'problems.json')
        if os.path.exists(problems_path):
            with open(problems_path, 'r', encoding='utf-8') as f:
                p_list = json.load(f)
            _PROBLEMS = {p['id']: p for p in p_list}
        else:
            _PROBLEMS = {}

def diagnose(problem_id: str, code: str, unknown_threshold: float = 0.60) -> Dict[str, Any]:
    """
    Diagnoses student submission code for Python misconceptions.
    
    Args:
        problem_id: Identifier matching a problem in data/problems.json (e.g. 'sum_to_n')
        code: Python source code string
        unknown_threshold: Probability threshold below which prediction is flagged as 'UNKNOWN' (default: 0.35)
        
    Returns:
        Dict with keys:
            - 'problem_id': str
            - 'predicted_label': str (e.g. 'M01', 'NONE', 'UNKNOWN')
            - 'confidence': float
            - 'top2': list of dicts [{'label': str, 'probability': float}]
            - 'margin': float (top1_prob - top2_prob)
            - 'is_unknown': bool
            - 'passed_tests': list of booleans
            - 'all_passed': bool
    """
    _load_artifacts()
    
    if not code or not code.strip():
        return {
            "problem_id": problem_id,
            "predicted_label": "UNKNOWN",
            "confidence": 0.0,
            "top2": [],
            "margin": 0.0,
            "is_unknown": True,
            "passed_tests": [],
            "all_passed": False,
            "error": "Empty code submission."
        }

    # Retrieve problem tests suite or fallback default
    problem_info = _PROBLEMS.get(problem_id, {})
    tests = problem_info.get("tests", {"inputs": [], "expected": []})

    # Step 1: Run code in Sandbox to evaluate test execution
    sandbox_res = run_code(code, tests)
    passed_tests = sandbox_res.get("passed", [])
    all_passed = all(passed_tests) if passed_tests else False

    # Step 2: Prepare sample object for feature extractor
    sample = {
        "problem_id": problem_id,
        "code": code,
        "tests": tests,
        "passed": passed_tests
    }

    # Step 3: Extract feature matrix X
    X = _FEATURE_EXTRACTOR.transform([sample])

    # Step 4: Classify probabilities
    probs = _CLASSIFIER.predict_proba(X)[0]
    classes = _CLASSIFIER.classes_

    # Sort probabilities descending
    sorted_pairs = sorted(zip(classes, probs), key=lambda x: x[1], reverse=True)
    
    top1_label, top1_prob = sorted_pairs[0]
    top2_label, top2_prob = sorted_pairs[1] if len(sorted_pairs) > 1 else (top1_label, 0.0)
    
    margin = float(top1_prob - top2_prob)
    is_unknown = float(top1_prob) < unknown_threshold

    # Override: if code passes 100% of unit tests and top1 prediction is not NONE, check if NONE is likely
    if all_passed and top1_label != "NONE" and top1_prob < 0.70:
        predicted_label = "NONE"
    elif is_unknown:
        predicted_label = "UNKNOWN"
    else:
        predicted_label = top1_label

    top2_list = [
        {"label": str(sorted_pairs[0][0]), "probability": float(round(sorted_pairs[0][1], 4))},
        {"label": str(sorted_pairs[1][0]), "probability": float(round(sorted_pairs[1][1], 4))}
    ]

    return {
        "problem_id": problem_id,
        "predicted_label": str(predicted_label),
        "confidence": float(round(top1_prob, 4)),
        "top2": top2_list,
        "margin": float(round(margin, 4)),
        "is_unknown": bool(is_unknown),
        "passed_tests": passed_tests,
        "all_passed": bool(all_passed)
    }

if __name__ == '__main__':
    # Test diagnose function on M01 snippet
    sample_m01_code = """
def sum_to_n(n):
    total = 0
    for i in range(n):
        total += i
    return total
"""
    print("Testing diagnose() API on sample M01 submission:")
    result = diagnose("sum_to_n", sample_m01_code)
    print(json.dumps(result, indent=2))
