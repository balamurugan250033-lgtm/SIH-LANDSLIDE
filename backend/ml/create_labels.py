"""Create forward-looking landslide labels from observed event records only."""
from __future__ import annotations

import pandas as pd


def attach_forward_labels(observations: pd.DataFrame, events: pd.DataFrame, window_hours: int = 6) -> pd.DataFrame:
    if events.empty:
        raise ValueError("No historical landslide events are available; refusing to invent labels")
    required = {"latitude", "longitude", "timestamp"}
    missing = required - set(events.columns)
    if missing:
        raise ValueError(f"Historical event table is missing required columns: {sorted(missing)}")
    observations = observations.copy()
    events = events.copy()
    observations["timestamp"] = pd.to_datetime(observations["timestamp"], utc=True, errors="coerce")
    events["timestamp"] = pd.to_datetime(events["timestamp"], utc=True, errors="coerce")
    observations["landslide_occurred"] = 0
    tolerance = pd.Timedelta(hours=window_hours)
    for index, observation in observations.iterrows():
        same_location = (events["latitude"] - observation["latitude"]).abs().le(0.05) & (events["longitude"] - observation["longitude"]).abs().le(0.05)
        future_event = events["timestamp"].ge(observation["timestamp"]) & events["timestamp"].le(observation["timestamp"] + tolerance)
        observations.loc[index, "landslide_occurred"] = int((same_location & future_event).any())
    return observations
