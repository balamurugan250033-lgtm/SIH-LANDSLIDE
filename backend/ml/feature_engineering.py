"""Leakage-aware feature construction for environmental observations."""
from __future__ import annotations

import pandas as pd

BASE_FEATURES = ["rainfall_mm", "soil_moisture_percent", "slope_angle", "latitude", "longitude"]


def build_features(observations: pd.DataFrame) -> pd.DataFrame:
    frame = observations.copy()
    if "timestamp" in frame:
        frame["timestamp"] = pd.to_datetime(frame["timestamp"], utc=True, errors="coerce")
        frame = frame.sort_values(["region_id", "timestamp"] if "region_id" in frame else ["timestamp"])
        if "rainfall_mm" in frame:
            grouped = frame.groupby("region_id", dropna=False)["rainfall_mm"] if "region_id" in frame else None
            if grouped is not None:
                for hours in (1, 3, 6, 24, 48, 72):
                    frame[f"rainfall_{hours}h"] = grouped.rolling(f"{hours}h", on=frame.loc[grouped.obj.index, "timestamp"]).sum().reset_index(level=0, drop=True)
    for feature in BASE_FEATURES:
        if feature not in frame:
            frame[feature] = pd.NA
    return frame


def feature_columns(frame: pd.DataFrame) -> list[str]:
    preferred = [
        "rainfall_mm", "rainfall_1h", "rainfall_3h", "rainfall_6h", "rainfall_24h",
        "rainfall_48h", "rainfall_72h", "soil_moisture_percent", "slope_angle",
        "elevation", "aspect", "curvature", "terrain_roughness", "latitude", "longitude",
    ]
    return [column for column in preferred if column in frame.columns]
