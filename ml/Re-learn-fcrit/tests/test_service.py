import sys
import os
import json
from pathlib import Path
from fastapi.testclient import TestClient

_BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BASE_DIR))

from service import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"

def test_labels():
    res = client.get("/labels")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 6
    ids = [item["id"] for item in data]
    assert "M01" in ids
    assert "M02" in ids

def test_problems():
    res = client.get("/problems")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 10

def test_get_problem_valid():
    res = client.get("/problems/sum_to_n")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "sum_to_n"
    assert "tests" in data

def test_get_problem_invalid():
    res = client.get("/problems/non_existent_problem_xyz")
    assert res.status_code == 404
    data = res.json()
    assert "detail" in data

def test_diagnose_valid_m01():
    code = """def sum_to_n(n):
    total = 0
    for i in range(n):
        total += i
    return total
"""
    res = client.post("/diagnose", json={"problem_id": "sum_to_n", "code": code})
    assert res.status_code == 200
    data = res.json()
    assert data["predicted_label"] == "M01"
    assert "top3" in data
    assert len(data["top3"]) <= 3
    assert data["top3"][0]["id"] == "M01"

def test_diagnose_invalid_problem():
    res = client.post("/diagnose", json={"problem_id": "invalid_prob_123", "code": "pass"})
    assert res.status_code == 404
    assert "detail" in res.json()

def test_probe_valid():
    res = client.get("/probe/M01")
    assert res.status_code == 200
    data = res.json()
    assert data["misconception_id"] == "M01"
    assert "options" in data

def test_probe_invalid():
    res = client.get("/probe/UNKNOWN_LABEL_999")
    assert res.status_code == 404
    assert "detail" in res.json()

def test_probe_evaluate():
    top2 = [{"label": "M01", "probability": 0.52}, {"label": "M02", "probability": 0.48}]
    res = client.post("/probe/evaluate", json={
        "label": "M01",
        "selected_option_index": 1,
        "current_top2": top2
    })
    assert res.status_code == 200
    data = res.json()
    assert data["predicted_label"] == "M01"
    assert data["confidence"] == 0.9

def test_intervention_valid():
    res = client.get("/intervention/M01")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "M01"
    assert "why_wrong" in data
    assert "counterexample" in data

def test_intervention_invalid():
    res = client.get("/intervention/INVALID_M99")
    assert res.status_code == 404

def test_personalise_valid():
    code = "def sum_to_n(n):\n    total = 0\n    for i in range(n):\n        total += i\n    return total"
    res = client.post("/personalise", json={"code": code, "label": "M01"})
    assert res.status_code == 200
    data = res.json()
    assert data["label"] == "M01"
    assert isinstance(data["explanation"], str)
    assert len(data["explanation"]) > 0

def test_trap_items():
    res = client.get("/trap/M01?index=0")
    assert res.status_code == 200
    data = res.json()
    assert data["misconception_id"] == "M01"
    assert len(data["options"]) == 4

def test_predict_then_run_valid():
    res = client.get("/predict-then-run/M01")
    assert res.status_code == 200
    data = res.json()
    assert data["label"] == "M01"
    assert data["snippet"] == "print(list(range(3)))"
    # Ensure expected was dynamically executed in sandbox and matches output
    assert data["expected"] == "[0, 1, 2]"

def test_predict_then_run_invalid():
    res = client.get("/predict-then-run/UNKNOWN_XYZ")
    assert res.status_code == 404

def test_trace_valid():
    code = """def sum_to_n(n):
    total = 0
    for i in range(n):
        total += i
    return total
"""
    res = client.post("/trace", json={"code": code, "call": "sum_to_n(3)"})
    assert res.status_code == 200
    data = res.json()
    assert "steps" in data
    assert len(data["steps"]) > 0
    assert data["returnValue"] == 3
    assert data["error"] is None

def test_trace_exception():
    code = """def divide(x):
    return 10 / x
"""
    res = client.post("/trace", json={"code": code, "call": "divide(0)"})
    assert res.status_code == 200
    data = res.json()
    assert "ZeroDivisionError" in str(data.get("error"))

def test_trace_infinite_loop_timeout():
    code = """def loop_forever():
    while True:
        pass
"""
    # Trace timeout is 5 seconds
    res = client.post("/trace", json={"code": code, "call": "loop_forever()"})
    assert res.status_code == 200
    data = res.json()
    assert "timed out" in str(data.get("error")).lower()

if __name__ == '__main__':
    tests = [
        ("test_health", test_health),
        ("test_labels", test_labels),
        ("test_problems", test_problems),
        ("test_get_problem_valid", test_get_problem_valid),
        ("test_get_problem_invalid", test_get_problem_invalid),
        ("test_diagnose_valid_m01", test_diagnose_valid_m01),
        ("test_diagnose_invalid_problem", test_diagnose_invalid_problem),
        ("test_probe_valid", test_probe_valid),
        ("test_probe_invalid", test_probe_invalid),
        ("test_probe_evaluate", test_probe_evaluate),
        ("test_intervention_valid", test_intervention_valid),
        ("test_intervention_invalid", test_intervention_invalid),
        ("test_personalise_valid", test_personalise_valid),
        ("test_trap_items", test_trap_items),
        ("test_predict_then_run_valid", test_predict_then_run_valid),
        ("test_predict_then_run_invalid", test_predict_then_run_invalid),
        ("test_trace_valid", test_trace_valid),
        ("test_trace_exception", test_trace_exception),
        ("test_trace_infinite_loop_timeout", test_trace_infinite_loop_timeout)
    ]
    passed = 0
    failed = 0
    print("Running FastAPI Service Test Suite:")
    for name, test_fn in tests:
        try:
            test_fn()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            failed += 1
    print(f"\nTest Summary: {passed} passed, {failed} failed out of {len(tests)} tests.")
    if failed > 0:
        sys.exit(1)

