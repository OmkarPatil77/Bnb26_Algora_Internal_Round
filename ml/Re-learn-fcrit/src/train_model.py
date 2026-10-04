import json
import os
import sys
import pickle
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix

sys.path.insert(0, '.')
from src.features import CodeFeatureExtractor

def train_baseline_model():
    print("Initializing Misconception Diagnosis Model Training...")
    
    train_path = 'data/train.jsonl'
    val_path = 'data/val.jsonl'
    
    if not os.path.exists(train_path) or not os.path.exists(val_path):
        raise FileNotFoundError("Training or validation dataset missing in data/")

    # 1. Load data
    with open(train_path, 'r', encoding='utf-8') as f:
        train_samples = [json.loads(line) for line in f if line.strip()]
        
    with open(val_path, 'r', encoding='utf-8') as f:
        val_samples = [json.loads(line) for line in f if line.strip()]

    print(f"Loaded {len(train_samples)} training samples and {len(val_samples)} validation samples.")

    # 2. Extract features
    print("Fitting feature extractor and building feature matrices...")
    feature_extractor = CodeFeatureExtractor(max_tfidf_features=100, max_test_cases=5)
    X_train = feature_extractor.fit_transform(train_samples)
    y_train = [s.get('label', 'NONE') for s in train_samples]

    X_val = feature_extractor.transform(val_samples)
    y_val = [s.get('label', 'NONE') for s in val_samples]

    print(f"X_train shape: {X_train.shape}, X_val shape: {X_val.shape}")

    # 3. Train Random Forest Classifier
    print("Training Random Forest Classifier...")
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        class_weight='balanced',
        random_state=42
    )
    clf.fit(X_train, y_train)

    # 4. Evaluate on Validation Set (Task 2.3)
    print("\n--- Validation Evaluation Results ---")
    y_pred = clf.predict(X_val)
    val_acc = accuracy_score(y_val, y_pred)
    val_macro_f1 = f1_score(y_val, y_pred, average='macro')
    val_weighted_f1 = f1_score(y_val, y_pred, average='weighted')

    print(f"Validation Accuracy: {val_acc:.4f} ({val_acc * 100:.2f}%)")
    print(f"Validation Macro-F1:  {val_macro_f1:.4f}")
    print(f"Validation Weighted F1: {val_weighted_f1:.4f}")
    
    print("\nClassification Report:")
    print(classification_report(y_val, y_pred))

    # 5. Save Model Artifacts
    os.makedirs('models', exist_ok=True)
    
    feature_extractor.save('models/feature_extractor.pkl')
    
    classifier_path = 'models/classifier.pkl'
    with open(classifier_path, 'wb') as f:
        pickle.dump(clf, f)
    print(f"Saved Random Forest classifier model to {classifier_path}")

    # Save metrics log
    metrics = {
        "val_accuracy": float(val_acc),
        "val_macro_f1": float(val_macro_f1),
        "val_weighted_f1": float(val_weighted_f1),
        "classes": list(clf.classes_)
    }
    with open('models/train_metrics.json', 'w', encoding='utf-8') as f:
        json.dump(metrics, f, indent=2)

    print("\nTraining completed successfully!")
    return clf, feature_extractor, metrics

if __name__ == '__main__':
    train_baseline_model()
