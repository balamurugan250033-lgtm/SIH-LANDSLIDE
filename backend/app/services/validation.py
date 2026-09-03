import logging
from datetime import datetime, timedelta
from typing import Dict, Any

from app.core.config import settings

logger = logging.getLogger(__name__)

def validate_environmental_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates data coming from external APIs before it hits the DB or ML model.
    Checks for missing fields, abnormal readings, and staleness.
    """
    validated = {
        "is_valid": True,
        "is_stale": False,
        "data_quality_score": 1.0,
        "errors": []
    }
    
    # Check timestamp freshness
    if "timestamp" in data:
        try:
            ts = data["timestamp"]
            if isinstance(ts, str):
                ts = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            
            # Remove tzinfo for simplistic comparison (in real app, keep timezone aware)
            ts = ts.replace(tzinfo=None)
            
            age = datetime.utcnow() - ts
            if age > timedelta(minutes=settings.STALE_DATA_THRESHOLD_MINUTES):
                validated["is_stale"] = True
                validated["data_quality_score"] -= 0.5
                validated["errors"].append(f"Data is stale (age: {age})")
        except ValueError:
            validated["is_valid"] = False
            validated["errors"].append("Invalid timestamp format")

    # Range validations (example bounds)
    if data.get("rainfall_mm") is not None:
        if not (0 <= data["rainfall_mm"] <= 1000): # Unrealistic daily rainfall
            validated["is_valid"] = False
            validated["errors"].append("Rainfall out of realistic bounds")
            
    if data.get("soil_moisture_percent") is not None:
        if not (0 <= data["soil_moisture_percent"] <= 100):
            validated["is_valid"] = False
            validated["errors"].append("Soil moisture must be 0-100")

    # If critical fields are missing
    if data.get("rainfall_mm") is None and data.get("soil_moisture_percent") is None:
        validated["data_quality_score"] -= 0.3
        validated["errors"].append("Missing primary environmental indicators")

    return validated
