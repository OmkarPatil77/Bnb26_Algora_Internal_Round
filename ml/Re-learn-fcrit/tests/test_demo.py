import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.sandbox import run_code
from src.diagnose import diagnose

def test_sandbox_and_diagnosis():
    # 1. Define student code submission with M01 misconception
    code = """
def sum_to_n(n):
    total = 0
    for i in range(n):  # Buggy range(n) implementation (M01)
        total += i
    return total
"""

    # 2. Define test inputs and expected outputs
    tests = {
        "inputs": [3, 5, 10, 1],
        "expected": [6, 15, 55, 1]
    }

    # 3. Execute sandbox
    result = run_code(code, tests, timeout_sec=5)
    print("Sandbox Test Run:")
    print("  Actual returned values:", result["actual"])
    print("  Test pass/fail state:", result["passed"])
    print("  Execution error:", result["error"])

    # 4. Run diagnosis engine
    diag = diagnose("sum_to_n", code)
    print("\nDiagnosis Engine Run:")
    print("  Predicted Label:", diag["predicted_label"])
    print("  Confidence:", diag["confidence"])
    print("  Top 2:", diag["top2"])
    print("  Confidence Margin:", diag["margin"])

if __name__ == '__main__':
    test_sandbox_and_diagnosis()
