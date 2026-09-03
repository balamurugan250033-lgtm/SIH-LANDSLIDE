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
    
    # Return alert decision for MODERATE and above
    if risk_level in ["MODERATE", "HIGH", "CRITICAL", "SEVERE"]:
        tier_reason = {
            "SEVERE": "Severe landslide risk. Immediate evacuation advised.",
            "CRITICAL": "Critical landslide risk. Prepare for immediate evacuation.",
            "HIGH": "High landslide risk. Avoid the area and stay alert.",
            "MODERATE": "Moderate landslide risk. Exercise caution and monitor conditions."
        }
        return {
            "risk_level": risk_level,
            "risk_score": risk_score,
            "reason": tier_reason.get(risk_level, f"Elevated indicators: Rainfall={features['rainfall_mm']}mm, Soil={features['soil_moisture_percent']}%. ML Confidence Score: {risk_score:.2f}")
        }
        
    return None
