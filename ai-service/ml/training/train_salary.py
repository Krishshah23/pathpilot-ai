"""
Train Salary Prediction Model (Regression).

Algorithms: CatBoost, Random Forest, XGBoost
Target: salary_lpa (INR Lakhs Per Annum)
"""

import sys, warnings, json
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBRegressor
from catboost import CatBoostRegressor

warnings.filterwarnings("ignore")
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR.parent))

from ml.utils.feature_engineering import load_and_clean, split_data, scale_features, SEED

SALARY_FEATURES = ["education", "experience", "skills_count", "projects", "role_encoded", "location_encoded"]
DATASET_PATH = BASE_DIR / "datasets" / "salary_dataset.csv"
MODEL_DIR = BASE_DIR / "models" / "salary"
REPORT_DIR = BASE_DIR / "reports"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def evaluate_model(name, model, X_test, y_test):
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2 = r2_score(y_test, preds)
    print(f"  {name:20s}  MAE={mae:.3f}  RMSE={rmse:.3f}  R²={r2:.4f}")
    return {"name": name, "mae": round(mae, 4), "rmse": round(rmse, 4), "r2": round(r2, 4)}


def train():
    print("=" * 60)
    print("MODEL 6: Salary Prediction (Regression)")
    print("=" * 60)

    import pandas as pd
    df = pd.read_csv(str(DATASET_PATH))
    df = df.dropna()

    role_le = LabelEncoder()
    loc_le = LabelEncoder()
    df["role_encoded"] = role_le.fit_transform(df["role"])
    df["location_encoded"] = loc_le.fit_transform(df["location"])

    X = df[SALARY_FEATURES]
    y = df["salary_lpa"]

    X_train, X_test, y_train, y_test = split_data(X, y)
    X_train_s, X_test_s, scaler = scale_features(X_train, X_test)

    print(f"Training: {len(X_train)}, Test: {len(X_test)}")
    print(f"Salary range: [{y.min():.2f}, {y.max():.2f}] LPA")
    print()

    models = {
        "CatBoost": CatBoostRegressor(iterations=200, depth=8, learning_rate=0.1, random_seed=SEED, verbose=0),
        "Random Forest": RandomForestRegressor(n_estimators=200, max_depth=15, random_state=SEED, n_jobs=-1),
        "XGBoost": XGBRegressor(n_estimators=200, max_depth=8, learning_rate=0.1, random_state=SEED, n_jobs=-1, verbosity=0),
    }

    results = []
    best_r2 = -np.inf
    best_model = None
    best_name = ""

    for name, model in models.items():
        model.fit(X_train_s, y_train)
        res = evaluate_model(name, model, X_test_s, y_test)
        results.append(res)
        if res["r2"] > best_r2:
            best_r2 = res["r2"]
            best_model = model
            best_name = name

    print(f"\nBest model: {best_name} (R²={best_r2:.4f})")

    joblib.dump(best_model, MODEL_DIR / "model.pkl")
    joblib.dump(scaler, MODEL_DIR / "scaler.pkl")
    joblib.dump(role_le, MODEL_DIR / "role_encoder.pkl")
    joblib.dump(loc_le, MODEL_DIR / "location_encoder.pkl")
    joblib.dump(SALARY_FEATURES, MODEL_DIR / "features.pkl")

    meta = {"model_name": "salary_prediction", "algorithm": best_name, "type": "regression",
            "features": SALARY_FEATURES, "target": "salary_lpa",
            "best_metrics": {"r2": best_r2}, "results": results}
    with open(MODEL_DIR / "metadata.json", "w") as f:
        json.dump(meta, f, indent=2)

    preds = best_model.predict(X_test_s)
    plt.figure(figsize=(8, 6))
    plt.scatter(y_test, preds, alpha=0.1, s=8, color="#059669")
    plt.plot([y.min(), y.max()], [y.min(), y.max()], "r--", lw=1.5)
    plt.xlabel("Actual Salary (LPA)")
    plt.ylabel("Predicted Salary (LPA)")
    plt.title("Salary Prediction — Actual vs Predicted")
    plt.tight_layout()
    plt.savefig(REPORT_DIR / "salary_predictions.png", dpi=150)
    plt.close()

    print(f"\nModel saved to {MODEL_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    train()
