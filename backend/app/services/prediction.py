"""
Prediction Service
==================
Handles model loading and inference logic.
Separated from the API layer so ML logic doesn't leak into routes.

Uses the shared preprocessing module (ml.preprocessing) to ensure
training and inference use the exact same data transformations.
"""

import os
import sys
import pickle
import json
import logging

import pandas as pd
import numpy as np

# Add project root to path so we can import ml.preprocessing
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, PROJECT_ROOT)

from ml.preprocessing import (
    CATEGORICAL_COLS, NUMERIC_COLS,
    prepare_input_for_prediction
)

logger = logging.getLogger(__name__)

# ─── Model Directory ────────────────────────────────────────────

MODEL_DIR = os.path.join(PROJECT_ROOT, 'models')


# ─── Model Manager (Singleton) ──────────────────────────────────

class ModelManager:
    """
    Manages loading and lifecycle of ML model artifacts.
    Uses singleton pattern to ensure model is loaded only once.
    """

    _instance = None

    def __init__(self):
        self.pipeline = None
        self.train_medians = None
        self.train_modes = None
        self.optimal_threshold = 0.5  # default, overridden by metadata
        self._loaded = False

    @classmethod
    def get_instance(cls):
        """Get or create the singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
            cls._instance.load()
        return cls._instance

    def load(self):
        """Load all model artifacts from disk."""
        logger.info(f"Loading model artifacts from: {MODEL_DIR}")

        try:
            pipeline_path = os.path.join(MODEL_DIR, 'pipeline.pkl')
            if not os.path.exists(pipeline_path):
                raise FileNotFoundError(f"Required artifact missing: {pipeline_path}")

            with open(pipeline_path, 'rb') as f:
                self.pipeline = pickle.load(f)

            # Optional artifacts (may not exist for older models)
            for filename, attr in [('train_medians.pkl', 'train_medians'),
                                   ('train_modes.pkl', 'train_modes')]:
                filepath = os.path.join(MODEL_DIR, filename)
                if os.path.exists(filepath):
                    with open(filepath, 'rb') as f:
                        setattr(self, attr, pickle.load(f))

            self._loaded = True

            # Load optimal threshold from metadata
            metadata_path = os.path.join(MODEL_DIR, 'metadata.json')
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r') as f:
                    meta = json.load(f)
                self.optimal_threshold = meta.get('optimal_threshold', 0.5)
                logger.info(f"  Using optimal threshold: {self.optimal_threshold:.4f}")

            logger.info("[OK] All model artifacts loaded successfully")

        except Exception as e:
            logger.critical(f"Failed to load model artifacts: {e}")
            raise RuntimeError(f"Cannot start without model: {e}")

    @property
    def is_ready(self):
        return self._loaded


def predict_fraud(input_data: dict) -> tuple:
    """
    Run fraud prediction on a single input record.

    Args:
        input_data: Dictionary containing feature values from the API request.

    Returns:
        (prediction_array, probability_array)
        - prediction_array: np.array with 0 or 1
        - probability_array: np.array with shape (1, 2) — [P(not fraud), P(fraud)]

    Raises:
        RuntimeError: If model is not loaded.
        ValueError: If input data is invalid.
    """
    manager = ModelManager.get_instance()

    if not manager.is_ready:
        raise RuntimeError("Model not loaded correctly.")

    # Step 1: Convert input to DataFrame and drop non-predictive columns
    df = prepare_input_for_prediction(input_data)

    # Step 2: The pipeline handles the rest natively
    prediction = manager.pipeline.predict(df)
    probability = manager.pipeline.predict_proba(df)

    return prediction, probability
