"""Validation and cleaning helpers for historical observations and events."""
from __future__ import annotations

import pandas as pd

NUMERIC_BOUNDS = {
    "rainfall_mm": (0, 2000),
    "soil_moisture_percent": (0, 100),
    "slope_angle": (0, 90),
    "latitude": (-90, 90),
    "longitude": (-180, 180),
}


def clean_frame(frame: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    report = {"input_rows": len(frame), "duplicates_removed": 0, "invalid_rows_removed": 0, "missing_by_column": {}}
    cleaned = frame.copy()
    for column in ("timestamp", "observed_at", "created_at"):
        if column in cleaned:
            cleaned[column] = pd.to_datetime(cleaned[column], utc=True, errors="coerce")
    timestamp_column = next((column for column in ("timestamp", "observed_at", "created_at") if column in cleaned), None)
    if timestamp_column:
        cleaned = cleaned.dropna(subset=[timestamp_column])
    before = len(cleaned)
    cleaned = cleaned.drop_duplicates()
    report["duplicates_removed"] = before - len(cleaned)
    invalid = pd.Series(False, index=cleaned.index)
    for column, (minimum, maximum) in NUMERIC_BOUNDS.items():
        if column in cleaned:
            numeric = pd.to_numeric(cleaned[column], errors="coerce")
            cleaned[column] = numeric
            invalid |= numeric.notna() & ((numeric < minimum) | (numeric > maximum))
    report["invalid_rows_removed"] = int(invalid.sum())
    cleaned = cleaned.loc[~invalid].reset_index(drop=True)
    report["missing_by_column"] = cleaned.isna().sum().astype(int).to_dict()
    report["output_rows"] = len(cleaned)
    return cleaned, report
