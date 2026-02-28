# 🔍 Production-Level Audit Report — FraudGuard AI

**Project:** Insurance Fraud Detection (ML + Flask API + Next.js Frontend)  
**Audit Date:** 2026-02-25  
**Auditor:** Senior ML Architect & Full-Stack Reviewer  
**Severity Scale:** 🔴 Critical | 🟠 Major | 🟡 Minor | 🟢 Good

---

## Table of Contents
1. [ML Pipeline Review](#1-ml-pipeline-review)
2. [Project Structure](#2-project-structure)
3. [API Layer (Flask)](#3-api-layer-flask)
4. [Frontend (Next.js)](#4-frontend-nextjs)
5. [ML → API → Frontend Contract](#5-ml--api--frontend-contract)
6. [Production Readiness](#6-production-readiness)
7. [Performance & Scalability](#7-performance--scalability)
8. [Code Smells](#8-code-smells)

---

## 1. ML Pipeline Review

### 1.1 🔴 CRITICAL: Data Leakage in `save_model.py`

**File:** `save_model.py`

The entire preprocessing pipeline (missing value imputation, outlier removal, encoding, scaling) is performed on the **full dataset** before any train-test split. This causes **data leakage** — the model has indirect access to test data statistics.

**Lines 24–58:** Preprocessing fitted on ALL data

```python
# ❌ CURRENT (LEAKY): Fitted on full dataset
num_cols = df.select_dtypes(include=['int64', 'float64']).columns
for col in num_cols:
    if df[col].isnull().any():
        df[col] = df[col].fillna(df[col].median())  # Median of FULL dataset

# Encoding on FULL dataset
for col in cat_cols:
    le = LabelEncoder()
    df_clean[col] = le.fit_transform(df_clean[col].astype(str))

# Scaling on FULL dataset
scaler = MinMaxScaler()
df_clean[valid_num_cols] = scaler.fit_transform(df_clean[valid_num_cols])

# Then trained on ALL data (no split at all!)
model.fit(X, y)
```

**Why this is a problem:**
- Median/mode values used for imputation include test data → inflated metrics
- Scaler `min` and `max` are learned from full dataset → information leakage
- LabelEncoder sees all categories including test → no realistic unseen-data evaluation
- **There is NO train-test split at all** in `save_model.py` — the model is trained on 100% of data

**✅ CORRECTED Implementation:**

```python
import pandas as pd
import numpy as np
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, f1_score
from scipy.stats import zscore

RANDOM_STATE = 42
MODEL_DIR = 'models'
os.makedirs(MODEL_DIR, exist_ok=True)

# 1. Load
df = pd.read_csv('insurance_fraud_data.csv')

# 2. Drop non-predictive columns
cols_to_drop = ['claim_number', 'claim_date']
df = df.drop(columns=[c for c in cols_to_drop if c in df.columns])

# 3. Handle Missing Values (safe — just fill with placeholders before split)
num_cols = df.select_dtypes(include=['int64', 'float64']).columns.tolist()
cat_cols = df.select_dtypes(include='object').columns.tolist()

# 4. Separate X and y FIRST
target_col = 'fraud reported'
if target_col in cat_cols:
    cat_cols.remove(target_col)
X = df.drop(columns=[target_col])
y = df[target_col]

# 5. Train-Test Split BEFORE any preprocessing
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
)

# 6. Fit imputation on TRAINING data only
train_medians = {}
for col in num_cols:
    if col in X_train.columns:
        median_val = X_train[col].median()
        train_medians[col] = median_val
        X_train[col] = X_train[col].fillna(median_val)
        X_test[col] = X_test[col].fillna(median_val)

train_modes = {}
for col in cat_cols:
    if col in X_train.columns:
        mode_val = X_train[col].mode()[0]
        train_modes[col] = mode_val
        X_train[col] = X_train[col].fillna(mode_val)
        X_test[col] = X_test[col].fillna(mode_val)

# 7. Outlier removal on TRAINING only
numeric_train = X_train.select_dtypes(include=['int64', 'float64'])
z = np.abs(zscore(numeric_train))
mask = (z < 3).all(axis=1)
X_train = X_train[mask].copy()
y_train = y_train[mask].copy()

# 8. Encode categoricals - fit on TRAINING only
encoders = {}
for col in cat_cols:
    if col in X_train.columns:
        le = LabelEncoder()
        X_train[col] = le.fit_transform(X_train[col].astype(str))
        # Handle unseen labels in test set
        known = set(le.classes_)
        X_test[col] = X_test[col].astype(str).apply(
            lambda x: x if x in known else le.classes_[0]
        )
        X_test[col] = le.transform(X_test[col])
        encoders[col] = le

# 9. Scale numericals - fit on TRAINING only
valid_num_cols = [c for c in num_cols if c in X_train.columns]
scaler = MinMaxScaler()
X_train[valid_num_cols] = scaler.fit_transform(X_train[valid_num_cols])
X_test[valid_num_cols] = scaler.transform(X_test[valid_num_cols])

# 10. Train with class_weight='balanced' for imbalanced data
model = RandomForestClassifier(
    n_estimators=200,
    class_weight='balanced',
    random_state=RANDOM_STATE
)
model.fit(X_train, y_train)

# 11. Evaluate
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))
print(f"F1-Score: {f1_score(y_test, y_pred):.4f}")

# 12. Save artifacts
pickle.dump(model, open(f'{MODEL_DIR}/model.pkl', 'wb'))
pickle.dump(encoders, open(f'{MODEL_DIR}/encoders.pkl', 'wb'))
pickle.dump(scaler, open(f'{MODEL_DIR}/scaler.pkl', 'wb'))
pickle.dump(valid_num_cols, open(f'{MODEL_DIR}/num_cols.pkl', 'wb'))
pickle.dump(train_medians, open(f'{MODEL_DIR}/train_medians.pkl', 'wb'))
pickle.dump(train_modes, open(f'{MODEL_DIR}/train_modes.pkl', 'wb'))
```

---

### 1.2 🔴 CRITICAL: No Class Imbalance Handling

**Evidence from notebook metrics:**
```
Random Forest → Recall: 0.1067  (10.7%!)
                F1:     0.1916

Tuned RF      → Recall: 0.1085  (10.9%!)
                F1:     0.1945
```

The model catches only **~11% of actual fraud cases**. For a fraud detection system, this is catastrophically bad. The model is essentially predicting "Not Fraud" for almost everything and achieving high accuracy (77%) because the majority class dominates.

**Why this is a problem:**
- In fraud detection, **recall** is the most critical metric — missing fraud is costly
- `class_weight` is never set in `RandomForestClassifier` (defaults to `None`)
- No SMOTE/ADASYN/undersampling applied
- The reported "77% accuracy" on the landing page is misleading — it's 77% accuracy by predicting the majority class

**✅ Fix: Add class imbalance handling**
```python
# Option 1: class_weight
model = RandomForestClassifier(
    n_estimators=200,
    class_weight='balanced',   # ← THIS IS CRITICAL
    random_state=42
)

# Option 2: SMOTE (more aggressive)
from imblearn.over_sampling import SMOTE
smote = SMOTE(random_state=42)
X_train_resampled, y_train_resampled = smote.fit_resample(X_train, y_train)
model.fit(X_train_resampled, y_train_resampled)
```

---

### 1.3 🔴 CRITICAL: Disconnect Between Notebook Pipeline and save_model.py

The `advancedModelTraining.ipynb` notebook uses `insurance_fraud_data_cleaned.csv` (already preprocessed data), uses `StandardScaler`, and uses `sklearn.pipeline.Pipeline`. But `save_model.py` uses the raw `insurance_fraud_data.csv`, uses `MinMaxScaler`, uses `LabelEncoder` manually, and has NO pipeline.

**The model saved for production was trained with a completely different preprocessing path than what was evaluated in the notebooks.**

| Aspect | Notebook | save_model.py |
|--------|----------|---------------|
| Data file | `_cleaned.csv` | raw `.csv` |
| Scaler | `StandardScaler` | `MinMaxScaler` |
| Pipeline | `sklearn.Pipeline` | Manual steps |
| Split | 80/20 stratified | **No split** |
| Imbalance | Not handled | Not handled |

---

### 1.4 🟠 Major: No sklearn Pipeline in Production

`save_model.py` does all preprocessing manually, making inference fragile. If inference preprocessing diverges from training (which it already does — see `model.py`), predictions are silently wrong.

**✅ Recommendation:** Use an end-to-end `sklearn.pipeline.Pipeline` or `ColumnTransformer` so the model artifact includes its preprocessing:

```python
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OrdinalEncoder, MinMaxScaler

preprocessor = ColumnTransformer([
    ('num', MinMaxScaler(), numerical_columns),
    ('cat', OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1), categorical_columns),
])

pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier', RandomForestClassifier(class_weight='balanced', random_state=42))
])

pipeline.fit(X_train, y_train)
pickle.dump(pipeline, open('models/pipeline.pkl', 'wb'))
```

---

### 1.5 🟠 Major: `claim_number` and `claim_date` Handling is Inconsistent

- `save_model.py` drops `claim_number` and `claim_date` (lines 21-22)
- But the frontend **still sends** `claim_number` and `claim_date` to the API
- `model.py` inference doesn't drop them — it passes everything through
- These are **non-predictive ID/date columns** that will confuse the model

---

### 1.6 🟡 Minor: No Model Interpretability

No feature importance extraction, no SHAP values, no LIME explanations. For a fraud detection system, **explainability is often legally required** (e.g., why was a claim flagged?).

**✅ Add feature importance:**
```python
import shap
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_test)
# Save top feature importances
feature_importance = pd.DataFrame({
    'feature': X.columns,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)
feature_importance.to_csv('models/feature_importance.csv', index=False)
```

---

### 1.7 🟡 Minor: Hyperparameter Tuning Grid is Too Small

```python
param_grid = {
    "n_estimators": [100, 200],        # Only 2 values
    "max_depth": [None, 10, 20],       # Only 3 values
    "min_samples_split": [2, 5]        # Only 2 values
}
# Total: 12 combinations — too few
```

Should also include `min_samples_leaf`, `max_features`, `class_weight`.

---

### 1.8 🟢 What's Done Right
- `random_state=42` is used consistently ✅
- `StratifiedKFold` used for CV in notebook ✅
- `stratify=y` used in train_test_split in notebook ✅
- F1-score used as scoring metric (appropriate for imbalanced data) ✅
- Multiple models compared in notebook ✅

---

## 2. Project Structure

### 2.1 🔴 CRITICAL: Severely Disorganized Structure

**Current Structure:**
```
ML_Project/
├── advancedModelTraining.ipynb     ← Notebook in root
├── algorithmselection.ipynb        ← Notebook in root  
├── eda.ipynb                       ← Notebook in root (15MB!)
├── graphs.ipynb                    ← Notebook in root
├── modeltesting.ipynb              ← Notebook in root
├── save_model.py                   ← Training script in root
├── insurance_fraud_data.csv        ← Data file in root (2MB)
├── insurance_fraud_data_cleaned.csv← Data file in root (3MB)
├── ML Project Guideline.md         ← Guidelines in root
├── ML Project Guideline.pdf        ← Guidelines in root
├── app/                            ← OLD Flask app (templates + static)
│   ├── templates/
│   └── static/
├── backend/                        ← NEW Flask API
│   ├── app/
│   │   ├── __init__.py
│   │   ├── model.py                ← ML logic mixed with API
│   │   └── routes.py
│   ├── models/                     ← Serialized model artifacts
│   └── run.py
├── frontend/                       ← Next.js app
│   └── insurance-fraud-detector/
├── venv/                           ← Virtual env in project root
└── .qodo/                          ← IDE config
```

**Problems:**
1. **Notebooks dumped in root** — no organization
2. **CSV data files in root** — raw data shouldn't be in project root
3. **TWO Flask apps** (`app/` and `backend/`) — confusing
4. **`venv/` in root** — should be git-ignored, not committed
5. **ML logic in API layer** — `backend/app/model.py` mixes inference with model loading
6. **No separation** between training, preprocessing, evaluation, and inference code
7. **No `requirements.txt`** — dependencies are unknown

### 2.2 ✅ Recommended Structure

```
ML_Project/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── routes.py           # API endpoints only
│   │   ├── schemas.py          # Pydantic/Marshmallow validation schemas
│   │   └── services/
│   │       └── prediction.py   # Inference service (loads model, predicts)
│   ├── run.py
│   └── config.py               # Configuration (env vars, paths)
│
├── ml/
│   ├── data/
│   │   ├── raw/                # Original CSV files  
│   │   └── processed/          # Cleaned CSV files
│   ├── notebooks/
│   │   ├── 01_eda.ipynb
│   │   ├── 02_algorithm_selection.ipynb
│   │   ├── 03_model_training.ipynb
│   │   ├── 04_model_testing.ipynb
│   │   └── 05_graphs.ipynb
│   ├── preprocessing.py        # Shared preprocessing logic
│   ├── train.py                # Training script
│   ├── evaluate.py             # Evaluation script
│   └── pipeline.py             # Pipeline definition
│
├── models/                     # Serialized model artifacts
│   ├── model.pkl
│   ├── encoders.pkl
│   ├── scaler.pkl
│   └── metadata.json           # Model version, metrics, date
│
├── frontend/
│   └── insurance-fraud-detector/
│
├── .env                        # Environment variables
├── .env.example                # Template for env vars
├── .gitignore
├── requirements.txt            # Pinned dependencies
├── Dockerfile                  # Container definition
├── docker-compose.yml          # Multi-service orchestration
└── README.md
```

---

## 3. API Layer (Flask)

### 3.1 🔴 CRITICAL: No Input Validation

**File:** `backend/app/routes.py`

```python
@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No input data provided'}), 400
    # ❌ No validation of individual fields!
    prediction, probability = predict_fraud(data)
```

**Problems:**
- Any JSON payload is accepted — no field validation
- No type checking (strings where numbers expected will fail silently or crash)
- No range validation (age=9999, income=-1000000)
- No required field enforcement
- SQL injection / payload manipulation possible

**✅ Fix: Add input validation with Marshmallow or a simple schema:**

```python
from flask import Flask, request, jsonify

REQUIRED_FIELDS = {
    'age_of_driver': {'type': (int, float), 'min': 18, 'max': 100},
    'gender': {'type': str, 'allowed': ['M', 'F']},
    'marital_status': {'type': (int, float, str)},
    'annual_income': {'type': (int, float), 'min': 0},
    'safety_rating': {'type': (int, float), 'min': 0, 'max': 100},
    'total_claim': {'type': (int, float), 'min': 0},
    # ... etc for all fields
}

def validate_input(data):
    errors = []
    for field, rules in REQUIRED_FIELDS.items():
        if field not in data:
            errors.append(f"Missing required field: {field}")
            continue
        value = data[field]
        if not isinstance(value, rules['type']):
            errors.append(f"Invalid type for {field}")
        if 'min' in rules and isinstance(value, (int, float)) and value < rules['min']:
            errors.append(f"{field} must be >= {rules['min']}")
        if 'max' in rules and isinstance(value, (int, float)) and value > rules['max']:
            errors.append(f"{field} must be <= {rules['max']}")
        if 'allowed' in rules and value not in rules['allowed']:
            errors.append(f"{field} must be one of {rules['allowed']}")
    return errors

@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No input data provided'}), 400
    
    errors = validate_input(data)
    if errors:
        return jsonify({'success': False, 'errors': errors}), 422
    
    try:
        prediction, probability = predict_fraud(data)
        # ...
    except Exception as e:
        app.logger.error(f"Prediction error: {e}")
        return jsonify({'success': False, 'error': 'Internal processing error'}), 500
```

---

### 3.2 🔴 CRITICAL: Bare `except` Clause Silently Swallows Errors

**File:** `backend/app/model.py`, line 59

```python
def safe_transform(val):
    try:
        return le.transform([val])[0]
    except:          # ← BARE EXCEPT
        return 0     # ← SILENTLY RETURNS 0 FOR UNKNOWN VALUES
```

**Problems:**
- Catches `KeyboardInterrupt`, `SystemExit`, `MemoryError` — everything
- Unknown categorical values silently become 0, which is a valid encoded value — **corrupting predictions**
- No logging of the unknown value
- Any bug in this path is invisible

---

### 3.3 🟠 Major: Model Loaded as Module Global (Fragile)

**File:** `backend/app/model.py`, lines 12-24

```python
# Models loaded at import time as module globals
try:
    with open(os.path.join(MODEL_DIR, 'model.pkl'), 'rb') as f:
        model = pickle.load(f)
    # ...
except FileNotFoundError as e:
    print(f"Error loading models: {e}")
    model = None            # ← App starts with model=None, silently broken
```

**Problems:**
- If model files don't exist, app starts anyway with `model = None`
- Uses `print()` instead of `logging` — output lost in production
- No model versioning or metadata loaded
- If the pickle is corrupted, the error is swallowed

**✅ Fix:**
```python
import logging

logger = logging.getLogger(__name__)

class ModelManager:
    _instance = None
    
    def __init__(self):
        self.model = None
        self.encoders = None
        self.scaler = None
        self.num_cols = None
        self._loaded = False
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
            cls._instance.load()
        return cls._instance
    
    def load(self):
        try:
            self.model = pickle.load(open(os.path.join(MODEL_DIR, 'model.pkl'), 'rb'))
            self.encoders = pickle.load(open(os.path.join(MODEL_DIR, 'encoders.pkl'), 'rb'))
            self.scaler = pickle.load(open(os.path.join(MODEL_DIR, 'scaler.pkl'), 'rb'))
            self.num_cols = pickle.load(open(os.path.join(MODEL_DIR, 'num_cols.pkl'), 'rb'))
            self._loaded = True
            logger.info("Model artifacts loaded successfully")
        except Exception as e:
            logger.critical(f"Failed to load model artifacts: {e}")
            raise RuntimeError(f"Cannot start without model: {e}")
    
    @property
    def is_ready(self):
        return self._loaded
```

---

### 3.4 🟠 Major: CORS is Wide Open

**File:** `backend/app/__init__.py`

```python
CORS(app)  # Enable CORS for all routes ← ALL ORIGINS ALLOWED
```

In production, this allows any website to call your API.

**✅ Fix:**
```python
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "https://yourdomain.com"]}})
```

---

### 3.5 🟠 Major: `debug=True` in Production Entry Point

**File:** `backend/run.py`

```python
app.run(debug=True)   # ← NEVER in production
```

Debug mode exposes an interactive debugger that can execute arbitrary Python code.

**✅ Fix:**
```python
import os
app.run(debug=os.getenv('FLASK_DEBUG', 'false').lower() == 'true')
```

---

### 3.6 🟡 Minor: No Health Check Endpoint

No `/health` or `/api/health` endpoint exists.

**✅ Add:**
```python
@app.route('/health')
def health():
    model_ready = model is not None
    return jsonify({
        'status': 'healthy' if model_ready else 'degraded',
        'model_loaded': model_ready,
    }), 200 if model_ready else 503
```

---

### 3.7 🟡 Minor: No Request Logging

All `print()` calls instead of proper `logging`. No request timing, no structured logging.

---

## 4. Frontend (Next.js)

### 4.1 🔴 CRITICAL: Hardcoded Backend URL

**File:** `frontend/insurance-fraud-detector/app/predict/page.tsx`, line 71

```tsx
const res = await fetch('http://localhost:5000/api/predict', {
```

**Problems:**
- Hardcoded `localhost:5000` — will fail in any non-local environment
- No environment variable used
- This URL is embedded in client-side code

**✅ Fix:**

Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

In component:
```tsx
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const res = await fetch(`${API_URL}/api/predict`, { ... });
```

---

### 4.2 🟠 Major: Result Passed via localStorage (Anti-Pattern)

**File:** `predict/page.tsx`, line 83

```tsx
localStorage.setItem('fraudResult', JSON.stringify(data));
router.push('/result');
```

**Problems:**
- Data can be tampered with in browser DevTools
- Race condition: localStorage write may not complete before navigation
- Stale data if user refreshes result page later
- Not SSR-compatible — `localStorage` is client-only

**✅ Better approach — use URL search params or React Context:**
```tsx
// Option 1: Query params (simple)
router.push(`/result?prediction=${data.prediction}&probability=${data.probability}&fraud_risk=${data.fraud_risk}`);

// Option 2: React Context / Zustand store (recommended for complex data)
```

---

### 4.3 🟠 Major: `claim_number` and `claim_date` Sent But Should Be Dropped

The form includes `claim_number` (auto-generated random number) and `claim_date` as input fields. These were dropped during training in `save_model.py` but are still sent to the API, where `model.py` includes them in inference. This causes a **feature mismatch**.

---

### 4.4 🟠 Major: Default SEO Metadata Not Updated

**File:** `layout.tsx`

```tsx
export const metadata: Metadata = {
  title: "Create Next App",              // ← Default boilerplate
  description: "Generated by create next app",  // ← Never updated
};
```

**✅ Fix:**
```tsx
export const metadata: Metadata = {
  title: "FraudGuard AI | Insurance Fraud Detection",
  description: "AI-powered insurance fraud detection system using machine learning to assess claims in real-time.",
};
```

---

### 4.5 🟡 Minor: No API Integration Layer Abstraction

API calls are made directly in the component. Should be extracted to a service:

```tsx
// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function predictFraud(data: Record<string, string | number>) {
  const res = await fetch(`${API_URL}/api/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Server error' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  
  return res.json();
}
```

---

### 4.6 🟡 Minor: No Form Validation Beyond HTML5

Only `required`, `min`, `max` HTML attributes are used. No JS-level validation, no error messages per field.

---

### 4.7 🟡 Minor: `marital_status` Treated Inconsistently

The frontend sends it as a string `"1"` or `"0"`, but it's listed in `NUMERIC_FIELDS` array, so it gets parsed to a number. However, in the original dataset it may be a categorical string. This mismatch could cause prediction errors.

---

### 4.8 🟢 What's Done Right
- Loading states with spinner animation ✅
- Error handling with user-friendly messages ✅
- Clean dark UI design ✅
- Proper TypeScript interface for `FraudResult` ✅
- Redirect to predict page when no result ✅

---

## 5. ML → API → Frontend Contract

### 5.1 🔴 CRITICAL: No Standardized Response Format

**Current API response (success):**
```json
{
  "prediction": "Fraud",
  "probability": 0.87,
  "fraud_risk": true
}
```

**Current API response (error):**
```json
{
  "error": "some error string"
}
```

**Problems:**
- No `success` flag to disambiguate success/error
- Error responses have different shape than success responses
- No metadata (timestamp, model version, request ID)
- `fraud_risk` is redundant (it's just `probability > 0.5`)

**✅ Recommended unified response:**

```json
// Success
{
  "success": true,
  "data": {
    "prediction": "Fraud",
    "probability": 0.87,
    "confidence": 0.87,
    "risk_level": "HIGH",
    "model_version": "1.0.0"
  },
  "error": null,
  "timestamp": "2026-02-25T08:00:00Z"
}

// Error
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input: age_of_driver must be between 18 and 100",
    "details": [...]
  },
  "timestamp": "2026-02-25T08:00:00Z"
}
```

---

### 5.2 🟠 Major: No Schema Documentation

- No OpenAPI/Swagger spec
- No API documentation
- Frontend developer must read backend code to understand request/response format

**✅ Add:** Flask-RESTx or flasgger for auto-generated Swagger docs.

---

### 5.3 🟠 Major: Frontend Doesn't Validate Response Schema

```tsx
const data = await res.json();
if (data.error) throw new Error(data.error);
localStorage.setItem('fraudResult', JSON.stringify(data));
```

No check that `data.prediction`, `data.probability`, `data.fraud_risk` actually exist.

---

## 6. Production Readiness

| Requirement | Status | Details |
|------------|--------|---------|
| `.env` usage | 🔴 Missing | No `.env` file exists anywhere |
| `.env.example` | 🔴 Missing | No template for developers |
| `requirements.txt` | 🔴 Missing | No dependency file at all |
| `.gitignore` | 🟠 Partial | Only in frontend; none for Python |
| Docker | 🔴 Missing | No Dockerfile, no docker-compose |
| Model versioning | 🔴 Missing | No version metadata saved with model |
| CI/CD | 🔴 Missing | No pipeline configuration |
| Health check | 🔴 Missing | No `/health` endpoint |
| Rate limiting | 🔴 Missing | No rate limiting on API |
| Logging | 🔴 Missing | Uses `print()` everywhere |
| Monitoring | 🔴 Missing | No metrics, no observability |
| Secrets | 🟢 N/A | No secrets currently (but no `.env` pattern) |
| Reproducibility | 🔴 Broken | `save_model.py` doesn't match notebook pipeline |

### 6.1 ✅ Minimum Required Files

**`requirements.txt`:**
```
flask==3.1.0
flask-cors==5.0.1
scikit-learn==1.6.1
pandas==2.2.3
numpy==2.2.3
gunicorn==23.0.0
python-dotenv==1.0.1
```

**`.gitignore` (project root):**
```
venv/
__pycache__/
*.pyc
.env
models/*.pkl
*.csv
.next/
node_modules/
```

**`.env.example`:**
```
FLASK_DEBUG=false
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
MODEL_DIR=./models
ALLOWED_ORIGINS=http://localhost:3000
```

---

## 7. Performance & Scalability

### 7.1 🟠 Major: ~25MB Model Loaded Per Worker

The `model.pkl` file is **26MB**. With Gunicorn + 4 workers, that's ~104MB just for model files. If using serverless, this leads to cold start problems.

**✅ Consider:**
- Use `joblib` instead of `pickle` (better compression)
- Explore model compression (pruning, feature selection to reduce tree count)
- Lazy loading pattern

---

### 7.2 🟠 Major: No Batch Inference Support

Only single-prediction endpoint exists. For bulk claim assessment, clients must make N sequential HTTP calls.

**✅ Add batch endpoint:**
```python
@app.route('/api/predict/batch', methods=['POST'])
def predict_batch():
    data_list = request.get_json()
    if not isinstance(data_list, list):
        return jsonify({'error': 'Expected array of records'}), 400
    if len(data_list) > 100:
        return jsonify({'error': 'Max 100 records per batch'}), 400
    
    results = []
    for item in data_list:
        pred, prob = predict_fraud(item)
        results.append({
            'prediction': "Fraud" if pred[0] == 1 else "Not Fraud",
            'probability': float(prob[0][1])
        })
    return jsonify({'results': results})
```

---

### 7.3 🟡 Minor: No Caching

Identical prediction requests aren't cached. For deterministic models, identical inputs always produce identical outputs.

---

### 7.4 🟡 Minor: Flask Dev Server Used

`app.run()` uses Flask's built-in development server, which is **single-threaded and not production-ready**.

**✅ Use Gunicorn:**
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

---

## 8. Code Smells

### 8.1 🔴 Tight Coupling: ML Logic in API Layer

`backend/app/model.py` contains both model loading AND preprocessing logic AND prediction. This should be at minimum 3 separate responsibilities.

---

### 8.2 🔴 Dead Code: `app/` Directory

The `app/` directory at root contains old Flask templates (`index.html`, `result.html`, `style.css`) that are completely unused by the current `backend/` Flask API. This is confusing — developers can't tell which is the actual app.

**✅ Fix:** Delete `app/` directory or clearly mark it as deprecated.

---

### 8.3 🟠 God Function: `predict_fraud()`

`predict_fraud()` in `model.py` (60 lines) does everything:
- DataFrame creation
- Label encoding  
- Numeric conversion
- Scaling
- Column reordering
- Prediction
- Probability extraction

Should be broken into:
1. `preprocess_input(data: dict) -> pd.DataFrame`
2. `predict(df: pd.DataFrame) -> tuple`

---

### 8.4 🟠 Hardcoded Paths

```python
# save_model.py
df = pd.read_csv('insurance_fraud_data.csv')   # Hardcoded filename
os.makedirs('models')                           # Hardcoded directory

# model.py  
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, 'models')   # Assumes directory structure
```

**✅ Fix:** Use `.env` / config file for all paths.

---

### 8.5 🟠 Repeated Preprocessing Logic

Preprocessing is defined in:
1. `save_model.py` (for training)
2. `backend/app/model.py` (for inference)
3. `advancedModelTraining.ipynb` (for evaluation — different preprocessing!)
4. `modeltesting.ipynb` (yet another preprocessing path)
5. `app/templates/index.html` (old Flask form — different field structure)

Five different places with subtly different logic. This guarantees train-serve skew.

**✅ Fix:** Single shared `preprocessing.py` imported by both training and inference.

---

### 8.6 🟡 Inconsistent Naming

| Location | Convention | Examples |
|----------|-----------|----------|
| CSV columns | Mixed | `claim_number`, `age_of_driver`, `policy deductible`, `annual premium` |
| Python files | snake_case | `save_model.py`, `model.py` |
| Notebooks | camelCase | `advancedModelTraining.ipynb`, `modeltesting.ipynb` |
| Frontend | kebab-case | `insurance-fraud-detector` |

Column names with spaces (`policy deductible`, `annual premium`, `days open`, `form defects`) cause issues throughout the stack.

---

### 8.7 🟡 Mixing Notebook Code with Production

Notebooks (`*.ipynb`) are exploratory research tools. They should never be part of the production pipeline, but currently the only evidence of model evaluation exists in notebooks that use a different preprocessing path.

---

## Summary Scorecard

| Section | Score | Grade |
|---------|-------|-------|
| 1. ML Pipeline | 2/10 | 🔴 F |
| 2. Project Structure | 3/10 | 🔴 F |
| 3. API Layer | 3/10 | 🔴 D- |
| 4. Frontend | 5/10 | 🟡 C |
| 5. ML→API→FE Contract | 3/10 | 🔴 D- |
| 6. Production Readiness | 1/10 | 🔴 F |
| 7. Performance | 3/10 | 🔴 D- |
| 8. Code Smells | 2/10 | 🔴 F |
| **Overall** | **2.75/10** | **🔴 Not Production Ready** |

---

## Top 5 Priority Fixes (in order)

1. **Fix data leakage** in `save_model.py` — split before preprocess, retrain model
2. **Add class imbalance handling** — `class_weight='balanced'` at minimum; current recall of 10.7% renders the model useless for fraud detection
3. **Create `requirements.txt`** and `.env` pattern — undocumented dependencies
4. **Add input validation** on API — any payload crashes the server
5. **Unify preprocessing** — one canonical preprocessing path used by both training and inference (ideally via `sklearn.Pipeline`)

---

*This audit was based on a static code review. Runtime testing may reveal additional issues.*
