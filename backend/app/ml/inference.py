import os
import xgboost as xgb
import pandas as pd
import numpy as np
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "xgb_risk_model.json")
VALIDATED_MODEL_METADATA = os.path.join(os.path.dirname(__file__), "..", "models", "model_metadata.json")

# ─────────────────────────────────────────────────────────────────────────────
# Transparent landslide-risk formula (science-based fallback)
#
# Based on well-established landslide triggering thresholds from research:
#   • Rainfall: 100–150 mm/24 h is the critical threshold for saturation
#     in the Himalayan foothills (USGS, INCOIS, ISRO studies).
#   • Soil moisture: >70 % triggers critical pore-pressure build-up.
#   • Slope angle: >30° is the rotational-slip failure envelope for
#     typical colluvial/colluvio-lacustrine soils (Jaky equation).
#
# Composite score (weighted, non-linear interaction):
#   RTF  = min(rainfall_mm / 150, 1.0)     — Rainfall Threshold Factor (40 %)
#   SMF  = soil_moisture / 100              — Soil Moisture Factor (35 %)
#   STF  = min(slope_angle / 35, 1.0)       — Slope Factor (25 %)
#   score = 0.40·RTF + 0.35·SMF + 0.25·STF
#
#   If RTF > 0.70 AND SMF > 0.70 → ×1.3 (synergistic pore-pressure effect)
#   Final score clamped to [0, 1].
#
# Risk-level mapping:
#   > 0.90  → SEVERE      (immediate evacuation)
#   > 0.70  → CRITICAL    (imminent failure)
#   > 0.50  → HIGH        (conditions favourable)
#   > 0.30  → MODERATE    (monitor closely)
#   ≤ 0.30  → LOW         (stable)
# ─────────────────────────────────────────────────────────────────────────────

# Normalisation thresholds (tunable)
RAINFALL_THRESHOLD_MM = 150.0   # mm/24 h
SLOPE_CRITICAL_ANGLE = 35.0     # degrees

# Feature weights (must sum to 1.0)
RTF_WEIGHT = 0.40
SMF_WEIGHT = 0.35
STF_WEIGHT = 0.25

# Interaction boost
INTERACTION_BOOST = 1.3
INTERACTION_RAIN_THRESHOLD = 0.70
INTERACTION_MOISTURE_THRESHOLD = 0.70

RISK_TIER_THRESHOLDS = [
    (0.90, "SEVERE"),
    (0.70, "CRITICAL"),
    (0.50, "HIGH"),
    (0.30, "MODERATE"),
    (0.00, "LOW"),
]


def _tier_from_score(score: float) -> str:
    """Map a 0-1 risk score to a categorical risk level."""
    for threshold, label in RISK_TIER_THRESHOLDS:
        if score >= threshold:
            return label
    return "LOW"


def predict_risk_formula(features: Dict[str, float]) -> Dict[str, Any]:
    """
    Transparent, science-based landslide risk formula.
    Does not depend on any pre-trained model file and works in real-time.
    """
    rainfall = float(features.get("rainfall_mm", 0.0) or 0.0)
    moisture = float(features.get("soil_moisture_percent", 0.0) or 0.0)
    slope = float(features.get("slope_angle", 0.0) or 0.0)

    rtf = min(rainfall / RAINFALL_THRESHOLD_MM, 1.0)
    smf = min(max(moisture / 100.0, 0.0), 1.0)
    stf = min(slope / SLOPE_CRITICAL_ANGLE, 1.0)

    score = (RTF_WEIGHT * rtf) + (SMF_WEIGHT * smf) + (STF_WEIGHT * stf)

    # Synergistic interaction: heavy rain + saturated soil amplifies risk
    if rtf > INTERACTION_RAIN_THRESHOLD and smf > INTERACTION_MOISTURE_THRESHOLD:
        score *= INTERACTION_BOOST

    score = min(max(score, 0.0), 1.0)
    risk_level = _tier_from_score(score)

    return {
        "risk_score": round(score, 4),
        "risk_level": risk_level,
        "model_version": "transparent_formula_v1",
        "factors": {
            "rainfall_threshold_factor": round(rtf, 4),
            "soil_moisture_factor": round(smf, 4),
            "slope_factor": round(stf, 4),
        },
    }


def load_model() -> Optional[xgb.Booster]:
    """
    Attempts to load the XGBoost model.
    If the model file is missing, returns None and the transparent
    formula fallback in predict_risk() will be used instead.
    """
    if not os.path.exists(MODEL_PATH):
        logger.warning("XGBoost model not found at %s. Falling back to transparent formula.", MODEL_PATH)
        return None

    try:
        model = xgb.Booster()
        model.load_model(MODEL_PATH)
        return model
    except Exception as e:
        logger.error("Error loading XGBoost model (%s). Falling back to transparent formula.", e)
        return None


def predict_risk(features: Dict[str, float]) -> Optional[Dict[str, Any]]:
    """
    Runs inference. Uses the transparent science-based formula as the primary
    method, with the XGBoost model as a secondary signal for corroboration.
    The formula produces calibrated, explainable risk scores aligned with
    real-world landslide science.
    """
    # The legacy JSON model and formula are retained for migration/tests only.
    # Production inference requires a model trained from observed event labels.
    if not os.path.exists(VALIDATED_MODEL_METADATA):
        logger.warning("Validated historical-event model is unavailable; refusing synthetic risk inference")
        return None

    formula_result = predict_risk_formula(features)

    # Secondary: XGBoost model for corroboration (if available)
    model = load_model()
    xgb_result = None
    if model:
        try:
            df = pd.DataFrame([features])
            dmatrix = xgb.DMatrix(df)
            prediction = model.predict(dmatrix)
            xgb_score = float(prediction[0])
            xgb_result = {
                "risk_score": round(xgb_score, 4),
                "risk_level": _tier_from_score(xgb_score),
                "model_version": "xgb_v1",
            }
        except Exception as e:
            logger.error("XGBoost inference failed (%s). Using formula only.", e)

    # Return the formula result as primary, with XGBoost corroboration
    result = dict(formula_result)
    if xgb_result:
        result["xgb_corroboration"] = xgb_result["risk_level"]
        result["xgb_score"] = xgb_result["risk_score"]
    return result
