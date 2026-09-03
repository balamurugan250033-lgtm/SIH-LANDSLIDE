from datetime import datetime, timedelta
from app.services.validation import validate_environmental_data

def test_validate_valid_data():
    data = {
        "timestamp": datetime.utcnow().isoformat(),
        "rainfall_mm": 45.0,
        "soil_moisture_percent": 60.0,
        "slope_angle": 25.0
    }
    res = validate_environmental_data(data)
    assert res["is_valid"] is True
    assert res["is_stale"] is False
    assert res["data_quality_score"] == 1.0

def test_validate_stale_data():
    stale_ts = (datetime.utcnow() - timedelta(hours=3)).isoformat()
    data = {
        "timestamp": stale_ts,
        "rainfall_mm": 45.0,
        "soil_moisture_percent": 60.0,
        "slope_angle": 25.0
    }
    res = validate_environmental_data(data)
    assert res["is_valid"] is True
    assert res["is_stale"] is True
    assert res["data_quality_score"] == 0.5 # 1.0 - 0.5 penalty

def test_validate_invalid_bounds():
    data = {
        "timestamp": datetime.utcnow().isoformat(),
        "rainfall_mm": -10.0, # invalid
        "soil_moisture_percent": 120.0, # invalid
        "slope_angle": 25.0
    }
    res = validate_environmental_data(data)
    assert res["is_valid"] is False
    assert len(res["errors"]) > 0

def test_validate_missing_indicators():
    data = {
        "timestamp": datetime.utcnow().isoformat(),
        "rainfall_mm": None,
        "soil_moisture_percent": None,
        "slope_angle": 25.0
    }
    res = validate_environmental_data(data)
    assert res["is_valid"] is True # structure is valid
    assert res["data_quality_score"] == 0.7 # penalty for missing primary indicators
