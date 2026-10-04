import json
import os
import sys
from pathlib import Path

_BASE_DIR = Path(__file__).resolve().parent.parent

def verify_trap_items():
    trap_path = _BASE_DIR / 'data' / 'trap_items.json'
    if not trap_path.exists():
        print(f"Error: {trap_path} not found")
        sys.exit(1)

    with open(trap_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    items = data.get('items', {})
    total_verified = 0

    for m_id, trap_list in items.items():
        for idx, item in enumerate(trap_list):
            code = item.get('code', '')
            correct_idx = item.get('correct_index')
            options = item.get('options', [])

            if correct_idx is None or correct_idx >= len(options):
                print(f"FAILED: {m_id}[{idx}] invalid correct_index {correct_idx}")
                sys.exit(1)

            # Execute code in isolated namespace
            local_ns = {}
            try:
                exec(code, {}, local_ns)
                executed_val = local_ns.get('result')
            except Exception as e:
                executed_val = f"Error: {e}"

            correct_option_text = options[correct_idx]
            
            # Stringified check
            exec_str = str(executed_val)
            # Verify correct option contains or matches executed value representation
            is_valid = (
                exec_str in correct_option_text or
                repr(executed_val) in correct_option_text or
                correct_option_text.startswith(exec_str)
            )

            if not is_valid:
                print(f"FAILED: {m_id}[{idx}] ({item.get('problem_id')}): executed result {executed_val!r} does not match option[{correct_idx}] = {correct_option_text!r}")
                sys.exit(1)

            total_verified += 1
            print(f"Verified {m_id}[{idx}] ({item.get('problem_id')}): Result={executed_val!r} -> Option[{correct_idx}]='{correct_option_text}'")

    print(f"\nAll {total_verified} trap items successfully executed and verified against correct_index!")

if __name__ == '__main__':
    verify_trap_items()
