"""
Train Career Readiness Model (Multi-class Classification).

Algorithms: Random Forest, LightGBM, CatBoost
Target: readiness_level (0=Beginner, 1=Intermediate, 2=Career Ready, 3=Advanced)
Evaluation: Accuracy, Precision, Recall, F1
"""

import sys, warnings, json
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
from sklearn.model_selection import cross_val_score
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier

warnings.filterwarnings("ignore")
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR.parent))

from ml.utils.feature_engineering import FEATURE_COLS_CAREER, CAREER_LABELS, load_and_clean, split_data, scale_features, SEED

DATASET_PATH = BASE_DIR / "datasets" / "career_dataset.csv"
MODEL_DIR = BASE_DIR / "models" / "career"
REPORT_DIR = BASE_DIR / "reports"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def evaluate_model(name, model, X_test, y_test):
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    prec = precision_score(y_test, preds, average="weighted")
    rec = recall_score(y_test, preds, average="weighted")
    f1 = f1_score(y_test, preds, average="weighted")
    print(f"  {name:20s}  Acc={acc:.4f}  Prec={prec:.4f}  Rec={rec:.4f}  F1={f1:.4f}")
    return {"name": name, "accuracy": round(acc, 4), "precision": round(prec, 4),
            "recall": round(rec, 4), "f1": round(f1, 4)}


def train():
    print("=" * 60)
    print("MODEL 3: Career Readiness (Multi-class)")
    print("=" * 60)

    X, y = load_and_clean(str(DATASET_PATH), FEATURE_COLS_CAREER, "readiness_level")
    X_train, X_test, y_train, y_test = split_data(X, y)
    X_train_s, X_test_s, scaler = scale_features(X_train, X_test)

    print(f"Training: {len(X_train)}, Test: {len(X_test)}")
    print(f"Classes: {sorted(y.unique())}")
    print()

    models = {
        "Random Forest": RandomForestClassifier(n_estimators=200, max_depth=15, random_state=SEED, n_jobs=-1),
        "LightGBM": LGBMClassifier(n_estimators=200, max_depth=10, learning_rate=0.1, random_state=SEED, n_jobs=-1, verbose=-1),
        "CatBoost": CatBoostClassifier(iterations=200, depth=8, learning_rate=0.1, random_seed=SEED, verbose=0),
    }

    results = []
    best_f1 = -1
    best_model = None
    best_name = ""

    for name, model in models.items():
        model.fit(X_train_s, y_train)
        res = evaluate_model(name, model, X_test_s, y_test)
        results.append(res)
        if res["f1"] > best_f1:
            best_f1 = res["f1"]
            best_model = model
            best_name = name

    print(f"\nBest model: {best_name} (F1={best_f1:.4f})")

    cv = cross_val_score(best_model, X_train_s, y_train, cv=5, scoring="f1_weighted")
    print(f"5-Fold CV F1: {cv.mean():.4f} ± {cv.std():.4f}")

    joblib.dump(best_model, MODEL_DIR / "model.pkl")
    joblib.dump(scaler, MODEL_DIR / "scaler.pkl")
    joblib.dump(FEATURE_COLS_CAREER, MODEL_DIR / "features.pkl")
    joblib.dump(CAREER_LABELS, MODEL_DIR / "labels.pkl")

    meta = {"model_name": "career_readiness", "algorithm": best_name, "type": "multiclass",
            "features": FEATURE_COLS_CAREER, "labels": CAREER_LABELS,
            "best_metrics": {"f1": best_f1, "cv_f1_mean": round(cv.mean(), 4)}, "results": results}
    with open(MODEL_DIR / "metadata.json", "w") as f:
        json.dump(meta, f, indent=2)

    # Confusion matrix
    preds = best_model.predict(X_test_s)
    cm = confusion_matrix(y_test, preds)
    plt.figure(figsize=(7, 6))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Purples", xticklabels=CAREER_LABELS, yticklabels=CAREER_LABELS)
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.title("Career Readiness — Confusion Matrix")
    plt.tight_layout()
    plt.savefig(REPORT_DIR / "career_confusion_matrix.png", dpi=150)
    plt.close()

    print(f"\nModel saved to {MODEL_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    train()
