"""
Train Interview Probability Model (Regression).

Algorithms: Random Forest, Gradient Boosting, XGBoost
Target: interview_probability (0-100)
"""

import sys, warnings, json
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import cross_val_score
from xgboost import XGBRegressor

warnings.filterwarnings("ignore")
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR.parent))

from ml.utils.feature_engineering import FEATURE_COLS_INTERVIEW, load_and_clean, split_data, scale_features, SEED

DATASET_PATH = BASE_DIR / "datasets" / "interview_dataset.csv"
MODEL_DIR = BASE_DIR / "models" / "interview"
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
    print("MODEL 5: Interview Probability (Regression)")
    print("=" * 60)

    X, y = load_and_clean(str(DATASET_PATH), FEATURE_COLS_INTERVIEW, "interview_probability")
    X_train, X_test, y_train, y_test = split_data(X, y)
    X_train_s, X_test_s, scaler = scale_features(X_train, X_test)

    print(f"Training: {len(X_train)}, Test: {len(X_test)}")
    print()

    models = {
        "Random Forest": RandomForestRegressor(n_estimators=200, max_depth=15, random_state=SEED, n_jobs=-1),
        "Gradient Boosting": GradientBoostingRegressor(n_estimators=200, max_depth=8, learning_rate=0.1, random_state=SEED),
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
    joblib.dump(FEATURE_COLS_INTERVIEW, MODEL_DIR / "features.pkl")

    meta = {"model_name": "interview_probability", "algorithm": best_name, "type": "regression",
            "features": FEATURE_COLS_INTERVIEW, "target": "interview_probability",
            "best_metrics": {"r2": best_r2}, "results": results}
    with open(MODEL_DIR / "metadata.json", "w") as f:
        json.dump(meta, f, indent=2)

    preds = best_model.predict(X_test_s)
    plt.figure(figsize=(8, 6))
    plt.scatter(y_test, preds, alpha=0.1, s=8, color="#d97706")
    plt.plot([0, 100], [0, 100], "r--", lw=1.5)
    plt.xlabel("Actual Probability")
    plt.ylabel("Predicted Probability")
    plt.title("Interview Probability — Actual vs Predicted")
    plt.tight_layout()
    plt.savefig(REPORT_DIR / "interview_predictions.png", dpi=150)
    plt.close()

    print(f"\nModel saved to {MODEL_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    train()
