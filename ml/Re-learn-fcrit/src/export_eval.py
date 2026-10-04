import json
import os
import sys
import ast
import pickle
from pathlib import Path
from typing import Dict, Any, List, Set, Tuple
import numpy as np
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

_BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BASE_DIR))

from src.diagnose import diagnose, _load_artifacts
from src.features import CodeFeatureExtractor
from src.probes import get_probe, evaluate_probe_answer

BUILTINS = {
    'range', 'len', 'print', 'sum', 'list', 'int', 'str', 'type', 'float',
    'min', 'max', 'abs', 'bool', 'dict', 'set', 'tuple', 'enumerate',
    'zip', 'reversed', 'sorted', 'any', 'all', 'open', 'input', 'None',
    'True', 'False'
}

class ASTVariableNormalizer(ast.NodeTransformer):
    """
    Normalizes variable and identifier names in an AST except function name and parameters.
    Renames other identifiers sequentially (_var_1, _var_2, ...) in order of appearance.
    """
    def __init__(self):
        self.var_map = {}
        self.var_counter = 0
        self.protected_names = set(BUILTINS)

    def visit_FunctionDef(self, node):
        # Protect function name
        self.protected_names.add(node.name)
        # Protect parameter names
        for arg in node.args.args:
            self.protected_names.add(arg.arg)
        self.generic_visit(node)
        return node

    def visit_Name(self, node):
        if node.id in self.protected_names:
            return node
        if node.id not in self.var_map:
            self.var_counter += 1
            self.var_map[node.id] = f"_var_{self.var_counter}"
        node.id = self.var_map[node.id]
        return node

def get_normalized_ast_dump(code: str) -> str:
    try:
        tree = ast.parse(code)
        normalizer = ASTVariableNormalizer()
        normalized_tree = normalizer.visit(tree)
        ast.fix_missing_locations(normalized_tree)
        return ast.dump(normalized_tree, annotate_fields=False)
    except Exception:
        # Fallback to stripped raw code if syntax error
        return "PARSE_ERROR: " + code.strip()

def run_evaluation():
    print("=" * 60)
    print("Re:Learn ML Model Comprehensive Evaluation & Benchmark")
    print("=" * 60)

    train_path = _BASE_DIR / 'data' / 'train.jsonl'
    val_path = _BASE_DIR / 'data' / 'val.jsonl'
    test_path = _BASE_DIR / 'data' / 'test.jsonl'
    overlap_path = _BASE_DIR / 'data' / 'overlap_set.jsonl'
    cards_path = _BASE_DIR / 'data' / 'cards.json'
    classifier_path = _BASE_DIR / 'models' / 'classifier.pkl'
    extractor_path = _BASE_DIR / 'models' / 'feature_extractor.pkl'

    # 1. Verify all input files exist
    required_files = [train_path, val_path, test_path, overlap_path, cards_path, classifier_path, extractor_path]
    for p in required_files:
        if not p.exists():
            print(f"Error: Missing required file {p}")
            sys.exit(1)

    with open(train_path, 'r', encoding='utf-8') as f:
        train_samples = [json.loads(line) for line in f if line.strip()]
    with open(val_path, 'r', encoding='utf-8') as f:
        val_samples = [json.loads(line) for line in f if line.strip()]
    with open(test_path, 'r', encoding='utf-8') as f:
        test_samples = [json.loads(line) for line in f if line.strip()]
    with open(overlap_path, 'r', encoding='utf-8') as f:
        overlap_samples = [json.loads(line) for line in f if line.strip()]
    with open(cards_path, 'r', encoding='utf-8') as f:
        cards_data = json.load(f)
        cards_by_id = {c['id']: c for c in cards_data}

    with open(classifier_path, 'rb') as f:
        clf = pickle.load(f)
    feature_extractor = CodeFeatureExtractor.load(str(extractor_path))

    classes = list(clf.classes_)
    print(f"Loaded {len(train_samples)} train, {len(val_samples)} val, {len(test_samples)} test, {len(overlap_samples)} overlap samples.")
    print(f"Classifier classes: {classes}")

    # 2. Split-leakage analysis (AST Variable-Normalized Overlap)
    print("\n--- Split-Leakage Analysis (Variable-Normalized AST) ---")
    train_ast_set = {get_normalized_ast_dump(s['code']) for s in train_samples}

    val_overlap_count = sum(1 for s in val_samples if get_normalized_ast_dump(s['code']) in train_ast_set)
    test_overlap_count = sum(1 for s in test_samples if get_normalized_ast_dump(s['code']) in train_ast_set)

    val_leakage_share = val_overlap_count / len(val_samples) if val_samples else 0.0
    test_leakage_share = test_overlap_count / len(test_samples) if test_samples else 0.0

    print(f"Val AST Overlap with Train:  {val_overlap_count}/{len(val_samples)} ({val_leakage_share * 100:.2f}%)")
    print(f"Test AST Overlap with Train: {test_overlap_count}/{len(test_samples)} ({test_leakage_share * 100:.2f}%)")

    # 3. Benchmark on Held-Out Test Set (M01-M06 + NONE) -> Headline Numbers
    print("\n--- Headline Test Set Benchmark (data/test.jsonl) ---")
    in_dist_test = [s for s in test_samples if s.get('label') in classes]
    ood_test_m07 = [s for s in test_samples if s.get('label') == 'M07']

    X_test = feature_extractor.transform(in_dist_test)
    y_test_true = [s['label'] for s in in_dist_test]
    y_test_pred = clf.predict(X_test)

    test_acc = float(accuracy_score(y_test_true, y_test_pred))
    p_prec, p_rec, p_f1, p_sup = precision_recall_fscore_support(y_test_true, y_test_pred, labels=classes, zero_division=0)
    test_macro_f1 = float(np.mean(p_f1))
    test_weighted_f1 = float(np.average(p_f1, weights=p_sup)) if sum(p_sup) > 0 else 0.0

    cm = confusion_matrix(y_test_true, y_test_pred, labels=classes)

    class_metrics = []
    for idx, c_name in enumerate(classes):
        card = cards_by_id.get(c_name, {})
        disp_name = card.get('title', "Correct Code" if c_name == "NONE" else c_name)
        class_metrics.append({
            "id": c_name,
            "name": disp_name,
            "precision": float(round(p_prec[idx], 4)),
            "recall": float(round(p_rec[idx], 4)),
            "f1": float(round(p_f1[idx], 4)),
            "support": int(p_sup[idx])
        })

    print(f"Test Accuracy:    {test_acc:.4f} ({test_acc * 100:.2f}%)")
    print(f"Test Macro-F1:    {test_macro_f1:.4f}")
    print(f"Test Weighted-F1: {test_weighted_f1:.4f}")

    # 4. Out-of-Distribution / Unknown Misconception Detection on held-out M07
    print("\n--- Out-of-Distribution (M07) Detection Evaluation ---")
    unknown_threshold = 0.60
    detected_unknown_count = 0
    for s in ood_test_m07:
        res = diagnose(s['problem_id'], s['code'], unknown_threshold=unknown_threshold)
        if res.get('is_unknown') or res.get('predicted_label') == 'UNKNOWN':
            detected_unknown_count += 1

    ood_detection_rate = detected_unknown_count / len(ood_test_m07) if ood_test_m07 else 0.0
    print(f"M07 Detection Rate: {detected_unknown_count}/{len(ood_test_m07)} ({ood_detection_rate * 100:.2f}%)")

    # 5. Simulated Diagnostic Probe Uplift on data/overlap_set.jsonl
    print("\n--- Simulated Diagnostic Probe Uplift on Overlap Set ---")
    correct_before_probe = 0
    correct_after_probe = 0

    for s in overlap_samples:
        ground_truth = s.get('label')
        res_before = diagnose(s['problem_id'], s['code'], unknown_threshold=0.0)
        if res_before.get('predicted_label') == ground_truth:
            correct_before_probe += 1

        top2_current = res_before.get('top2', [])
        # Find best probe option for student holding ground_truth
        card = cards_by_id.get(ground_truth)
        chosen_opt_idx = 0
        if card and 'probe' in card:
            options = card['probe'].get('options', [])
            best_p = -1.0
            for opt_idx, opt in enumerate(options):
                p_val = opt.get('posterior', {}).get(ground_truth, 0.0)
                if p_val > best_p:
                    best_p = p_val
                    chosen_opt_idx = opt_idx

        probe_eval = evaluate_probe_answer(ground_truth, chosen_opt_idx, top2_current)
        if probe_eval.get('predicted_label') == ground_truth:
            correct_after_probe += 1

    acc_before_probe = correct_before_probe / len(overlap_samples) if overlap_samples else 0.0
    acc_after_probe = correct_after_probe / len(overlap_samples) if overlap_samples else 0.0
    uplift_delta = acc_after_probe - acc_before_probe

    print(f"Accuracy Before Probe: {acc_before_probe * 100:.2f}% ({correct_before_probe}/{len(overlap_samples)})")
    print(f"Accuracy After Probe:  {acc_after_probe * 100:.2f}% ({correct_after_probe}/{len(overlap_samples)})")
    print(f"Simulated Probe Uplift: +{uplift_delta * 100:.2f} pts")

    # 6. Isolated Validation Split Metrics (reported separately, never headline)
    print("\n--- Validation Split Metrics (data/val.jsonl - Isolated) ---")
    X_val = feature_extractor.transform(val_samples)
    y_val_true = [s['label'] for s in val_samples]
    y_val_pred = clf.predict(X_val)

    val_acc = float(accuracy_score(y_val_true, y_val_pred))
    v_prec, v_rec, v_f1, v_sup = precision_recall_fscore_support(y_val_true, y_val_pred, labels=classes, zero_division=0)
    val_macro_f1 = float(np.mean(v_f1))
    val_weighted_f1 = float(np.average(v_f1, weights=v_sup)) if sum(v_sup) > 0 else 0.0

    print(f"Val Accuracy: {val_acc:.4f} ({val_acc * 100:.2f}%)")
    print(f"Val Macro-F1: {val_macro_f1:.4f}")

    # 7. Construct and write models/eval_report.json
    eval_report = {
        "headline": {
            "test_accuracy": float(round(test_acc, 4)),
            "test_macro_f1": float(round(test_macro_f1, 4)),
            "test_weighted_f1": float(round(test_weighted_f1, 4)),
            "classes": class_metrics,
            "confusion_matrix": {
                "class_order": classes,
                "matrix": cm.tolist()
            },
            "unseen_misconception_detection": {
                "target_class": "M07",
                "unknown_threshold": unknown_threshold,
                "detection_rate": float(round(ood_detection_rate, 4)),
                "samples_tested": len(ood_test_m07)
            },
            "probe_uplift": {
                "mode": "simulated",
                "before_probe_accuracy": float(round(acc_before_probe, 4)),
                "after_probe_accuracy": float(round(acc_after_probe, 4)),
                "uplift_delta": float(round(uplift_delta, 4)),
                "overlap_samples_evaluated": len(overlap_samples)
            }
        },
        "validation": {
            "val_accuracy": float(round(val_acc, 4)),
            "val_macro_f1": float(round(val_macro_f1, 4)),
            "val_weighted_f1": float(round(val_weighted_f1, 4)),
            "samples_evaluated": len(val_samples)
        },
        "split_leakage": {
            "method": "variable_normalized_ast_exact_match",
            "val_overlap_share": float(round(val_leakage_share, 4)),
            "test_overlap_share": float(round(test_leakage_share, 4)),
            "val_overlap_count": val_overlap_count,
            "test_overlap_count": test_overlap_count,
            "description": "Share of val/test samples whose normalized AST appears in train.jsonl"
        },
        "splits": {
            "train_samples": len(train_samples),
            "val_samples": len(val_samples),
            "test_samples": len(test_samples),
            "overlap_set_samples": len(overlap_samples),
            "total_samples": len(train_samples) + len(val_samples) + len(test_samples)
        }
    }

    out_path = _BASE_DIR / 'models' / 'eval_report.json'
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(eval_report, f, indent=2)

    print(f"\nSaved comprehensive evaluation report to {out_path}")
    print("=" * 60)

if __name__ == '__main__':
    run_evaluation()
