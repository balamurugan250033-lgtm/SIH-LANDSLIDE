"""
Landslide Sentinel - ML Pipeline Configuration

All paths are relative to the project root. The pipeline is designed to work
with REAL historical data only. No synthetic or fabricated training data is
generated anywhere in this pipeline.
"""

import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
DATABASE_PATH = os.path.join(BACKEND_DIR, "landslide.db")
ML_DIR = os.path.join(PROJECT_ROOT, "ml")
REPORTS_DIR = os.path.join(ML_DIR, "reports")
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")

PREDICTION_WINDOW_HOURS = 6

RISK_LEVEL_THRESHOLDS = {
    "LOW": (0, 20),
    "WATCH": (21, 40),
    "MODERATE": (41, 60),
    "HIGH": (61, 80),
    "CRITICAL": (81, 100),
}

RISK_LEVELS = ["LOW", "WATCH", "MODERATE", "HIGH", "CRITICAL"]

NER_STATES = [
    "Arunachal Pradesh",
    "Assam",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Sikkim",
    "Tripura",
]

TARGET_COLUMN = "landslide_occurred"

PREFERRED_FEATURES = [
    "rainfall_1h", "rainfall_3h", "rainfall_6h", "rainfall_12h",
    "rainfall_24h", "rainfall_48h", "rainfall_72h", "rainfall_7d",
    "soil_moisture", "soil_moisture_1h_change", "soil_moisture_6h_change",
    "soil_moisture_24h_change", "slope", "elevation", "aspect", "curvature",
    "terrain_roughness", "soil_type", "geology", "land_cover",
    "vegetation_index", "forest_cover", "historical_landslide_count",
    "landslides_last_7d", "landslides_last_30d", "landslides_last_90d",
    "distance_to_previous_landslide", "ground_vibration", "water_level",
    "stream_level", "ground_movement", "latitude", "longitude", "state",
    "district", "location_id", "distance_to_road", "road_type",
    "distance_to_village", "distance_to_critical_infrastructure",
]

os.makedirs(REPORTS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)
