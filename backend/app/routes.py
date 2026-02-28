"""
API Routes
==========
Defines all API endpoints. Keeps route logic thin —
delegates to services for business logic.
"""
import logging
from flask import request, jsonify
from . import app
from .services.prediction import predict_fraud, ModelManager

logger = logging.getLogger(__name__)



REQUIRED_FIELDS = {
    'age_of_driver': {'type': (int, float), 'min': 16, 'max': 100},
    'gender': {'type': str, 'allowed': ['M', 'F']},
    'marital_status': {'type': (int, float, str)},
    'annual_income': {'type': (int, float), 'min': 0},
    'high_education': {'type': (int, float, str)},
    'safety_rating': {'type': (int, float), 'min': 0, 'max': 100},
    'address_change': {'type': (int, float, str)},
    'property_status': {'type': str},
    'zip_code': {'type': (int, float)},
    'claim_day_of_week': {'type': str},
    'accident_site': {'type': str},
    'past_num_of_claims': {'type': (int, float), 'min': 0},
    'witness_present': {'type': (int, float, str)},
    'liab_prct': {'type': (int, float), 'min': 0, 'max': 100},
    'channel': {'type': str},
    'police_report': {'type': (int, float, str)},
    'age_of_vehicle': {'type': (int, float), 'min': 0},
    'vehicle_category': {'type': str},
    'vehicle_price': {'type': (int, float), 'min': 0},
    'vehicle_color': {'type': str},
    'total_claim': {'type': (int, float), 'min': 0},
    'injury_claim': {'type': (int, float), 'min': 0},
    'policy deductible': {'type': (int, float), 'min': 0},
    'annual premium': {'type': (int, float), 'min': 0},
    'days open': {'type': (int, float), 'min': 0},
    'form defects': {'type': (int, float), 'min': 0},
}


def validate_input(data: dict) -> list:
    """Validate input data against the required schema."""
    errors = []
    for field, rules in REQUIRED_FIELDS.items():
        if field not in data:
            errors.append(f"Missing required field: '{field}'")
            continue

        value = data[field]

    
        if 'allowed' in rules and value not in rules['allowed']:
            errors.append(f"'{field}' must be one of {rules['allowed']}, got '{value}'")

        
        if isinstance(value, (int, float)):
            if 'min' in rules and value < rules['min']:
                errors.append(f"'{field}' must be >= {rules['min']}, got {value}")
            if 'max' in rules and value > rules['max']:
                errors.append(f"'{field}' must be <= {rules['max']}, got {value}")

    return errors


# ─── Health Check ────────────────────────────────────────────────

@app.route('/health')
def health():
    """Health check endpoint for monitoring."""
    try:
        manager = ModelManager.get_instance()
        model_ready = manager.is_ready
    except Exception:
        model_ready = False

    status = 'healthy' if model_ready else 'degraded'
    code = 200 if model_ready else 503

    return jsonify({
        'status': status,
        'model_loaded': model_ready,
    }), code


# ─── Root ────────────────────────────────────────────────────────

@app.route('/')
def index():
    """API info endpoint."""
    return jsonify({
        'message': 'FraudGuard AI API is running.',
        'version': '1.0.0',
        'endpoints': {
            'POST /api/predict': 'Submit a claim for fraud prediction',
            'GET /health': 'Health check',
        }
    })


# ─── Prediction ─────────────────────────────────────────────────

@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Predict fraud probability for a single insurance claim.

    Expects JSON body with claim features.
    Returns prediction, probability, and risk assessment.
    """
    # Parse JSON
    data = request.get_json(silent=True)
    if not data:
        return jsonify({
            'success': False,
            'data': None,
            'error': 'No JSON input provided. Send a JSON body with claim features.'
        }), 400

    # Validate input
    errors = validate_input(data)
    if errors:
        return jsonify({
            'success': False,
            'data': None,
            'error': f"Validation failed: {'; '.join(errors)}"
        }), 422

    # Run prediction
    try:
        prediction, probability = predict_fraud(data)

        # Use optimal threshold from training (not hardcoded 0.5)
        manager = ModelManager.get_instance()
        threshold = manager.optimal_threshold

        fraud_prob = float(probability[0][1])
        is_fraud = fraud_prob >= threshold
        result_label = "Fraud" if is_fraud else "Not Fraud"

        # Determine risk level
        if fraud_prob >= 0.7:
            risk_level = "HIGH"
        elif fraud_prob >= 0.4:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        return jsonify({
            'success': True,
            'data': {
                'prediction': result_label,
                'probability': round(fraud_prob, 4),
                'fraud_risk': is_fraud,
                'risk_level': risk_level,
                'threshold': round(threshold, 4),
            },
            'error': None
        })

    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'data': None,
            'error': 'Internal prediction error. Please try again.'
        }), 500
