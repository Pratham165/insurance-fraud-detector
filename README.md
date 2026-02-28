# 🛡️ FraudGuard AI — Insurance Fraud Detection

AI-powered insurance fraud detection system using Machine Learning (Random Forest) with a Flask API backend and Next.js frontend.

## Project Structure

```
ML_Project/
│
├── backend/                    # Flask API server
│   ├── app/
│   │   ├── __init__.py         # Flask app factory
│   │   ├── routes.py           # API endpoints
│   │   └── services/
│   │       └── prediction.py   # ML inference service
│   ├── config.py               # Configuration (env vars)
│   └── run.py                  # Entry point
│
├── ml/                         # Machine Learning pipeline
│   ├── data/
│   │   ├── raw/                # Original dataset
│   │   └── processed/          # Cleaned dataset
│   ├── notebooks/              # Jupyter notebooks (EDA, experiments)
│   ├── preprocessing.py        # Shared preprocessing (training + inference)
│   └── train.py                # Model training script
│
├── models/                     # Serialized model artifacts (.pkl)
│
├── frontend/                   # Next.js frontend
│   └── insurance-fraud-detector/
│
├── docs/                       # Documentation
├── .env.example                # Environment variable template
├── .gitignore
├── requirements.txt            # Python dependencies
└── README.md
```

## Quick Start

### 1. Setup Python Environment

```bash
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
copy .env.example .env
```

### 3. Train the Model

```bash
python -m ml.train
```

### 4. Start the Backend

```bash
cd backend
python run.py
```

API will be available at `http://localhost:5000`

### 5. Start the Frontend

```bash
cd frontend/insurance-fraud-detector
npm install
npm run dev
```

Frontend will be available at `http://localhost:3000`

## API Endpoints

| Method | Endpoint        | Description                    |
|--------|----------------|--------------------------------|
| GET    | `/`            | API info                       |
| GET    | `/health`      | Health check                   |
| POST   | `/api/predict` | Submit claim for prediction    |

### Example Request

```bash
curl -X POST http://localhost:5000/api/predict \
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

- **ML**: Python, scikit-learn, pandas, numpy
- **Backend**: Flask, Flask-CORS
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
