import ast
import json
import os
import sys
import pickle
import numpy as np

sys.path.insert(0, '.')
from typing import List, Dict, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from src.sandbox import run_code

# Standard AST node types of interest for introductory Python code analysis
AST_NODE_TYPES = [
    'FunctionDef', 'Return', 'Assign', 'AugAssign', 'For', 'While', 'If',
    'Call', 'Name', 'Attribute', 'Subscript', 'Constant', 'Num', 'Str',
    'List', 'Tuple', 'BinOp', 'UnaryOp', 'Compare', 'FloorDiv', 'Div',
    'Add', 'Sub', 'Mult', 'Mod', 'Eq', 'NotEq', 'Lt', 'LtE', 'Gt', 'GtE'
]

class CodeFeatureExtractor:
    """
    Feature Extraction Pipeline for Python Code Misconception Diagnosis.
    Extracts:
      1. TF-IDF features on code tokens & character n-grams.
      2. AST (Abstract Syntax Tree) node frequency counts & structural indicators.
      3. Test case execution pass/fail vector (via Sandbox).
    """
    
    def __init__(self, max_tfidf_features: int = 100, max_test_cases: int = 5):
        self.max_tfidf_features = max_tfidf_features
        self.max_test_cases = max_test_cases
        
        # Tokenizer for code that captures identifiers and symbols (+, -, *, //, /, ==, etc.)
        self.tfidf = TfidfVectorizer(
            token_pattern=r"(?u)\b\w+\b|[+\-*/%=<>!&|^~]+",
            ngram_range=(1, 2),
            min_df=1,
            max_features=self.max_tfidf_features
        )
        self.is_fitted = False
        self.feature_names = []

    def _extract_ast_features(self, code: str) -> np.ndarray:
        """Extracts AST node counts and domain-specific structural indicators."""
        node_counts = {node_type: 0 for node_type in AST_NODE_TYPES}
        
        # Domain indicators
        has_return = 0.0
        has_print = 0.0
        has_floordiv = 0.0
        has_div = 0.0
        has_range = 0.0
        accumulator_inside_loop = 0.0
        
        try:
            tree = ast.parse(code)
            
            for node in ast.walk(tree):
                node_type = type(node).__name__
                if node_type in node_counts:
                    node_counts[node_type] += 1
                
                if isinstance(node, ast.Return):
                    has_return = 1.0
                elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                    if node.func.id == 'print':
                        has_print = 1.0
                    elif node.func.id == 'range':
                        has_range = 1.0
                elif isinstance(node, ast.FloorDiv):
                    has_floordiv = 1.0
                elif isinstance(node, ast.Div):
                    has_div = 1.0
                
                # Check for accumulator initialization inside loop (M06 indicator)
                if isinstance(node, (ast.For, ast.While)):
                    for stmt in node.body:
                        if isinstance(stmt, ast.Assign):
                            for target in stmt.targets:
                                if isinstance(target, ast.Name) and target.id in ['total', 's', 'ans', 'count', 'res', 'product', 'tot']:
                                    if isinstance(stmt.value, (ast.Constant, ast.Num)) and (getattr(stmt.value, 'n', None) == 0 or getattr(stmt.value, 'value', None) == 0):
                                        accumulator_inside_loop = 1.0

        except Exception:
            # Code has syntax error or failed to parse
            pass

        ast_counts = [float(node_counts[nt]) for nt in AST_NODE_TYPES]
        domain_indicators = [
            has_return, has_print, has_floordiv, has_div, has_range, accumulator_inside_loop
        ]
        return np.array(ast_counts + domain_indicators, dtype=np.float32)

    def _extract_execution_features(self, sample: Dict[str, Any]) -> np.ndarray:
        """Extracts test case execution pass/fail vector."""
        if 'passed' in sample and isinstance(sample['passed'], list):
            passed = sample['passed']
        else:
            # Run dynamically via Sandbox if passed array is missing
            res = run_code(sample.get('code', ''), sample.get('tests', {}))
            passed = res.get('passed', [])

        exec_vec = [1.0 if p else 0.0 for p in passed]
        
        # Pad or truncate to max_test_cases
        if len(exec_vec) < self.max_test_cases:
            exec_vec.extend([0.0] * (self.max_test_cases - len(exec_vec)))
        else:
            exec_vec = exec_vec[:self.max_test_cases]
            
        pass_ratio = float(np.mean(passed)) if len(passed) > 0 else 0.0
        exec_vec.append(pass_ratio)
        
        return np.array(exec_vec, dtype=np.float32)

    def fit(self, samples: List[Dict[str, Any]]):
        """Fits TF-IDF vectorizer on training code samples."""
        codes = [s.get('code', '') for s in samples]
        self.tfidf.fit(codes)
        self.is_fitted = True
        
        # Store feature names for interpretability
        tfidf_names = [f"tfidf_{name}" for name in self.tfidf.get_feature_names_out()]
        ast_names = [f"ast_{nt}" for nt in AST_NODE_TYPES] + [
            "has_return", "has_print", "has_floordiv", "has_div", "has_range", "accumulator_inside_loop"
        ]
        exec_names = [f"test_pass_{i}" for i in range(self.max_test_cases)] + ["test_pass_ratio"]
        self.feature_names = tfidf_names + ast_names + exec_names
        
        return self

    def transform(self, samples: List[Dict[str, Any]]) -> np.ndarray:
        """Transforms code samples into a dense 2D feature matrix X."""
        if not self.is_fitted:
            raise RuntimeError("CodeFeatureExtractor must be fitted before calling transform().")

        codes = [s.get('code', '') for s in samples]
        tfidf_mat = self.tfidf.transform(codes).toarray()

        ast_list = [self._extract_ast_features(c) for c in codes]
        ast_mat = np.vstack(ast_list)

        exec_list = [self._extract_execution_features(s) for s in samples]
        exec_mat = np.vstack(exec_list)

        X = np.hstack([tfidf_mat, ast_mat, exec_mat])
        return X

    def fit_transform(self, samples: List[Dict[str, Any]]) -> np.ndarray:
        return self.fit(samples).transform(samples)

    def save(self, filepath: str):
        """Saves fitted feature extractor state to pickle file."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'wb') as f:
            pickle.dump(self, f)
        print(f"Saved feature extractor to {filepath}")

    @staticmethod
    def load(filepath: str) -> 'CodeFeatureExtractor':
        """Loads feature extractor state from pickle file."""
        with open(filepath, 'rb') as f:
            extractor = pickle.load(f)
        print(f"Loaded feature extractor from {filepath}")
        return extractor

if __name__ == '__main__':
    from pathlib import Path
    _BASE_DIR = Path(__file__).resolve().parent.parent
    # Self-test feature extraction on data/train.jsonl
    train_path = str(_BASE_DIR / 'data' / 'train.jsonl')
    if os.path.exists(train_path):
        with open(train_path, 'r', encoding='utf-8') as f:
            train_samples = [json.loads(line) for line in f if line.strip()]
        
        extractor = CodeFeatureExtractor()
        X_train = extractor.fit_transform(train_samples)
        
        print(f"Extracted feature matrix shape: {X_train.shape}")
        print(f"Total feature count: {len(extractor.feature_names)}")
        print(f"Sample feature names (first 10): {extractor.feature_names[:10]}")
        
        # Save extractor to models/
        extractor.save(str(_BASE_DIR / 'models' / 'feature_extractor.pkl'))
