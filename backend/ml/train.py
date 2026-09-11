"""Train a calibrated XGBoost landslide model from real labeled history.

This command intentionally fails when historical event labels are unavailable.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import average_precision_score, brier_score_loss, precision_recall_fscore_support, roc_auc_score
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
import xgboost as xgb

try:
    from .data_cleaning import clean_frame
    from .feature_engineering import build_features, feature_columns
    from .create_labels import attach_forward_labels
except ImportError:
    from data_cleaning import clean_frame
    from feature_engineering import build_features, feature_columns
    from create_labels import attach_forward_labels


def load_sqlite(path: str, table: str) -> pd.DataFrame:
    connection = sqlite3.connect(path)
    try:
        return pd.read_sql_query(f'SELECT * FROM "{table}"', connection)
    finally:
        connection.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", default="landslide.db")
    parser.add_argument("--events-table", default="historical_landslides")
    parser.add_argument("--model-dir", default="models")
    parser.add_argument("--prediction-window-hours", type=int, default=6)
    args = parser.parse_args()
    connection = sqlite3.connect(args.database)
    tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    connection.close()
    if args.events_table not in tables:
        raise SystemExit(f"TRAINING BLOCKED: {args.events_table!r} does not exist. Add validated historical event records first.")

    observations, cleaning_report = clean_frame(load_sqlite(args.database, "observations"))
    events, _ = clean_frame(load_sqlite(args.database, args.events_table))
    if observations.empty or events.empty:
        raise SystemExit("TRAINING BLOCKED: observations and historical events are both required")
    features = build_features(observations)
    labeled = attach_forward_labels(features, events, args.prediction_window_hours)
    columns = feature_columns(labeled)
    if not columns or labeled["landslide_occurred"].nunique() < 2:
        raise SystemExit("TRAINING BLOCKED: labeled data needs at least one positive and one negative class")
    labeled = labeled.sort_values("timestamp")
    split = int(len(labeled) * 0.8)
    train, test = labeled.iloc[:split], labeled.iloc[split:]
    if train["landslide_occurred"].nunique() < 2 or test["landslide_occurred"].nunique() < 2:
        raise SystemExit("TRAINING BLOCKED: temporal train/test split lacks both classes")

    estimator = xgb.XGBClassifier(
        objective="binary:logistic", eval_metric="logloss", n_estimators=300,
        max_depth=4, learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
        scale_pos_weight=max(1.0, (train["landslide_occurred"] == 0).sum() / max(1, (train["landslide_occurred"] == 1).sum())),
        random_state=42,
    )
    pipeline = Pipeline([("imputer", SimpleImputer(strategy="median", add_indicator=True)), ("model", estimator)])
    pipeline.fit(train[columns], train["landslide_occurred"])
    calibrated = CalibratedClassifierCV(pipeline, method="sigmoid", cv="prefit")
    calibrated.fit(test[columns], test["landslide_occurred"])
    probabilities = calibrated.predict_proba(test[columns])[:, 1]
    predictions = (probabilities >= 0.5).astype(int)
    precision, recall, f1, _ = precision_recall_fscore_support(test["landslide_occurred"], predictions, average="binary", zero_division=0)
    report = {
        "model_id": "LS-NER-XGB-001", "model_version": "1.0.0",
        "training_timestamp": datetime.now(timezone.utc).isoformat(),
        "feature_list": columns, "prediction_window_hours": args.prediction_window_hours,
        "training_rows": len(train), "test_rows": len(test),
        "positive_events": int(labeled["landslide_occurred"].sum()),
        "metrics": {"roc_auc": roc_auc_score(test["landslide_occurred"], probabilities), "pr_auc": average_precision_score(test["landslide_occurred"], probabilities), "precision": precision, "recall": recall, "f1": f1, "brier_score": brier_score_loss(test["landslide_occurred"], probabilities)},
        "cleaning_report": cleaning_report,
    }
    model_dir = Path(args.model_dir); model_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(calibrated, model_dir / "landslide_model.joblib")
    (model_dir / "model_metadata.json").write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
