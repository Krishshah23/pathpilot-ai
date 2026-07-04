"""
Train Learning Path Model (Similarity-based).

Uses KNN + Cosine Similarity to recommend ordered skills to learn
based on current skills and target role. NOT a hardcoded roadmap.
"""

import sys, warnings, json
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import MultiLabelBinarizer, LabelEncoder

warnings.filterwarnings("ignore")
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR.parent))

from ml.utils.feature_engineering import SEED

DATASET_PATH = BASE_DIR / "datasets" / "learning_dataset.csv"
MODEL_DIR = BASE_DIR / "models" / "learning"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def train():
    print("=" * 60)
    print("MODEL 7: Learning Path (Similarity-based)")
    print("=" * 60)

    df = pd.read_csv(str(DATASET_PATH))
    df = df.dropna()

    # Parse pipe-separated skills into lists
    df["current_list"] = df["current_skills"].apply(lambda x: x.split("|") if isinstance(x, str) else [])
    df["learn_list"] = df["learning_path"].apply(lambda x: x.split("|") if isinstance(x, str) else [])

    # Binarize current skills
    mlb = MultiLabelBinarizer()
    skill_matrix = mlb.fit_transform(df["current_list"])

    # Encode target role
    role_le = LabelEncoder()
    role_encoded = role_le.fit_transform(df["target_role"])

    # Combine: [role_one_hot_style, skill_binary_vector]
    # Actually: use role as extra numeric feature for simplicity
    feature_matrix = np.column_stack([role_encoded, skill_matrix])

    # Fit KNN with cosine similarity
    knn = NearestNeighbors(n_neighbors=10, metric="cosine", algorithm="brute", n_jobs=-1)
    knn.fit(feature_matrix)

    # Save everything needed for inference
    joblib.dump(knn, MODEL_DIR / "model.pkl")
    joblib.dump(mlb, MODEL_DIR / "skill_binarizer.pkl")
    joblib.dump(role_le, MODEL_DIR / "role_encoder.pkl")
    joblib.dump(feature_matrix, MODEL_DIR / "feature_matrix.pkl")

    # Save the learning paths so we can look up neighbors' paths
    df[["target_role", "current_skills", "learning_path"]].to_csv(
        MODEL_DIR / "reference_data.csv", index=False
    )

    meta = {"model_name": "learning_path", "algorithm": "KNN + Cosine Similarity",
            "type": "similarity_search", "n_neighbors": 10,
            "n_skills": len(mlb.classes_), "n_samples": len(df)}
    with open(MODEL_DIR / "metadata.json", "w") as f:
        json.dump(meta, f, indent=2)

    # Quick validation
    sample_idx = 0
    sample = feature_matrix[sample_idx].reshape(1, -1)
    distances, indices = knn.kneighbors(sample)
    print(f"\nSample query: role={df.iloc[sample_idx]['target_role']}")
    print(f"  Current skills: {df.iloc[sample_idx]['current_skills'][:80]}...")
    print(f"  Nearest neighbor distances: {distances[0][:5].round(3)}")
    print(f"  Recommended path: {df.iloc[indices[0][1]]['learning_path']}")

    print(f"\nModel saved to {MODEL_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    train()
