import os
import xgboost as xgb
import pandas as pd
import numpy as np
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Path where the real trained model will be stored
MODEL_PATH = os.path.join(os.path.dirname(__file__), "xgb_risk_model.json")

def load_model() -> Optional[xgb.Booster]:
    """
    Attempts to load the actual XGBoost model.
    DO NOT fake the model load. If it's missing, return None.
    """
    if not os.path.exists(MODEL_PATH):
        logger.warning(f"Model file not found at {MODEL_PATH}. Cannot perform inference.")
        return None
        
    try:
        model = xgb.Booster()
        model.load_model(MODEL_PATH)
        return model
    except Exception as e:
        logger.error(f"Error loading XGBoost model: {str(e)}")
        return None

def predict_risk(features: Dict[str, float]) -> Optional[Dict[str, Any]]:
    """
    Runs inference on the XGBoost model using provided features.
    If model is unavailable, returns None (no fake scores).
    """
    model = load_model()
    if not model:
        return None
        
    try:
        # Convert dict to DataFrame for XGBoost DMatrix
        # Expected features might be: rainfall_mm, soil_moisture, slope
        df = pd.DataFrame([features])
        dmatrix = xgb.DMatrix(df)
        
        # Inference
        prediction = model.predict(dmatrix)
        risk_score = float(prediction[0])
        
        # Basic mapping to levels (these thresholds should be calibrated)
        risk_level = "LOW"
        if risk_score > 0.9:
            risk_level = "SEVERE"
        elif risk_score > 0.7:
            risk_level = "CRITICAL"
        elif risk_score > 0.5:
            risk_level = "HIGH"
        elif risk_score > 0.3:
            risk_level = "MODERATE"
            
        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "model_version": "xgb_v1"
        }
    except Exception as e:
        logger.error(f"Inference failed: {str(e)}")
        return None
