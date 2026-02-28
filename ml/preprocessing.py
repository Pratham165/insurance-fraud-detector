"""
Shared preprocessing logic used by both training (ml/train.py) and
inference (backend/app/services/prediction.py).

This file is the SINGLE SOURCE OF TRUTH for all data transformations.
Any change here automatically applies to both training and inference,
preventing train-serve skew.
"""

import pandas as pd
import numpy as np
from scipy.stats import zscore

# ─── Constants ───────────────────────────────────────────────────

# Columns that provide no predictive value and should be dropped
COLS_TO_DROP = ['claim_number', 'claim_date']

# Target column name
TARGET_COL = 'fraud reported'

# Categorical columns that need encoding (determined from dataset schema)
CATEGORICAL_COLS = [
    'gender', 'claim_day_of_week', 'accident_site',
    'channel', 'vehicle_category', 'vehicle_color',
    'property_status'
]

# These are treated as numeric even though some may look categorical
NUMERIC_COLS = [
    'age_of_driver', 'marital_status', 'annual_income', 'high_education',
    'safety_rating', 'address_change', 'zip_code',
    'past_num_of_claims', 'witness_present', 'liab_prct', 'police_report',
    'age_of_vehicle', 'vehicle_price', 'total_claim', 'injury_claim',
    'policy deductible', 'annual premium', 'days open', 'form defects'
]


# ─── Preprocessing Functions ────────────────────────────────────

def drop_non_predictive_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Drop columns that have no predictive value (IDs, dates, etc.)."""
    cols_present = [c for c in COLS_TO_DROP if c in df.columns]
    return df.drop(columns=cols_present)


def build_preprocessor():
    """
    Builds an sklearn ColumnTransformer to handle all scaling and encoding.
    This replaces manual scaling/encoding loops and ensures the exact
    same transformations are applied during inference.
    """
    from sklearn.compose import ColumnTransformer
    from sklearn.preprocessing import OrdinalEncoder, MinMaxScaler
    import numpy as np
    
    # We use OrdinalEncoder instead of LabelEncoder since LabelEncoder
    # is only meant for 1D target arrays in sklearn pipelines.
    # handle_unknown='use_encoded_value' allows it to gracefully handle unseen labels in production
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', MinMaxScaler(), NUMERIC_COLS),
            ('cat', OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1), CATEGORICAL_COLS)
        ],
        remainder='drop'  # Drop any columns not explicitly defined above
    )
    
    return preprocessor

def fill_missing_values(df: pd.DataFrame, medians: dict = None, modes: dict = None, fit: bool = False):
    """
    Fill missing values in the DataFrame.
    
    Args:
        df: Input DataFrame
        medians: Dict of column -> median value (for transform mode)
        modes: Dict of column -> mode value (for transform mode)
        fit: If True, compute medians/modes from df (training mode)
        
    Returns:
        (df, medians, modes) if fit=True
        df if fit=False
    """
    if fit:
        medians = {}
        modes = {}

    # Numeric columns: coerce to numeric type, then fill with median
    num_cols = [c for c in NUMERIC_COLS if c in df.columns]
    for col in num_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        if fit:
            medians[col] = df[col].median()
        if col in (medians or {}):
            df[col] = df[col].fillna(medians[col])

    # Categorical columns: fill with mode
    cat_cols = [c for c in CATEGORICAL_COLS if c in df.columns]
    for col in cat_cols:
        if fit:
            modes[col] = df[col].mode()[0] if not df[col].mode().empty else 'Unknown'
        if col in (modes or {}):
            df[col] = df[col].fillna(modes[col])

    if fit:
        return df, medians, modes
    return df


def remove_outliers(df: pd.DataFrame, y: pd.Series = None, z_threshold: float = 3.0):
    """
    Remove rows with outlier values using Z-score method.
    Only applied during training — never during inference.
    
    Args:
        df: Feature DataFrame
        y: Target series (will be filtered in parallel)
        z_threshold: Z-score threshold for outlier detection
        
    Returns:
        (df_clean, y_clean)
    """
    numeric_df = df.select_dtypes(include=['int64', 'float64'])
    if numeric_df.empty:
        return df, y

    z = np.abs(zscore(numeric_df, nan_policy='omit'))
    mask = (z < z_threshold).all(axis=1)

    df_clean = df[mask].copy()
    y_clean = y[mask].copy() if y is not None else None

    print(f"Outlier removal: {len(df)} -> {len(df_clean)} rows "
          f"({len(df) - len(df_clean)} removed)")

    return df_clean, y_clean


def prepare_input_for_prediction(input_data: dict) -> pd.DataFrame:
    """
    Convert a raw input dictionary (from API request) into a DataFrame,
    dropping non-predictive columns and ensuring correct types.
    
    Used during inference only.
    """
    df = pd.DataFrame([input_data])

    # Drop non-predictive columns
    df = drop_non_predictive_columns(df)

    # Ensure numeric columns are actually numeric
    for col in NUMERIC_COLS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    # Ensure categorical columns are strings
    for col in CATEGORICAL_COLS:
        if col in df.columns:
            df[col] = df[col].astype(str)

    # Ensure missing columns are present, filled with 0 (numeric) or 'Unknown' (categorical)
    for col in NUMERIC_COLS:
        if col not in df.columns:
            df[col] = 0.0
            
    for col in CATEGORICAL_COLS:
        if col not in df.columns:
            df[col] = 'Unknown'

    return df
