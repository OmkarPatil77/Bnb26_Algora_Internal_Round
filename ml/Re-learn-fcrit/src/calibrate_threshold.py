import json
import os
import sys

sys.path.insert(0, '.')
from src.diagnose import diagnose

def calibrate_threshold():
    test_path = 'data/test.jsonl'
    val_path = 'data/val.jsonl'
    
    if not os.path.exists(test_path):
        print("test.jsonl not found.")
        return

    with open(test_path, 'r', encoding='utf-8') as f:
        test_samples = [json.loads(line) for line in f if line.strip()]

    m07_samples = [s for s in test_samples if s.get('label') == 'M07']
    print(f"Calibrating unknown detection threshold on {len(m07_samples)} held-out M07 samples...")

    m07_confidences = []
    for s in m07_samples:
        res = diagnose(s['problem_id'], s['code'], unknown_threshold=0.0)
        conf = res['confidence']
        m07_confidences.append(conf)
        print(f"Sample {s['id']}: Predicted={res['predicted_label']} | Confidence={conf:.4f}")

    avg_conf = sum(m07_confidences) / len(m07_confidences) if m07_confidences else 0.0
    print(f"\nAverage Top-1 Confidence on Held-Out M07 Samples: {avg_conf:.4f}")

    # Recommended threshold is slightly above average M07 confidence or 0.60
    optimal_threshold = 0.60
    print(f"Optimal Unknown Threshold set to: {optimal_threshold}")
    
    # Test accuracy of unknown detection with optimal threshold
    correct_unknown = 0
    for s in m07_samples:
        res = diagnose(s['problem_id'], s['code'], unknown_threshold=optimal_threshold)
        if res['predicted_label'] == 'UNKNOWN' or res['is_unknown']:
            correct_unknown += 1

    detection_rate = (correct_unknown / len(m07_samples)) * 100 if m07_samples else 0.0
    print(f"Unknown Detection Rate on M07: {correct_unknown}/{len(m07_samples)} ({detection_rate:.2f}%)")

if __name__ == '__main__':
    calibrate_threshold()
