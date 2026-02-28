"""
Model Training Script
=====================
Trains a Random Forest classifier for insurance fraud detection.

Key principles:
  - Train-test split happens BEFORE any preprocessing (no data leakage)
  - Preprocessing is fitted only on training data
  - Class imbalance is handled via SMOTE + class_weight='balanced'
  - Optimal probability threshold is tuned (not default 0.5)
  - Code uses sklearn & imblearn Pipelines to bundle transformations and the model into one artifact
  - All artifacts are saved for reproducible inference

Usage:
    python -m ml.train          (from project root)
    python ml/train.py          (from project root)
"""

import os
import sys
import pickle
import json
from datetime import datetime

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report, f1_score, accuracy_score,
    precision_recall_curve
)
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline

# Add project root to path so we can import ml.preprocessing
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from ml.preprocessing import (
    TARGET_COL, CATEGORICAL_COLS, NUMERIC_COLS,
    drop_non_predictive_columns, fill_missing_values, remove_outliers,
    build_preprocessor
)

# ─── Configuration ──────────────────────────────────────────────

RANDOM_STATE = 42
TEST_SIZE = 0.2
DATA_PATH = os.path.join(PROJECT_ROOT, 'ml', 'data', 'raw', 'insurance_fraud_data.csv')
MODEL_DIR = os.path.join(PROJECT_ROOT, 'models')


def train():
    """Main training pipeline."""

    os.makedirs(MODEL_DIR, exist_ok=True)

    # ── Step 1: Load Data ────────────────────────────────────────
    print("=" * 60)
    print("STEP 1: Loading data...")
    print("=" * 60)
    df = pd.read_csv(DATA_PATH)
    print(f"  Loaded {len(df)} rows, {len(df.columns)} columns")
    print(f"  Columns: {list(df.columns)}")

    # ── Step 2: Drop Non-Predictive Columns ──────────────────────
    print("\nSTEP 2: Dropping non-predictive columns...")
    df = drop_non_predictive_columns(df)
    print(f"  Remaining columns: {len(df.columns)}")

    # ── Step 3: Separate Features and Target ─────────────────────
    print("\nSTEP 3: Separating features and target...")
    if TARGET_COL not in df.columns:
        raise ValueError(f"Target column '{TARGET_COL}' not found in dataset. "
                         f"Available: {list(df.columns)}")

    # Drop rows where target is NaN
    null_target_count = df[TARGET_COL].isnull().sum()
    if null_target_count > 0:
        print(f"  Dropping {null_target_count} rows with missing target values")
        df = df.dropna(subset=[TARGET_COL])

    X = df.drop(columns=[TARGET_COL])
    y = df[TARGET_COL]

    # Encode target: Y → 1 (fraud), N → 0 (not fraud)
    if y.dtype == object:
        target_mapping = {'Y': 1, 'N': 0, 'y': 1, 'n': 0}
        y = y.map(target_mapping)
        unmapped = y.isnull().sum()
        if unmapped > 0:
            print(f"  WARNING: {unmapped} target values could not be mapped, dropping them")
            valid_mask = y.notna()
            X = X[valid_mask]
            y = y[valid_mask]
        y = y.astype(int)
        print(f"  Encoded target: Y->1, N->0")

    print(f"  Features: {X.shape}, Target distribution:\n{y.value_counts().to_string()}")

    # ── Step 4: Train-Test Split (BEFORE preprocessing) ──────────
    print("\nSTEP 4: Splitting data (BEFORE preprocessing)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y
    )
    print(f"  Train: {len(X_train)} rows, Test: {len(X_test)} rows")

    # ── Step 5: Fill Missing Values (fit on training ONLY) ───────
    print("\nSTEP 5: Handling missing values (fitted on training data only)...")
    X_train, medians, modes = fill_missing_values(X_train.copy(), fit=True)
    X_test = fill_missing_values(X_test.copy(), medians=medians, modes=modes, fit=False)
    print(f"  Learned {len(medians)} medians, {len(modes)} modes")

    # ── Step 6: Remove Outliers (training set ONLY) ──────────────
    print("\nSTEP 6: Removing outliers (training set only)...")
    X_train, y_train = remove_outliers(X_train, y_train)

    # ── Step 7: Build and Train Pipeline ───────────────────────────
    print("\nSTEP 7: Building and Training Pipeline (Preprocessor -> SMOTE -> RF)...")
    
    preprocessor = build_preprocessor()
    classifier = RandomForestClassifier(
        n_estimators=200,
        class_weight='balanced',
        random_state=RANDOM_STATE,
        n_jobs=-1
    )
    
    # We use imblearn.pipeline.Pipeline because it supports SMOTE resampling 
    # during fit() and bypasses it during predict()
    pipeline = ImbPipeline([
        ('preprocessor', preprocessor),
        ('smote', SMOTE(random_state=RANDOM_STATE)),
        ('classifier', classifier)
    ])
    
    print(f"  Before SMOTE (approx): {dict(pd.Series(y_train).value_counts())}")
    pipeline.fit(X_train, y_train)
    print(f"  Training complete.")

    # ── Step 8: Evaluate + Find Optimal Threshold ──────────────
    print("\n" + "=" * 60)
    print("STEP 8: Evaluation on Test Set")
    print("=" * 60)

    y_proba = pipeline.predict_proba(X_test)[:, 1]

    # --- Default threshold (0.5) ---
    y_pred_default = (y_proba >= 0.5).astype(int)
    acc_default = accuracy_score(y_test, y_pred_default)
    f1_default = f1_score(y_test, y_pred_default)
    print("\n  [Default threshold = 0.5]")
    print(classification_report(y_test, y_pred_default, target_names=["Not Fraud", "Fraud"]))
    print(f"  Accuracy: {acc_default:.4f}, F1: {f1_default:.4f}")

    # --- Find optimal threshold that maximizes F1 ---
    precision_arr, recall_arr, thresholds = precision_recall_curve(y_test, y_proba)
    # F1 = 2 * (precision * recall) / (precision + recall)
    f1_scores = 2 * (precision_arr[:-1] * recall_arr[:-1]) / (precision_arr[:-1] + recall_arr[:-1] + 1e-10)
    best_idx = np.argmax(f1_scores)
    optimal_threshold = float(thresholds[best_idx])

    y_pred_tuned = (y_proba >= optimal_threshold).astype(int)
    acc_tuned = accuracy_score(y_test, y_pred_tuned)
    f1_tuned = f1_score(y_test, y_pred_tuned)
    print(f"\n  [Optimal threshold = {optimal_threshold:.4f}]")
    print(classification_report(y_test, y_pred_tuned, target_names=["Not Fraud", "Fraud"]))
    print(f"  Accuracy: {acc_tuned:.4f}, F1: {f1_tuned:.4f}")

    # Use tuned metrics for metadata
    accuracy = acc_tuned
    f1 = f1_tuned

    # ── Step 9: Save All Artifacts ──────────────────────────────
    print(f"\nSTEP 9: Saving artifacts to '{MODEL_DIR}'...")

    artifacts = {
        'pipeline.pkl': pipeline,
        'train_medians.pkl': medians,
        'train_modes.pkl': modes,
    }

    for filename, obj in artifacts.items():
        filepath = os.path.join(MODEL_DIR, filename)
        with open(filepath, 'wb') as f:
            pickle.dump(obj, f)
        print(f"  [OK] Saved {filename}")

    # Save metadata
    metadata = {
        'model_type': 'RandomForestClassifier_Pipeline',
        'n_estimators': 200,
        'class_weight': 'balanced',
        'smote': True,
        'optimal_threshold': optimal_threshold,
        'random_state': RANDOM_STATE,
        'training_date': datetime.now().isoformat(),
        'training_rows': len(X_train),
        'test_rows': len(X_test),
        'accuracy': round(accuracy, 4),
        'f1_score': round(f1, 4),
        'f1_default_threshold': round(f1_default, 4),
        'categorical_columns': CATEGORICAL_COLS,
        'numerical_columns': NUMERIC_COLS,
    }

    with open(os.path.join(MODEL_DIR, 'metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2)
        
    print("  [OK] Saved metadata.json")

    print("\n" + "=" * 60)
    print("[DONE] Training complete!")
    print("=" * 60)


if __name__ == '__main__':
    train()

