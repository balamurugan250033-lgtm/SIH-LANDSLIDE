from typing import Optional
from app.models.models import Observation
from app.ml.inference import predict_risk

def evaluate_warning_decision(observation: Observation) -> Optional[dict]:
    """
    Decision engine that separates ML prediction from alert generation.
    Takes into account data freshness and quality.
    """
    if observation.is_stale:
        # Do not generate new high-confidence alerts on stale data
        return None
        
    if observation.data_quality_score < 0.5:
        # Data quality too low to trust for an alert
        return None
        
    # Prepare features for ML
    features = {
        "rainfall_mm": observation.rainfall_mm if observation.rainfall_mm is not None else 0.0,
        "soil_moisture_percent": observation.soil_moisture_percent if observation.soil_moisture_percent is not None else 0.0,
        "slope_angle": observation.slope_angle if observation.slope_angle is not None else 0.0
    }
    
    # Get real ML prediction (will return None if model isn't trained/present)
    ml_result = predict_risk(features)
    
    if not ml_result:
        return None
        
    # Decision Logic
    risk_level = ml_result["risk_level"]
    risk_score = ml_result["risk_score"]
    factors = ml_result.get("factors", {})
    rtf = factors.get("rainfall_threshold_factor", 0)
    smf = factors.get("soil_moisture_factor", 0)
    stf = factors.get("slope_factor", 0)

    # Build contextual warning messages based on real environmental triggers
    reasons = {
        "SEVERE": (
            f"Elevated indicators: immediate landslide evacuation required. Rainfall {features['rainfall_mm']}mm in 24h "
            f"({rtf:.0%} of critical 150mm threshold) with soil saturation {features['soil_moisture_percent']:.0f}% "
            f"({smf:.0%} of critical) and slope {features['slope_angle']:.0f}° ({stf:.0%} of critical 35°). "
            f"Critical pore-pressure buildup destabilising slope mass. Evacuate immediately."
        ),
        "CRITICAL": (
            f"Landslide imminent within 24-48h. Rainfall {features['rainfall_mm']}mm with soil saturation "
            f"{features['soil_moisture_percent']:.0f}% approaching critical. Slope {features['slope_angle']:.0f}° "
            f"at failure envelope. Avoid all hill slopes and evacuate vulnerable zones."
        ),
        "HIGH": (
            f"High landslide probability. Rainfall {features['rainfall_mm']}mm and soil saturation "
            f"{features['soil_moisture_percent']:.0f}% increasing pore pressure. Steep slope ({features['slope_angle']:.0f}°) "
            f"at risk of rotational slip. Restrict movement, avoid driving through landslide zones."
        ),
        "MODERATE": (
            f"Moderate risk: monitor conditions. Rainfall {features['rainfall_mm']}mm with soil saturation "
            f"{features['soil_moisture_percent']:.0f}% and slope {features['slope_angle']:.0f}°. "
            f"Continue monitoring official channels and prepare contingency plans."
        ),
    }
    # Only generate alerts for MODERATE and above
    if risk_level not in ["MODERATE", "HIGH", "CRITICAL", "SEVERE"]:
        return None

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "reason": reasons.get(risk_level, f"Stable conditions. Rainfall={features['rainfall_mm']}mm, Soil={features['soil_moisture_percent']}%, Slope={features['slope_angle']}°"),
    }
