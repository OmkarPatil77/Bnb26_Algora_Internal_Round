import json
import os
import sys
import tempfile
import subprocess
from typing import Dict, Any, Optional

def trace_code(code: str, call: Optional[str] = None, timeout_sec: int = 5) -> Dict[str, Any]:
    """
    Executes Python source code line-by-line in an isolated subprocess using sys.settrace.
    Records up to 60 steps of variable environments, captured stdout, return value, and errors.
    """
    if not code or not code.strip():
        return {
            "steps": [],
            "output": "",
            "returnValue": None,
            "error": "Empty code string provided."
        }

    with tempfile.TemporaryDirectory() as tmpdir:
        script_path = os.path.join(tmpdir, "tracer_runner.py")
        code_path = os.path.join(tmpdir, "user_submission.py")

        with open(code_path, "w", encoding="utf-8") as f:
            f.write(code)

        driver_script = f'''import sys
import os
import io
import json
import inspect
import copy

user_code_path = {json.dumps(code_path)}
with open(user_code_path, 'r', encoding='utf-8') as f:
    code_text = f.read()

code_lines = code_text.splitlines()

steps = []
max_steps = 60

def safe_repr(val, max_len=60):
    try:
        r = repr(val)
        if len(r) > max_len:
            return r[:max_len - 3] + "..."
        return r
    except Exception as e:
        return f"<unprintable: {{type(e).__name__}}>"

def tracer(frame, event, arg):
    global steps
    if len(steps) >= max_steps:
        return None

    filename = frame.f_code.co_filename
    if filename != user_code_path:
        return tracer

    if event == 'line':
        lineno = frame.f_lineno
        line_content = code_lines[lineno - 1].strip() if 0 < lineno <= len(code_lines) else ""
        label = f"Line {{lineno}}: {{line_content}}"

        # Filter internal vars
        local_vars = {{}}
        for k, v in frame.f_locals.items():
            if k.startswith('__') and k.endswith('__'):
                continue
            if inspect.ismodule(v) or inspect.isfunction(v) or inspect.isclass(v):
                continue
            local_vars[k] = safe_repr(v)

        steps.append({{
            "line": lineno,
            "label": label,
            "variables": local_vars
        }})

    return tracer

# Capture stdout
captured_stdout = io.StringIO()
old_stdout = sys.stdout
sys.stdout = captured_stdout

return_val = None
error_str = None

# Compile and execute
try:
    code_obj = compile(code_text, user_code_path, 'exec')
    user_globals = {{'__name__': '__main__', '__file__': user_code_path}}

    sys.settrace(tracer)
    try:
        exec(code_obj, user_globals)
        
        # If a specific call string is given, evaluate it
        call_expr = {json.dumps(call)}
        if call_expr and call_expr.strip():
            return_val = eval(call_expr, user_globals)
        else:
            # Look for callable function if script only defined a function
            target_func = None
            for name, obj in user_globals.items():
                if callable(obj) and not name.startswith('__') and not inspect.ismodule(obj) and not inspect.isclass(obj):
                    target_func = obj
                    break
            if target_func is not None and len(steps) <= 1:
                # Invoke function with sample arguments based on arity
                sig = inspect.signature(target_func)
                num_params = len(sig.parameters)
                if num_params == 1:
                    return_val = target_func(3)
                elif num_params == 2:
                    return_val = target_func(2, 3)
                else:
                    return_val = target_func()

    finally:
        sys.settrace(None)

except Exception as exc:
    error_str = f"{{type(exc).__name__}}: {{exc}}"

finally:
    sys.stdout = old_stdout

output_text = captured_stdout.getvalue()

# Truncate output if too long
if len(output_text) > 1000:
    output_text = output_text[:997] + "..."

# Format serializable return value
try:
    json.dumps(return_val)
    serializable_return = return_val
except Exception:
    serializable_return = safe_repr(return_val)

result_data = {{
    "steps": steps,
    "output": output_text,
    "returnValue": serializable_return,
    "error": error_str
}}

print(json.dumps(result_data))
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
                        "steps": [],
                        "output": "",
                        "returnValue": None,
                        "error": f"Failed to parse tracer output: {res.stdout.strip()}"
                    }
            else:
                stderr_msg = res.stderr.strip() if res.stderr else "Non-zero exit code"
                return {
                    "steps": [],
                    "output": "",
                    "returnValue": None,
                    "error": stderr_msg
                }

        except subprocess.TimeoutExpired:
            return {
                "steps": [],
                "output": "",
                "returnValue": None,
                "error": f"Execution timed out (> {timeout_sec}s)."
            }

if __name__ == '__main__':
    sample_code = """def sum_to_n(n):
    total = 0
    for i in range(n):
        total += i
    return total
"""
    print("Testing tracer with sum_to_n:")
    res = trace_code(sample_code, call="sum_to_n(3)")
    print(json.dumps(res, indent=2))
