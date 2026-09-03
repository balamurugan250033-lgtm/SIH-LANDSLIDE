from app.services.decision import evaluate_warning_decision
from app.models.models import Observation

def test_decision_stale_data():
    obs = Observation(
        is_stale=True,
        data_quality_score=1.0,
        rainfall_mm=150.0,
        soil_moisture_percent=85.0,
        slope_angle=40.0
    )
    res = evaluate_warning_decision(obs)
    assert res is None # stale data must be ignored

def test_decision_low_quality_data():
    obs = Observation(
        is_stale=False,
        data_quality_score=0.4, # under 0.5 threshold
        rainfall_mm=150.0,
        soil_moisture_percent=85.0,
        slope_angle=40.0
    )
    res = evaluate_warning_decision(obs)
    assert res is None # low quality data must be ignored

def test_decision_safe_conditions():
    obs = Observation(
        is_stale=False,
        data_quality_score=1.0,
        rainfall_mm=2.0,
        soil_moisture_percent=15.0,
        slope_angle=10.0
    )
    res = evaluate_warning_decision(obs)
    assert res is None # low risk conditions must not trigger alerts

def test_decision_critical_conditions():
    obs = Observation(
        is_stale=False,
        data_quality_score=1.0,
        rainfall_mm=220.0,
        soil_moisture_percent=90.0,
        slope_angle=45.0
    )
    res = evaluate_warning_decision(obs)
    assert res is not None
    assert res["risk_level"] in ["HIGH", "CRITICAL", "SEVERE"]
    assert res["risk_score"] > 0.5
    assert "Elevated indicators" in res["reason"] or "landslide risk" in res["reason"]
