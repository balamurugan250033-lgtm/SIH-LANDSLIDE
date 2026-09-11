"""Load the validated model and return a calibrated probability, if available."""
from pathlib import Path
import json
import joblib
import pandas as pd

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"


def predict(features: dict) -> dict:
    metadata_path = MODEL_DIR / "model_metadata.json"
    model_path = MODEL_DIR / "landslide_model.joblib"
    if not metadata_path.exists() or not model_path.exists():
        return {"status": "MODEL_UNAVAILABLE", "reason": "No validated historical-event model has been trained"}
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    columns = metadata["feature_list"]
    probability = float(joblib.load(model_path).predict_proba(pd.DataFrame([features], columns=columns).fillna(pd.NA))[:, 1][0])
    score = round(probability * 100)
    thresholds = [(81, "CRITICAL"), (61, "HIGH"), (41, "MODERATE"), (21, "WATCH"), (0, "LOW")]
    level = next(label for minimum, label in thresholds if score >= minimum)
    return {"status": "OK", "landslide_probability": probability, "risk_score": score, "risk_level": level, "model_version": metadata["model_version"], "feature_list": columns}
