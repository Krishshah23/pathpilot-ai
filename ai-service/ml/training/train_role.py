"""
Train Role Recommendation Model (Multi-class Classification).

Algorithms: Random Forest, XGBoost, LightGBM
Target: recommended_role (10 classes)
"""

import sys, warnings, json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier

warnings.filterwarnings("ignore")
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR.parent))

from ml.utils.feature_engineering import FEATURE_COLS_ROLE, ROLES, load_and_clean, split_data, scale_features, SEED

DATASET_PATH = BASE_DIR / "datasets" / "role_dataset.csv"
MODEL_DIR = BASE_DIR / "models" / "role"
REPORT_DIR = BASE_DIR / "reports"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def evaluate_model(name, model, X_test, y_test):
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    f1 = f1_score(y_test, preds, average="weighted")
    print(f"  {name:20s}  Acc={acc:.4f}  F1={f1:.4f}")
    return {"name": name, "accuracy": round(acc, 4), "f1": round(f1, 4)}


def train():
    print("=" * 60)
    print("MODEL 4: Role Recommendation (Multi-class)")
    print("=" * 60)

    X, y = load_and_clean(str(DATASET_PATH), FEATURE_COLS_ROLE, "recommended_role")
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    y_enc_series = pd.Series(y_encoded)

    X_train, X_test, y_train, y_test = split_data(X, y_enc_series)
    X_train_s, X_test_s, scaler = scale_features(X_train, X_test)

    print(f"Training: {len(X_train)}, Test: {len(X_test)}")
    print(f"Roles: {list(le.classes_)}")
    print()

    models = {
        "Random Forest": RandomForestClassifier(n_estimators=200, max_depth=15, random_state=SEED, n_jobs=-1),
        "XGBoost": XGBClassifier(n_estimators=200, max_depth=10, learning_rate=0.1, random_state=SEED, n_jobs=-1, verbosity=0, eval_metric="mlogloss"),
        "LightGBM": LGBMClassifier(n_estimators=200, max_depth=10, learning_rate=0.1, random_state=SEED, n_jobs=-1, verbose=-1),
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
    joblib.dump(le, MODEL_DIR / "label_encoder.pkl")
    joblib.dump(FEATURE_COLS_ROLE, MODEL_DIR / "features.pkl")

    meta = {"model_name": "role_recommendation", "algorithm": best_name, "type": "multiclass",
            "features": FEATURE_COLS_ROLE, "labels": list(le.classes_),
            "best_metrics": {"f1": best_f1, "cv_f1_mean": round(cv.mean(), 4)}, "results": results}
    with open(MODEL_DIR / "metadata.json", "w") as f:
        json.dump(meta, f, indent=2)

    # Confusion matrix
    preds = best_model.predict(X_test_s)
    cm = confusion_matrix(y_test, preds)
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Greens",
                xticklabels=le.classes_, yticklabels=le.classes_)
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.title("Role Recommendation — Confusion Matrix")
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    plt.savefig(REPORT_DIR / "role_confusion_matrix.png", dpi=150)
    plt.close()

    print(f"\nModel saved to {MODEL_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    import pandas as pd
    train()
