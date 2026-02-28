# Audit Progress Checkpoint

**Date:** 2026-02-25, 09:14 IST  
**Status:** In Progress

---

## What's Been Done

### 1. Full Audit Report Written
- **File:** `docs/AUDIT_REPORT.md`
- Covers 8 sections: ML Pipeline, Project Structure, API Layer, Frontend, ML-API-FE Contract, Production Readiness, Performance, Code Smells
- Overall score: 2.75/10 (pre-fixes)

### 2. Project Restructured (Audit Section 2 - COMPLETE)

**Old structure** (flat, disorganized) replaced with clean separation of concerns:

```
ML_Project/
├── backend/                    # Flask API only
│   ├── app/
│   │   ├── __init__.py         # Flask factory + logging + CORS config
│   │   ├── routes.py           # Endpoints + validation + health check
│   │   └── services/
│   │       └── prediction.py   # Inference service (singleton ModelManager)
│   ├── config.py               # Config from .env
│   └── run.py                  # Entry point
├── ml/                         # ML pipeline (separate from API)
│   ├── data/
│   │   ├── raw/                # insurance_fraud_data.csv
│   │   └── processed/          # insurance_fraud_data_cleaned.csv
│   ├── notebooks/              # 5 Jupyter notebooks
│   ├── __init__.py
│   ├── preprocessing.py        # SHARED preprocessing (single source of truth)
│   └── train.py                # Training script (fixed, no data leakage)
├── models/                     # Serialized artifacts (.pkl + metadata.json)
├── frontend/                   # Next.js app (unchanged structure)
│   └── insurance-fraud-detector/
├── docs/                       # Guidelines + audit report + this file
├── .env / .env.example         # Environment config
├── .gitignore                  # Comprehensive ignore rules
├── requirements.txt            # Pinned Python dependencies
└── README.md                   # Full project docs with API examples
```

**Deleted:**
- `app/` directory (dead old Flask templates)
- Orphan `frontend/package.json`, `frontend/package-lock.json`, `frontend/node_modules/`
- `backend/models/` (moved to root `models/`)

### 3. Critical Audit Issues Fixed

| # | Issue | Status | What Was Done |
|---|-------|--------|---------------|
| 1 | Data Leakage in training | FIXED | `ml/train.py` rewritten: split BEFORE preprocess, fit only on train |
| 2 | No Class Imbalance Handling | FIXED | `class_weight='balanced'` added to RandomForestClassifier |
| 3 | Training/Serving Skew | FIXED | `ml/preprocessing.py` is single source of truth for both training & inference |
| 4 | No Input Validation | FIXED | `routes.py` has `REQUIRED_FIELDS` schema + `validate_input()` function |
| 5 | Bare `except` clause | FIXED | `prediction.py` uses explicit exception handling |
| 6 | Hardcoded `localhost` URL | FIXED | Frontend uses `NEXT_PUBLIC_API_URL` env var + `.env.local` |
| 7 | No Standardized Response | FIXED | All responses use `{ success, data, error }` format |
| 8 | Disorganized Structure | FIXED | Full restructuring (see above) |
| 9 | No `.env` / Config | FIXED | `.env`, `.env.example`, `backend/config.py` created |
| 10 | No `requirements.txt` | FIXED | Created with pinned versions |
| 11 | No `.gitignore` | FIXED | Comprehensive ignore for Python, data, models, node_modules |
| 12 | No Health Check | FIXED | `GET /health` endpoint added |
| 13 | `debug=True` hardcoded | FIXED | Uses `Config.DEBUG` from `.env` |
| 14 | CORS wide open | FIXED | Restricted to `ALLOWED_ORIGINS` from `.env` |
| 15 | No README | FIXED | Full README with structure, setup, API docs |
| 16 | SEO metadata default | FIXED | Updated `layout.tsx` metadata |
| 17 | Target Y/N not encoded | FIXED | `train.py` maps Y->1, N->0, drops NaN targets |
| 18 | Model Retrained | DONE | New model saved with metadata.json + feature_importance.csv |

### 4. Model Retrained Successfully

**Training output (with fixes applied):**
```
Train: 9595 rows, Test: 2399 rows
Outlier removal: 9595 -> 8620 rows (975 removed)
7 categorical columns encoded
19 numerical columns scaled

Evaluation on Test Set:
              precision    recall  f1-score   support
   Not Fraud       0.77      0.99      0.87      1809
       Fraud       0.84      0.10      0.18       590
    accuracy                           0.77      2399

Top 3 Features: annual_income (0.163), injury_claim (0.070), total_claim (0.070)
```

**New artifacts saved:**
- `model.pkl` (47MB), `encoders.pkl`, `scaler.pkl`, `num_cols.pkl`
- `train_medians.pkl`, `train_modes.pkl` (NEW - for inference imputation)
- `metadata.json` (NEW - model version/metrics tracking)
- `feature_importance.csv` (NEW - explainability)

### 5. End-to-End Verified

- Backend starts: `python run.py` from `backend/` -> runs on http://localhost:5000
- Health check: `GET /health` returns `{ status: "healthy", model_loaded: true }`
- Prediction: `POST /api/predict` returns correct `{ success: true, data: { prediction, probability, risk_level } }`
- `python-dotenv` installed in venv

---

## What's NOT Done Yet (Remaining Work)

### High Priority (from Audit Report)

1. **Recall is still only 10%** - `class_weight='balanced'` alone wasn't enough. Need to try:
   - SMOTE oversampling (`imblearn`)
   - Threshold tuning (lower decision threshold from 0.5 to 0.3)
   - Feature engineering improvements
   - Different model architectures (XGBoost, LightGBM)

2. **No sklearn Pipeline in production** (Audit 1.4) - Still using manual preprocessing steps. Should wrap in `ColumnTransformer` + `Pipeline` for cleaner artifact management.

3. **Frontend still sends `claim_number` / `claim_date`** (Audit 4.3) - These are dropped by `preprocessing.py` but the frontend form still includes them unnecessarily.

4. **Result passed via localStorage** (Audit 4.2) - Anti-pattern; should use URL params or React Context.

5. **No API abstraction layer in frontend** (Audit 4.5) - API calls directly in components.

6. **No form validation beyond HTML5** (Audit 4.6) - No JS-level field validation.

### Medium Priority

7. **No OpenAPI/Swagger docs** (Audit 5.2)
8. **Frontend doesn't validate response schema** (Audit 5.3)
9. **No batch inference endpoint** (Audit 7.2)
10. **Flask dev server used** (Audit 7.4) - No Gunicorn config
11. **No Docker** (Audit 6)
12. **No CI/CD** (Audit 6)

### Low Priority

13. **No caching** (Audit 7.3)
14. **No rate limiting** (Audit 6)
15. **Inconsistent naming** (Audit 8.6) - Column names with spaces
16. **`predict_fraud()` is a god function** (Audit 8.3) - Could be split further

---

## How to Run

```bash
# Backend
cd ML_Project
venv\Scripts\activate
cd backend
python run.py                    # http://localhost:5000

# Frontend (separate terminal)
cd ML_Project\frontend\insurance-fraud-detector
npm run dev                      # http://localhost:3000

# Retrain Model
cd ML_Project
venv\Scripts\activate
python -m ml.train
```

---

## Key Files Modified/Created This Session

| File | Action |
|------|--------|
| `ml/train.py` | Created (replaces old `save_model.py`) |
| `ml/preprocessing.py` | Created (shared preprocessing) |
| `ml/__init__.py` | Created |
| `backend/app/__init__.py` | Rewritten (logging, config, CORS) |
| `backend/app/routes.py` | Rewritten (validation, health, standard responses) |
| `backend/app/services/prediction.py` | Created (extracted from old `model.py`) |
| `backend/app/services/__init__.py` | Created |
| `backend/config.py` | Created |
| `backend/run.py` | Rewritten (uses Config) |
| `frontend/.../predict/page.tsx` | Modified (env var for API URL, new response format) |
| `frontend/.../layout.tsx` | Modified (SEO metadata) |
| `frontend/.../.env.local` | Created |
| `.env`, `.env.example` | Created |
| `.gitignore` | Created |
| `requirements.txt` | Created |
| `README.md` | Created |
| `docs/AUDIT_REPORT.md` | Created |
| `backend/app/model.py` | DELETED (replaced by services/prediction.py) |
| `app/` (root) | DELETED (dead code) |
