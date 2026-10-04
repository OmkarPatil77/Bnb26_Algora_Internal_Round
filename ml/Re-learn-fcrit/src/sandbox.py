import json
import os
import sys
import tempfile
import subprocess
from typing import Dict, Any, List, Optional

def run_code(code: str, tests: Dict[str, Any], timeout_sec: int = 5) -> Dict[str, Any]:
    """
    Executes Python source code against unit test cases inside an isolated subprocess.
    
    Args:
        code: Python source code string defining the solution function.
        tests: Dict containing 'inputs' (list) and 'expected' (list).
        timeout_sec: Timeout limit in seconds (default 5s).
        
    Returns:
        Dict with keys:
            - 'actual': list of returned results or error strings for each test case
            - 'passed': list of booleans indicating pass/fail for each test case
            - 'error': global execution error message string if execution failed, else None
    """
    if not code or not code.strip():
        return {
            "actual": [],
            "passed": [False] * len(tests.get("inputs", [])),
            "error": "Empty code string provided."
        }
        
    inputs = tests.get("inputs", [])
    expected = tests.get("expected", [])

    with tempfile.TemporaryDirectory() as tmpdir:
        script_path = os.path.join(tmpdir, "runner.py")
        
        # Build worker driver script that imports ast/inspect to safely invoke entrypoint
        driver_script = f'''import json
import sys
import inspect

# User submission code
{code}

tests = {json.dumps(tests)}
inputs = tests.get('inputs', [])
expected = tests.get('expected', [])

actual = []
passed = []

# Find entrypoint target function
target_func = None
for name, obj in list(locals().items()):
    if callable(obj) and not name.startswith('__') and name not in ['json', 'sys', 'inspect']:
        target_func = obj
        break

if target_func is None:
    print(json.dumps({{
        "actual": [],
        "passed": [False] * len(inputs),
        "error": "No callable function defined in submission code."
    }}))
    sys.exit(0)

try:
    sig = inspect.signature(target_func)
    num_params = len(sig.parameters)
except Exception:
    num_params = 1

import copy

for inp, exp in zip(inputs, expected):
    try:
        orig_inp = copy.deepcopy(inp)
        if num_params > 1 and isinstance(inp, (list, tuple)) and len(inp) == num_params:
            call_inp = copy.deepcopy(inp)
            res = target_func(*call_inp)
            mutated = (call_inp != orig_inp)
            aliased = any(res is arg for arg in call_inp if isinstance(arg, (list, dict, set)))
        else:
            call_inp = copy.deepcopy(inp)
            res = target_func(call_inp)
            mutated = (call_inp != orig_inp)
            aliased = (res is call_inp and isinstance(call_inp, (list, dict, set)))
        actual.append(res)
        
        # In double_each and add_item, the specification requires returning a new list without mutating the original input
        func_name = getattr(target_func, '__name__', '')
        if func_name in ('double_each', 'add_item') and (mutated or aliased):
            passed.append(False)
        else:
            passed.append(res == exp)
    except Exception as exc:
        actual.append(f"RuntimeError: {{type(exc).__name__}}: {{exc}}")
        passed.append(False)

print(json.dumps({{
    "actual": actual,
    "passed": passed,
    "error": None
}}))
'''

        with open(script_path, "w", encoding="utf-8") as f:
            f.write(driver_script)

        try:
            res = subprocess.run(
                [sys.executable, script_path],
                capture_output=True,
                text=True,
                timeout=timeout_sec
            )
            
            if res.returncode == 0 and res.stdout.strip():
                try:
                    return json.loads(res.stdout.strip())
                except json.JSONDecodeError:
                    return {
                        "actual": [],
                        "passed": [False] * len(inputs),
                        "error": f"Failed to parse runner output: {res.stdout.strip()}"
                    }
            else:
                stderr_msg = res.stderr.strip() if res.stderr else "Non-zero exit code"
                return {
                    "actual": [],
                    "passed": [False] * len(inputs),
                    "error": stderr_msg
                }

        except subprocess.TimeoutExpired:
            return {
                "actual": [],
                "passed": [False] * len(inputs),
                "error": f"Execution timed out (> {timeout_sec}s)."
            }

if __name__ == "__main__":
    # Self-test execution
    sample_code = "def sum_to_n(n):\n    total = 0\n    for i in range(1, n + 1):\n        total += i\n    return total"
    sample_tests = {"inputs": [3, 5, 10, 1], "expected": [6, 15, 55, 1]}
    print("Testing sandbox with correct sum_to_n submission:")
    result = run_code(sample_code, sample_tests)
    print(json.dumps(result, indent=2))