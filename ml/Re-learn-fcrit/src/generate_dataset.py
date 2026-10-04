import json
import os
import sys

sys.path.insert(0, '.')
from src.sandbox import run_code

def generate_handcrafted_dataset():
    print("Generating handcrafted dataset variants for missing problem/misconception combinations...")
    
    with open('data/problems.json', 'r', encoding='utf-8') as f:
        problems_list = json.load(f)
    problems = {p['id']: p for p in problems_list}
    
    new_samples = []
    
    # ---------------------------------------------------------
    # 1. range_sum (Problem ID: range_sum)
    # Tests: inputs: [[1, 4], [3, 3], [5, 7], [0, 2]], expected: [10, 3, 18, 3]
    # ---------------------------------------------------------
    rs_tests = problems['range_sum']['tests']
    
    # M01 for range_sum (range(a, b) runs a..b-1, excludes b because forgets + 1)
    m01_codes = [
        "def range_sum(a, b):\n    total = 0\n    for i in range(a, b):\n        total += i\n    return total",
        "def range_sum(a, b):\n    s = 0\n    for num in range(a, b):\n        s = s + num\n    return s",
        "def range_sum(a, b):\n    ans = 0\n    i = a\n    while i < b:\n        ans += i\n        i += 1\n    return ans",
        "def range_sum(a, b):\n    total = 0\n    arr = list(range(a, b))\n    for x in arr:\n        total += x\n    return total",
        "def range_sum(a, b):\n    res = sum(range(a, b))\n    return res",
        "def range_sum(a, b):\n    val = 0\n    for k in range(a, b):\n        val = val + k\n    return val",
        "def range_sum(a, b):\n    tot = 0\n    for step in range(a, b):\n        tot += step\n    return tot",
        "def range_sum(a, b):\n    out = 0\n    for i in list(range(a, b)):\n        out += i\n    return out"
    ]
    for idx, code in enumerate(m01_codes, 1):
        new_samples.append({
            "id": f"range_sum_m01_{idx:03d}",
            "problem_id": "range_sum",
            "label": "M01",
            "code": code,
            "tests": rs_tests,
            "source": "handcrafted"
        })

    # M02 for range_sum (believes upper bound b is included so writes range(a, b+2))
    m02_codes = [
        "def range_sum(a, b):\n    total = 0\n    for i in range(a, b + 2):\n        total += i\n    return total",
        "def range_sum(a, b):\n    s = 0\n    for x in range(a, b + 2):\n        s = s + x\n    return s",
        "def range_sum(a, b):\n    res = 0\n    i = a\n    while i <= b + 1:\n        res += i\n        i += 1\n    return res",
        "def range_sum(a, b):\n    ans = sum(range(a, b + 2))\n    return ans",
        "def range_sum(a, b):\n    total = 0\n    for num in list(range(a, b + 2)):\n        total += num\n    return total",
        "def range_sum(a, b):\n    out = 0\n    for v in range(a, b + 2):\n        out = out + v\n    return out",
        "def range_sum(a, b):\n    tot = 0\n    for n in range(a, b + 2):\n        tot += n\n    return tot",
        "def range_sum(a, b):\n    val = 0\n    for k in range(a, b + 2):\n        val += k\n    return val"
    ]
    for idx, code in enumerate(m02_codes, 1):
        new_samples.append({
            "id": f"range_sum_m02_{idx:03d}",
            "problem_id": "range_sum",
            "label": "M02",
            "code": code,
            "tests": rs_tests,
            "source": "handcrafted"
        })

    # M03 for range_sum (print instead of return)
    m03_codes = [
        "def range_sum(a, b):\n    total = 0\n    for i in range(a, b + 1):\n        total += i\n    print(total)",
        "def range_sum(a, b):\n    s = sum(range(a, b + 1))\n    print(s)",
        "def range_sum(a, b):\n    ans = 0\n    for x in range(a, b + 1):\n        ans += x\n    print(ans)",
        "def range_sum(a, b):\n    print(sum(range(a, b + 1)))",
        "def range_sum(a, b):\n    tot = 0\n    for n in range(a, b + 1):\n        tot += n\n    print(f'{tot}')",
        "def range_sum(a, b):\n    res = 0\n    for v in range(a, b + 1):\n        res = res + v\n    print(str(res))",
        "def range_sum(a, b):\n    out = 0\n    i = a\n    while i <= b:\n        out += i\n        i += 1\n    print(out)",
        "def range_sum(a, b):\n    val = 0\n    for k in range(a, b + 1):\n        val += k\n    print(val)"
    ]
    for idx, code in enumerate(m03_codes, 1):
        new_samples.append({
            "id": f"range_sum_m03_{idx:03d}",
            "problem_id": "range_sum",
            "label": "M03",
            "code": code,
            "tests": rs_tests,
            "source": "handcrafted"
        })

    # M06 for range_sum (accumulator inside loop)
    m06_codes = [
        "def range_sum(a, b):\n    for i in range(a, b + 1):\n        total = 0\n        total += i\n    return total",
        "def range_sum(a, b):\n    for x in range(a, b + 1):\n        s = 0\n        s = s + x\n    return s",
        "def range_sum(a, b):\n    for num in range(a, b + 1):\n        ans = 0\n        ans += num\n    return ans",
        "def range_sum(a, b):\n    i = a\n    while i <= b:\n        total = 0\n        total += i\n        i += 1\n    return total",
        "def range_sum(a, b):\n    for k in range(a, b + 1):\n        tot = 0\n        tot = tot + k\n    return tot",
        "def range_sum(a, b):\n    for v in list(range(a, b + 1)):\n        res = 0\n        res += v\n    return res",
        "def range_sum(a, b):\n    for item in range(a, b + 1):\n        val = 0\n        val += item\n    return val",
        "def range_sum(a, b):\n    for n in range(a, b + 1):\n        out = 0\n        out += n\n    return out"
    ]
    for idx, code in enumerate(m06_codes, 1):
        new_samples.append({
            "id": f"range_sum_m06_{idx:03d}",
            "problem_id": "range_sum",
            "label": "M06",
            "code": code,
            "tests": rs_tests,
            "source": "handcrafted"
        })

    # NONE for range_sum (correct implementation)
    none_codes = [
        "def range_sum(a, b):\n    total = 0\n    for i in range(a, b + 1):\n        total += i\n    return total",
        "def range_sum(a, b):\n    return sum(range(a, b + 1))",
        "def range_sum(a, b):\n    s = 0\n    for x in range(a, b + 1):\n        s = s + x\n    return s",
        "def range_sum(a, b):\n    ans = 0\n    i = a\n    while i <= b:\n        ans += i\n        i += 1\n    return ans",
        "def range_sum(a, b):\n    tot = 0\n    for num in range(a, b + 1):\n        tot += num\n    return tot",
        "def range_sum(a, b):\n    res = 0\n    for k in range(a, b + 1):\n        res += k\n    return res"
    ]
    for idx, code in enumerate(none_codes, 1):
        new_samples.append({
            "id": f"range_sum_none_{idx:03d}",
            "problem_id": "range_sum",
            "label": "NONE",
            "code": code,
            "tests": rs_tests,
            "source": "handcrafted"
        })

    # ---------------------------------------------------------
    # 2. Additional M05 (/ vs // confusion) for average
    # ---------------------------------------------------------
    avg_tests = problems['average']['tests']
    m05_extra_codes = [
        "def average(nums):\n    total = 0\n    for n in nums:\n        total += n\n    avg = total // len(nums)\n    return avg",
        "def average(nums):\n    return sum(nums) // len(nums)",
        "def average(nums):\n    s = 0\n    for x in nums:\n        s += x\n    return int(s // len(nums))",
        "def average(nums):\n    a = sum(nums)\n    b = len(nums)\n    res = a // b\n    return float(res)"
    ]
    for idx, code in enumerate(m05_extra_codes, 11):
        new_samples.append({
            "id": f"average_m05_{idx:03d}",
            "problem_id": "average",
            "label": "M05",
            "code": code,
            "tests": avg_tests,
            "source": "handcrafted"
        })

    print(f"Generated {len(new_samples)} raw handcrafted samples.")

    # Apply verification filter using Sandbox (task 1.4 & 1.5)
    verified_count = 0
    with open('data/handcrafted_verified.jsonl', 'w', encoding='utf-8') as f:
        for s in new_samples:
            res = run_code(s['code'], s['tests'])
            s['actual'] = res['actual']
            s['passed'] = res['passed']
            
            # Filter check: NONE must pass all; Buggy must fail at least one
            lbl = s['label']
            all_p = all(s['passed']) if s['passed'] else False
            
            if lbl == 'NONE' and not all_p:
                print(f"Warning: NONE sample failed tests: {s['id']}")
                continue
            elif lbl != 'NONE' and all_p:
                print(f"Warning: Buggy sample passed all tests: {s['id']}")
                continue
                
            f.write(json.dumps(s) + '\n')
            verified_count += 1
            
    print(f"Successfully verified and saved {verified_count} new samples to data/handcrafted_verified.jsonl!")

if __name__ == '__main__':
    generate_handcrafted_dataset()
