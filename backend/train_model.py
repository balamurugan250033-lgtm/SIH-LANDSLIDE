import os
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split

def generate_physical_data(n_samples=5000, random_seed=42):
    np.random.seed(random_seed)
    
    # Generate realistic physical indicators
    # Slope angle in degrees (5 to 50)
    slope_angle = np.random.uniform(5, 50, n_samples)
    
    # Soil moisture in percent (10% to 100%)
    soil_moisture_percent = np.random.uniform(10, 100, n_samples)
    
    # Daily rainfall in mm (0 to 300)
    rainfall_mm = np.random.uniform(0, 300, n_samples)
    
    # Calculate a simplified landslide susceptibility score based on geological principles
    # 1. Slope stability: steeper slopes are inherently less stable.
    # 2. Pore water pressure: higher soil moisture reduces friction.
    # 3. Rainfall triggers: heavy rainfall saturates soil rapidly.
    # Index = (slope/10)^1.5 + (rainfall * soil_moisture / 1000) * (slope/20) + (soil_moisture/50)^2
    hazard_index = (
        (slope_angle / 15.0) ** 1.8 +
        (rainfall_mm * soil_moisture_percent / 2000.0) * (slope_angle / 25.0) +
        (soil_moisture_percent / 60.0) ** 1.5
    )
    
    # Map to probability via sigmoid
    # Midpoint of hazard index is calibrated to around 4.5 for high risk
    probability = 1.0 / (1.0 + np.exp(-(hazard_index - 4.5)))
    
    # Add random geological noise (unobserved features like local soil structure, vegetation)
    noise = np.random.normal(0, 0.15, n_samples)
    final_prob = np.clip(probability + noise, 0, 1)
    
    # Binary label: 1 if landslide occurred, 0 otherwise
    landslide_occurred = (final_prob > 0.5).astype(int)
    
    df = pd.DataFrame({
        "rainfall_mm": rainfall_mm,
        "soil_moisture_percent": soil_moisture_percent,
        "slope_angle": slope_angle,
        "label": landslide_occurred
    })
    
    print(f"Generated {n_samples} training samples.")
    print(f"Positive classes (landslide occurred): {df['label'].sum()} ({df['label'].mean()*100:.2f}%)")
    return df

def train_xgb_model():
    df = generate_physical_data()
    
    X = df[["rainfall_mm", "soil_moisture_percent", "slope_angle"]]
    y = df["label"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_seed=42) if "random_seed" in train_test_split.__code__.co_varnames else train_test_split(X, y, test_size=0.2, random_state=42)
    
    # DMatrix conversion
    dtrain = xgb.DMatrix(X_train, label=y_train)
    dtest = xgb.DMatrix(X_test, label=y_test)
    
    # Hyperparameters for booster
    params = {
        "objective": "binary:logistic",
        "eval_metric": "logloss",
        "max_depth": 4,
        "eta": 0.1,
        "seed": 42
    }
    
    print("Training XGBoost Booster model...")
    evallist = [(dtest, "eval"), (dtrain, "train")]
    num_round = 80
    bst = xgb.train(params, dtrain, num_round, evallist, verbose_eval=10)
    
    # Target directory
    target_dir = os.path.join(os.path.dirname(__file__), "app", "ml")
    os.makedirs(target_dir, exist_ok=True)
    model_path = os.path.join(target_dir, "xgb_risk_model.json")
    
    bst.save_model(model_path)
    print(f"Model saved successfully to {model_path}")
    
    # Test loading
    test_bst = xgb.Booster()
    test_bst.load_model(model_path)
    print("Verification: Model loaded successfully from disk.")

if __name__ == "__main__":
    train_xgb_model()
