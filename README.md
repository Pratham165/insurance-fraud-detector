# 🛡️ Aegis — Insurance Fraud Detection System

AI-powered insurance fraud detection using a scikit-learn pipeline (Random Forest + SMOTE) with a Flask REST API backend and Next.js frontend.

## Live Demo

| Service | URL |
|---------|-----|
| Frontend | *(Vercel URL — update after deploy)* |
| Backend API | *(Render URL — update after deploy)* |

## Project Structure

```
ML_Project/
├── backend/                    # Flask API server
│   ├── app/
│   │   ├── __init__.py         # Flask app factory + CORS
│   │   ├── routes.py           # API endpoints + validation
│   │   └── services/
│   │       └── prediction.py   # ML inference service (loads pipeline.pkl)
│   ├── config.py               # Config from environment variables
│   ├── wsgi.py                 # Gunicorn entry point (production)
│   └── run.py                  # Dev server entry point
│
├── ml/                         # Machine Learning pipeline
│   ├── data/
│   │   ├── raw/                # Original dataset (gitignored)
│   │   └── processed/          # Cleaned dataset (gitignored)
│   ├── notebooks/              # Jupyter notebooks (EDA, experiments)
│   ├── preprocessing.py        # Shared preprocessing (training + inference)
│   └── train.py                # Model training script
│
├── models/                     # Serialized pipeline artifacts
│   ├── pipeline.pkl            # Full sklearn pipeline (preprocessor + SMOTE + RF)
│   ├── train_medians.pkl       # Imputation values from training
│   ├── train_modes.pkl
│   └── metadata.json           # Model version and metrics
│
├── frontend/
│   └── insurance-fraud-detector/  # Next.js app
│
├── docs/                       # Audit report, checkpoint docs
├── render.yaml                 # Render deployment config
├── .python-version             # Pins Python 3.11 for Render
├── .env.example                # Environment variable template
├── requirements.txt            # Python dependencies (pinned)
└── README.md
```

## Quick Start (Local)

### 1. Setup Python Environment

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
copy .env.example .env         # Windows
# cp .env.example .env         # Mac/Linux
# Edit .env: set ALLOWED_ORIGINS=http://localhost:3000
```

### 3. Train the Model

```bash
python -m ml.train
```

### 4. Start the Backend

```bash
cd backend
python run.py
# API: http://localhost:5000
```

### 5. Start the Frontend

```bash
cd frontend/insurance-fraud-detector
npm install
npm run dev
# App: http://localhost:3000
```

## Deployment

- **Backend** → [Render](https://render.com) — `render.yaml` auto-configures the service. Start command: `gunicorn --chdir backend wsgi:app`
- **Frontend** → [Vercel](https://vercel.com) — set root directory to `frontend/insurance-fraud-detector`, add `NEXT_PUBLIC_API_URL` env var pointing to Render URL.

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API info |
| `GET` | `/health` | Health check + model status |
| `POST` | `/api/predict` | Submit claim for fraud prediction |

### Example Request

```bash
curl -X POST https://your-api.onrender.com/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "age_of_driver": 35,
    "gender": "M",
    "marital_status": 1,
    "annual_income": 55000,
    "high_education": 1,
    "safety_rating": 70,
    "address_change": 0,
    "property_status": "Own",
    "zip_code": 50000,
    "claim_day_of_week": "Monday",
    "accident_site": "Local",
    "past_num_of_claims": 0,
    "witness_present": 1,
    "liab_prct": 50,
    "channel": "Online",
    "police_report": 1,
    "age_of_vehicle": 3,
    "vehicle_category": "Compact",
    "vehicle_price": 25000,
    "vehicle_color": "white",
    "total_claim": 5000,
    "injury_claim": 0,
    "policy deductible": 500,
    "annual premium": 1200,
    "days open": 5,
    "form defects": 0
  }'
```

### Example Response

```json
{
  "success": true,
  "data": {
    "prediction": "Not Fraud",
    "probability": 0.1234,
    "fraud_risk": false,
    "risk_level": "LOW"
  },
  "error": null
}
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| ML | Python, scikit-learn, imbalanced-learn (SMOTE), pandas, numpy |
| Backend | Flask, Flask-CORS, Gunicorn |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui |
| Deployment | Render (backend), Vercel (frontend) |
