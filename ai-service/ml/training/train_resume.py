"""
Train Resume Score Prediction Model (Regression).

Algorithms: Random Forest, XGBoost, CatBoost
Target: resume_score (0-100)
Evaluation: MAE, RMSE, R², Feature Importance, SHAP
"""

import sys
import os
import json
import warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import cross_val_score
from xgboost import XGBRegressor
from catboost import CatBoostRegressor

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR.parent))

from ml.utils.feature_engineering import (
    FEATURE_COLS_RESUME, load_and_clean, split_data, scale_features, SEED,
)

DATASET_PATH = BASE_DIR / "datasets" / "resume_dataset.csv"
MODEL_DIR = BASE_DIR / "models" / "resume_score"
REPORT_DIR = BASE_DIR / "reports"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)


def evaluate_model(name: str, model, X_test, y_test) -> dict:
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2 = r2_score(y_test, preds)
    print(f"  {name:20s}  MAE={mae:.3f}  RMSE={rmse:.3f}  R²={r2:.4f}")
    return {"name": name, "mae": round(mae, 4), "rmse": round(rmse, 4), "r2": round(r2, 4)}


def plot_feature_importance(model, feature_names: list, save_path: Path) -> None:
    importances = model.feature_importances_
    idx = np.argsort(importances)[::-1]
    plt.figure(figsize=(10, 6))
    sns.barplot(x=importances[idx], y=[feature_names[i] for i in idx], palette="viridis")
    plt.title("Resume Score — Feature Importance")
    plt.xlabel("Importance")
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()


def plot_predictions(y_test, preds, save_path: Path) -> None:
    plt.figure(figsize=(8, 6))
    plt.scatter(y_test, preds, alpha=0.15, s=8, color="#4f46e5")
    plt.plot([0, 100], [0, 100], "r--", lw=1.5)
    plt.xlabel("Actual Score")
    plt.ylabel("Predicted Score")
    plt.title("Resume Score — Actual vs Predicted")
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()


def train() -> None:
    print("=" * 60)
    print("MODEL 1: Resume Score Prediction (Regression)")
    print("=" * 60)

    X, y = load_and_clean(str(DATASET_PATH), FEATURE_COLS_RESUME, "resume_score")
    X_train, X_test, y_train, y_test = split_data(X, y)
    X_train_s, X_test_s, scaler = scale_features(X_train, X_test)

    print(f"Training samples: {len(X_train)}, Test samples: {len(X_test)}")
    print(f"Target range: [{y.min():.1f}, {y.max():.1f}], Mean: {y.mean():.1f}")
    print()

    # Train models
    models = {
        "Random Forest": RandomForestRegressor(
            n_estimators=200, max_depth=15, min_samples_split=5,
            random_state=SEED, n_jobs=-1,
        ),
        "XGBoost": XGBRegressor(
            n_estimators=200, max_depth=8, learning_rate=0.1,
            random_state=SEED, n_jobs=-1, verbosity=0,
        ),
        "CatBoost": CatBoostRegressor(
            iterations=200, depth=8, learning_rate=0.1,
            random_seed=SEED, verbose=0,
        ),
    }

    results = []
    best_score = -np.inf
    best_model = None
    best_name = ""

    for name, model in models.items():
        if name == "CatBoost":
            model.fit(X_train, y_train)
            res = evaluate_model(name, model, X_test, y_test)
        else:
            model.fit(X_train_s, y_train)
            res = evaluate_model(name, model, X_test_s, y_test)
        results.append(res)

        if res["r2"] > best_score:
            best_score = res["r2"]
            best_model = model
            best_name = name

    print(f"\nBest model: {best_name} (R²={best_score:.4f})")

    # Cross validation on best
    if best_name == "CatBoost":
        cv_scores = cross_val_score(best_model, X_train, y_train, cv=5, scoring="r2")
    else:
        cv_scores = cross_val_score(best_model, X_train_s, y_train, cv=5, scoring="r2")
    print(f"5-Fold CV R²: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Save best model + scaler
    joblib.dump(best_model, MODEL_DIR / "model.pkl")
    joblib.dump(scaler, MODEL_DIR / "scaler.pkl")
    joblib.dump(FEATURE_COLS_RESUME, MODEL_DIR / "features.pkl")

    meta = {
        "model_name": "resume_score",
        "algorithm": best_name,
        "type": "regression",
        "features": FEATURE_COLS_RESUME,
        "target": "resume_score",
        "metrics": {k: v for r in results for k, v in r.items() if k != "name"},
        "best_metrics": {"r2": best_score, "cv_r2_mean": round(cv_scores.mean(), 4)},
        "results": results,
    }
    with open(MODEL_DIR / "metadata.json", "w") as f:
        json.dump(meta, f, indent=2)

    # Reports
    plot_feature_importance(
        best_model, FEATURE_COLS_RESUME, REPORT_DIR / "resume_feature_importance.png"
    )
    if best_name == "CatBoost":
        preds = best_model.predict(X_test)
    else:
        preds = best_model.predict(X_test_s)
    plot_predictions(y_test, preds, REPORT_DIR / "resume_predictions.png")

    print(f"\nModel saved to {MODEL_DIR}")
    print(f"Reports saved to {REPORT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    train()
