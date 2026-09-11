"""Evaluate a trained model on a strictly later labeled dataset."""
import argparse
import json
from pathlib import Path
import joblib
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, average_precision_score, brier_score_loss

try:
    from .data_cleaning import clean_frame
    from .feature_engineering import build_features, feature_columns
    from .create_labels import attach_forward_labels
    from .train import load_sqlite
except ImportError:
    from data_cleaning import clean_frame
    from feature_engineering import build_features, feature_columns
    from create_labels import attach_forward_labels
    from train import load_sqlite


def evaluate(database: str, model_path: str, events_table: str, window_hours: int) -> dict:
    observations, _ = clean_frame(load_sqlite(database, "observations"))
    events, _ = clean_frame(load_sqlite(database, events_table))
    labeled = attach_forward_labels(build_features(observations), events, window_hours)
    model = joblib.load(model_path)
    columns = feature_columns(labeled)
    probabilities = model.predict_proba(labeled[columns])[:, 1]
    predictions = (probabilities >= 0.5).astype(int)
    return {
        "rows": len(labeled),
        "roc_auc": roc_auc_score(labeled.landslide_occurred, probabilities),
        "pr_auc": average_precision_score(labeled.landslide_occurred, probabilities),
        "brier_score": brier_score_loss(labeled.landslide_occurred, probabilities),
        "classification_report": classification_report(labeled.landslide_occurred, predictions, output_dict=True, zero_division=0),
        "confusion_matrix": confusion_matrix(labeled.landslide_occurred, predictions).tolist(),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", default="landslide.db")
    parser.add_argument("--model", default="models/landslide_model.joblib")
    parser.add_argument("--events-table", default="historical_landslides")
    parser.add_argument("--prediction-window-hours", type=int, default=6)
    parser.add_argument("--output", default="ml/reports/evaluation_report.json")
    args = parser.parse_args()
    report = evaluate(args.database, args.model, args.events_table, args.prediction_window_hours)
    output = Path(args.output); output.parent.mkdir(parents=True, exist_ok=True); output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
