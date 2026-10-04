import json
import os
import glob
import random
import subprocess
import tempfile
import sys

def verify_and_combine():
    jsonl_files = glob.glob('*.jsonl') + glob.glob('data/handcrafted_verified.jsonl')
    print(f"Ingesting {len(jsonl_files)} dataset files...")
    
    all_samples = []
    seen_ids = set()

    for filepath in sorted(jsonl_files):
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip():
                    continue
                sample = json.loads(line)
                sid = sample['id']
                if sid in seen_ids:
                    print(f"Warning: Duplicate sample ID found: {sid}")
                seen_ids.add(sid)
                all_samples.append(sample)

    print(f"Total merged samples: {len(all_samples)}")

    os.makedirs('data', exist_ok=True)
    with open('data/all_samples.jsonl', 'w', encoding='utf-8') as f:
        for s in all_samples:
            f.write(json.dumps(s) + '\n')

    # Split allocations
    random.seed(42)
    train_samples = []
    val_samples = []
    test_samples = []
    overlap_samples = []

    labels_summary = {}

    for s in all_samples:
        lbl = s.get('label', 'NONE')
        pid = s.get('problem_id')
        labels_summary[lbl] = labels_summary.get(lbl, 0) + 1
        
        if lbl in ['M01', 'M02']:
            overlap_samples.append(s)
            
        if lbl == 'M07':
            test_samples.append(s) # Exclude M07 from train set for unknown detection eval
        elif pid in ['factorial', 'double_each']:
            test_samples.append(s) # Held-out test problems
        else:
            if random.random() < 0.8:
                train_samples.append(s)
            else:
                val_samples.append(s)

    with open('data/train.jsonl', 'w', encoding='utf-8') as f:
        for s in train_samples: f.write(json.dumps(s) + '\n')

    with open('data/val.jsonl', 'w', encoding='utf-8') as f:
        for s in val_samples: f.write(json.dumps(s) + '\n')

    with open('data/test.jsonl', 'w', encoding='utf-8') as f:
        for s in test_samples: f.write(json.dumps(s) + '\n')

    with open('data/overlap_set.jsonl', 'w', encoding='utf-8') as f:
        for s in overlap_samples: f.write(json.dumps(s) + '\n')

    print("\n--- Split Summary ---")
    print(f"Train samples: {len(train_samples)}")
    print(f"Val samples:   {len(val_samples)}")
    print(f"Test samples:  {len(test_samples)} (Includes held-out problems & M07 unknown set)")
    print(f"Overlap set:   {len(overlap_samples)}")
    print(f"Class counts:  {labels_summary}")

if __name__ == '__main__':
    verify_and_combine()
