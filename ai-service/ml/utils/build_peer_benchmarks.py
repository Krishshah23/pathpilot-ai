"""
Generate peer benchmarks by partitioning the training dataset by predicted roles
and computing resume score percentiles.
"""

import sys
import json
import numpy as np
import pandas as pd
import joblib
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR.parent))

from ml.utils.feature_engineering import FEATURE_COLS_ROLE

def generate_benchmarks():
    print("Generating peer benchmarks...")
    
    # Load dataset
    dataset_path = BASE_DIR / "datasets" / "resume_dataset.csv"
    if not dataset_path.exists():
        print(f"Error: Dataset not found at {dataset_path}")
        return
        
    df = pd.read_csv(dataset_path)
    
    # Load role model and scaler
    role_model_dir = BASE_DIR / "models" / "role"
    model_path = role_model_dir / "model.pkl"
    scaler_path = role_model_dir / "scaler.pkl"
    le_path = role_model_dir / "label_encoder.pkl"
    
    if not (model_path.exists() and scaler_path.exists() and le_path.exists()):
        print("Error: Role model artifacts not found. Please train models first.")
        return
        
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    le = joblib.load(le_path)
    
    # Extract role features from resume dataset
    X_role = df[FEATURE_COLS_ROLE].copy()
    X_role_scaled = scaler.transform(X_role)
    
    # Predict roles for all training samples
    pred_indices = model.predict(X_role_scaled)
    predicted_roles = le.inverse_transform(pred_indices)
    
    df["predicted_role"] = predicted_roles
    
    # Compute percentiles and stats bucketed by role
    benchmarks = {}
    for role in le.classes_:
        role_df = df[df["predicted_role"] == role]
        if len(role_df) == 0:
            continue
            
        scores = sorted(role_df["resume_score"].tolist())
        percentiles = [float(np.percentile(scores, p)) for p in range(101)]
        
        benchmarks[role] = {
            "count": int(len(scores)),
            "mean": float(np.mean(scores)),
            "min": float(np.min(scores)),
            "max": float(np.max(scores)),
            "percentiles": percentiles
        }
        
    # Save to json
    output_path = BASE_DIR / "models" / "peer_benchmarks.json"
    with open(output_path, "w") as f:
        json.dump(benchmarks, f, indent=2)
        
    print(f"Peer benchmarks saved to {output_path}")

if __name__ == "__main__":
    generate_benchmarks()
