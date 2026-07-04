"""
Train ATS Pass Predictor (Binary Classification).

Algorithms: Logistic Regression, Random Forest, XGBoost
Target: ats_pass (0/1)
Evaluation: Accuracy, Precision, Recall, ROC AUC, Confusion Matrix
"""

import sys
import warnings
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, roc_auc_score,
    confusion_matrix, roc_curve, classification_report,
)
from sklearn.model_selection import cross_val_score
from xgboost import XGBClassifier

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR.parent))

from ml.utils.feature_engineering import (
    FEATURE_COLS_ATS, load_and_clean, split_data, scale_features, SEED,
)

DATASET_PATH = BASE_DIR / "datasets" / "ats_dataset.csv"
MODEL_DIR = BASE_DIR / "models" / "ats"
REPORT_DIR = BASE_DIR / "reports"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)


def evaluate_model(name: str, model, X_test, y_test) -> dict:
    preds = model.predict(X_test)
    proba = model.predict_proba(X_test)[:, 1]
    acc = accuracy_score(y_test, preds)
    prec = precision_score(y_test, preds)
    rec = recall_score(y_test, preds)
    auc = roc_auc_score(y_test, proba)
    print(f"  {name:20s}  Acc={acc:.4f}  Prec={prec:.4f}  Rec={rec:.4f}  AUC={auc:.4f}")
    return {"name": name, "accuracy": round(acc, 4), "precision": round(prec, 4),
            "recall": round(rec, 4), "roc_auc": round(auc, 4)}


def plot_confusion(y_test, preds, save_path: Path) -> None:
    cm = confusion_matrix(y_test, preds)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=["Reject", "Pass"], yticklabels=["Reject", "Pass"])
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.title("ATS Pass — Confusion Matrix")
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()


def plot_roc(y_test, proba, save_path: Path) -> None:
    fpr, tpr, _ = roc_curve(y_test, proba)
    auc = roc_auc_score(y_test, proba)
    plt.figure(figsize=(7, 5))
    plt.plot(fpr, tpr, color="#4f46e5", lw=2, label=f"AUC = {auc:.3f}")
    plt.plot([0, 1], [0, 1], "k--", lw=1)
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ATS Pass — ROC Curve")
    plt.legend()
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()


def train() -> None:
    print("=" * 60)
    print("MODEL 2: ATS Pass Predictor (Binary Classification)")
    print("=" * 60)

    X, y = load_and_clean(str(DATASET_PATH), FEATURE_COLS_ATS, "ats_pass")
    X_train, X_test, y_train, y_test = split_data(X, y)
    X_train_s, X_test_s, scaler = scale_features(X_train, X_test)

    print(f"Training: {len(X_train)}, Test: {len(X_test)}")
    print(f"Class distribution: {dict(y.value_counts())}")
    print()

    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=SEED),
        "Random Forest": RandomForestClassifier(
            n_estimators=200, max_depth=12, random_state=SEED, n_jobs=-1,
        ),
        "XGBoost": XGBClassifier(
            n_estimators=200, max_depth=8, learning_rate=0.1,
            random_state=SEED, n_jobs=-1, verbosity=0, eval_metric="logloss",
        ),
    }

    results = []
    best_auc = -np.inf
    best_model = None
    best_name = ""

    for name, model in models.items():
        model.fit(X_train_s, y_train)
        res = evaluate_model(name, model, X_test_s, y_test)
        results.append(res)
        if res["roc_auc"] > best_auc:
            best_auc = res["roc_auc"]
            best_model = model
            best_name = name

    print(f"\nBest model: {best_name} (AUC={best_auc:.4f})")

    cv_scores = cross_val_score(best_model, X_train_s, y_train, cv=5, scoring="roc_auc")
    print(f"5-Fold CV AUC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    joblib.dump(best_model, MODEL_DIR / "model.pkl")
    joblib.dump(scaler, MODEL_DIR / "scaler.pkl")
    joblib.dump(FEATURE_COLS_ATS, MODEL_DIR / "features.pkl")

    meta = {
        "model_name": "ats_pass",
        "algorithm": best_name,
        "type": "binary_classification",
        "features": FEATURE_COLS_ATS,
        "target": "ats_pass",
        "best_metrics": {"roc_auc": best_auc, "cv_auc_mean": round(cv_scores.mean(), 4)},
        "results": results,
    }
    with open(MODEL_DIR / "metadata.json", "w") as f:
        json.dump(meta, f, indent=2)

    preds = best_model.predict(X_test_s)
    proba = best_model.predict_proba(X_test_s)[:, 1]
    plot_confusion(y_test, preds, REPORT_DIR / "ats_confusion_matrix.png")
    plot_roc(y_test, proba, REPORT_DIR / "ats_roc_curve.png")

    print(f"\nModel saved to {MODEL_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    train()
