"""
ML Prediction Service — loads trained models and runs inference.

Loaded ONCE at Django startup. All endpoints call these functions
for real-time predictions. No retraining at runtime.
"""

import logging
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"

# ── Model cache (loaded once) ────────────────────────────────────────

_cache: dict[str, Any] = {}


def _load(model_name: str, filename: str = "model.pkl") -> Any:
    """Load and cache a model artifact."""
    key = f"{model_name}/{filename}"
    if key not in _cache:
        path = MODELS_DIR / model_name / filename
        if not path.exists():
            logger.warning("Model artifact not found: %s", path)
            return None
        _cache[key] = joblib.load(path)
        logger.info("Loaded %s", key)
    return _cache[key]


def _get_model(name: str):
    return _load(name, "model.pkl")


def _get_scaler(name: str):
    return _load(name, "scaler.pkl")


def _get_features(name: str):
    return _load(name, "features.pkl")


def models_loaded() -> bool:
    """Check if core models are available."""
    return (_get_model("resume_score") is not None
            and _get_model("ats") is not None
            and _get_model("career") is not None)


# ── Feature extraction ────────────────────────────────────────────────

def _build_feature_row(features: dict, feature_cols: list) -> np.ndarray:
    """Build a single-row DataFrame from a feature dict, fill missing with 0."""
    row = {col: features.get(col, 0) for col in feature_cols}
    return pd.DataFrame([row])[feature_cols]


# ── Confidence computation helpers ────────────────────────────────────

def _classifier_confidence(proba: np.ndarray) -> dict:
    """Compute confidence from a classifier's predict_proba output.
    
    Uses the spread between the top-1 and top-2 probabilities.
    A wide spread means the model is decisive → high confidence.
    """
    sorted_probs = sorted(proba, reverse=True)
    max_prob = sorted_probs[0]
    second_prob = sorted_probs[1] if len(sorted_probs) > 1 else 0
    spread = max_prob - second_prob  # 0..1

    # Map spread to a 0-100 confidence score.
    score = int(round(min(100, spread * 100 + max_prob * 30)))

    if score >= 70:
        tier = "high"
        reason = f"based on decisive probability distribution ({max_prob:.0%} top class)"
    elif score >= 40:
        tier = "moderate"
        reason = f"moderate separation between classes ({spread:.0%} spread)"
    else:
        tier = "low"
        reason = f"uncertain — classes are closely separated ({spread:.0%} spread)"

    return {"tier": tier, "score": score, "reason": reason}


def _regressor_confidence(features: dict, key_features: list) -> dict:
    """Estimate confidence for regressors based on feature-space density.
    
    Heuristic: the more key features are non-zero (i.e. the more data we have
    about this student), the more confident the prediction.
    """
    filled = sum(1 for f in key_features if features.get(f, 0) != 0)
    total = max(len(key_features), 1)
    density = filled / total
    score = int(round(density * 100))

    if score >= 70:
        tier = "high"
        reason = f"based on {filled}/{total} profile signals available"
    elif score >= 40:
        tier = "moderate"
        reason = f"limited data — {filled}/{total} profile signals available"
    else:
        tier = "low"
        reason = f"sparse profile data — only {filled}/{total} signals available"

    return {"tier": tier, "score": score, "reason": reason}


def _knn_confidence(distances: np.ndarray) -> dict:
    """Compute confidence for KNN-based predictions using neighbor distance.
    
    Closer neighbors → higher confidence.
    """
    avg_dist = float(np.mean(distances[0])) if distances.size > 0 else 999
    # Normalize: distances typically range 0-10+. Lower = better.
    # Use an inverse sigmoid-style mapping.
    score = int(round(max(0, min(100, 100 / (1 + avg_dist * 0.5)))))

    if score >= 60:
        tier = "high"
        reason = f"close match to {len(distances[0])} similar profiles (avg distance: {avg_dist:.1f})"
    elif score >= 35:
        tier = "moderate"
        reason = f"moderate match to reference profiles (avg distance: {avg_dist:.1f})"
    else:
        tier = "low"
        reason = f"limited similar profiles found (avg distance: {avg_dist:.1f})"

    return {"tier": tier, "score": score, "reason": reason}


# ── Individual model predictions ──────────────────────────────────────

def predict_resume_score(features: dict) -> dict:
    """Predict resume score (0-100)."""
    model = _get_model("resume_score")
    scaler = _get_scaler("resume_score")
    cols = _get_features("resume_score")
    if not model or not cols:
        return {"score": 0, "error": "Resume score model not loaded"}

    X = _build_feature_row(features, cols)
    # CatBoost doesn't need scaling
    try:
        score = float(model.predict(X)[0])
    except Exception:
        X_s = scaler.transform(X) if scaler else X
        score = float(model.predict(X_s)[0])
    score = max(0, min(100, int(round(score))))

    # Confidence: based on how many key features are present
    key_feats = ["skills_count", "projects", "experience", "education",
                 "has_github", "has_linkedin", "certifications", "resume_length"]
    confidence = _regressor_confidence(features, key_feats)

    return {"score": score, "confidence": confidence}


def predict_ats(features: dict) -> dict:
    """Predict ATS pass/reject with probability."""
    model = _get_model("ats")
    scaler = _get_scaler("ats")
    cols = _get_features("ats")
    if not model or not scaler or not cols:
        return {"pass": False, "probability": 0, "error": "ATS model not loaded"}

    X = _build_feature_row(features, cols)
    X_s = scaler.transform(X)
    pred = int(model.predict(X_s)[0])
    proba = model.predict_proba(X_s)[0]
    pass_prob = float(proba[1])

    confidence = _classifier_confidence(proba)

    return {"pass": bool(pred), "probability": int(round(pass_prob * 100)), "confidence": confidence}


def predict_career_readiness(features: dict) -> dict:
    """Predict career readiness level."""
    model = _get_model("career")
    scaler = _get_scaler("career")
    cols = _get_features("career")
    labels = _load("career", "labels.pkl") or ["Beginner", "Intermediate", "Career Ready", "Advanced"]
    if not model or not scaler or not cols:
        return {"level": "Unknown", "error": "Career model not loaded"}

    X = _build_feature_row(features, cols)
    X_s = scaler.transform(X)
    pred_idx = int(np.ravel(model.predict(X_s))[0])
    proba = model.predict_proba(X_s)[0]
    level = labels[pred_idx] if pred_idx < len(labels) else "Unknown"
    pred_confidence = int(round(float(proba[pred_idx]) * 100))

    confidence = _classifier_confidence(proba)

    return {"level": level, "levelIndex": pred_idx, "confidence": pred_confidence,
            "confidenceTag": confidence}


def predict_role(features: dict, target_role: str = None) -> dict:
    """Recommend best role."""
    model = _get_model("role")
    scaler = _get_scaler("role")
    cols = _get_features("role")
    le = _load("role", "label_encoder.pkl")
    if not model or not scaler or not cols or not le:
        return {"role": "Software Engineer", "error": "Role model not loaded"}

    X = _build_feature_row(features, cols)
    X_s = scaler.transform(X)
    pred_idx = int(np.ravel(model.predict(X_s))[0])
    role = le.inverse_transform([pred_idx])[0]

    proba = model.predict_proba(X_s)[0]
    top3_idx = np.argsort(proba)[::-1][:3]
    top3 = [
        {"role": le.inverse_transform([i])[0], "probability": int(round(float(proba[i]) * 100))}
        for i in top3_idx
    ]

    target_fit = 0.0
    if target_role:
        target_role_lower = target_role.lower().strip()
        for idx, cls_name in enumerate(le.classes_):
            cls_lower = cls_name.lower().strip()
            if cls_lower == target_role_lower or cls_lower.replace(" ", "") == target_role_lower.replace(" ", ""):
                target_fit = int(round(float(proba[idx]) * 100))
                break

        confidence = _classifier_confidence(proba)

        return {"role": role, "confidence": int(round(float(proba[pred_idx]) * 100)),
            "confidenceTag": confidence, "top3": top3, "roleFitScore": target_fit}


def predict_interview(features: dict) -> dict:
    """Predict interview success probability."""
    model = _get_model("interview")
    scaler = _get_scaler("interview")
    cols = _get_features("interview")
    if not model or not scaler or not cols:
        return {"probability": 0, "error": "Interview model not loaded"}

    X = _build_feature_row(features, cols)
    X_s = scaler.transform(X)
    prob = float(model.predict(X_s)[0])
    prob = max(0, min(100, int(round(prob))))

    key_feats = ["skills_count", "projects", "internships", "experience",
                 "certifications", "cgpa"]
    confidence = _regressor_confidence(features, key_feats)

    return {"probability": prob, "confidence": confidence}


def predict_salary(features: dict) -> dict:
    """Predict expected salary (LPA)."""
    model = _get_model("salary")
    scaler = _get_scaler("salary")
    cols = _get_features("salary")
    role_enc = _load("salary", "role_encoder.pkl")
    loc_enc = _load("salary", "location_encoder.pkl")
    if not model or not scaler or not cols:
        return {"salary": 0, "error": "Salary model not loaded"}

    # Encode role and location
    role = features.get("role", "Software Engineer")
    location = features.get("location", "Bangalore")
    try:
        features["role_encoded"] = int(role_enc.transform([role])[0])
    except (ValueError, KeyError):
        features["role_encoded"] = 0
    try:
        features["location_encoded"] = int(loc_enc.transform([location])[0])
    except (ValueError, KeyError):
        features["location_encoded"] = 0

    X = _build_feature_row(features, cols)
    X_s = scaler.transform(X)
    salary = float(model.predict(X_s)[0])
    salary = max(2.5, round(salary, 2))

    key_feats = ["skills_count", "projects", "experience", "education",
                 "certifications", "internships"]
    confidence = _regressor_confidence(features, key_feats)

    return {"salaryLPA": salary, "salaryCurrency": "INR", "confidence": confidence}


def predict_learning_path(current_skills: list, target_role: str) -> dict:
    """Recommend learning path using KNN similarity search."""
    knn = _get_model("learning")
    mlb = _load("learning", "skill_binarizer.pkl")
    role_le = _load("learning", "role_encoder.pkl")
    ref_path = MODELS_DIR / "learning" / "reference_data.csv"

    if not knn or not mlb or not role_le or not ref_path.exists():
        return {"skills": [], "error": "Learning model not loaded"}

    ref_df = pd.read_csv(str(ref_path))

    try:
        role_encoded = int(role_le.transform([target_role])[0])
    except (ValueError, KeyError):
        role_encoded = 0

    skill_vector = mlb.transform([current_skills])
    query = np.column_stack([[role_encoded], skill_vector])

    distances, indices = knn.kneighbors(query)

    # Compute KNN confidence from neighbor distances
    confidence = _knn_confidence(distances)

    # Aggregate learning paths from neighbors
    skill_votes: dict[str, int] = {}
    for idx in indices[0]:
        path_str = ref_df.iloc[idx]["learning_path"]
        if isinstance(path_str, str):
            for skill in path_str.split("|"):
                skill = skill.strip()
                if skill and skill not in current_skills:
                    skill_votes[skill] = skill_votes.get(skill, 0) + 1

    ordered = sorted(skill_votes.items(), key=lambda x: -x[1])
    skills_to_learn = [s for s, _ in ordered[:10]]

    return {"skills": skills_to_learn, "targetRole": target_role, "confidence": confidence}


# ── Feature importance (for explainability) ───────────────────────────

def get_feature_importance(model_name: str = "resume_score") -> list[dict]:
    """Return feature importance for a model."""
    model = _get_model(model_name)
    cols = _get_features(model_name)
    if not model or not cols:
        return []

    try:
        importances = model.feature_importances_
    except AttributeError:
        return []

    pairs = sorted(zip(cols, importances), key=lambda x: -x[1])
    return [{"feature": f, "importance": round(float(v), 4)} for f, v in pairs]


def _get_peer_benchmark_data(role_name: str, score: float) -> dict:
    import json
    path = BASE_DIR / "models" / "peer_benchmarks.json"
    benchmarks = None
    if path.exists():
        try:
            with open(path) as f:
                benchmarks = json.load(f)
        except Exception:
            logger.exception("Failed to load peer_benchmarks.json")

    if not benchmarks:
        logger.warning(
            "peer_benchmarks.json missing — returning isFallback=True (pct=50) "
            "for role=%s score=%.1f", role_name, score
        )
        return {
            "percentile": 50,
            "role": role_name,
            "mean": 70.0,
            "min": 40.0,
            "max": 100.0,
            "isFallback": True
        }

    if role_name not in benchmarks:
        # fallback to Software Engineer
        original_role = role_name
        role_name = "Software Engineer" if "Software Engineer" in benchmarks else list(benchmarks.keys())[0]
        logger.info("Role '%s' not in benchmarks — using '%s' as proxy", original_role, role_name)

    data = benchmarks[role_name]
    percentiles = data["percentiles"]  # a list of 101 float values (P0..P100)

    logger.debug(
        "Percentile computation: role=%s score=%.1f mean=%.1f "
        "P0=%.1f P50=%.1f P100=%.1f",
        role_name, score, data.get("mean", 0),
        percentiles[0], percentiles[50], percentiles[100]
    )

    # Binary boundary check first
    if score <= percentiles[0]:
        pct = 0.0
    elif score >= percentiles[100]:
        pct = 100.0
    else:
        # Linear interpolation: find the bracket [P_i, P_{i+1}] that contains score
        pct = None
        for i in range(100):
            lo, hi = percentiles[i], percentiles[i + 1]
            if lo <= score <= hi:
                span = hi - lo
                pct = float(i) if span == 0 else i + (score - lo) / span
                break

        if pct is None:
            # Should be unreachable for a well-formed distribution, but
            # guard against floating-point gaps at the boundaries.
            logger.warning(
                "No percentile bracket found for score=%.1f in role=%s — "
                "estimating from endpoints (was previously silently returning 50)",
                score, role_name
            )
            # Best estimate: linear interpolation between P0 and P100
            full_span = percentiles[100] - percentiles[0]
            pct = 0.0 if full_span == 0 else (score - percentiles[0]) / full_span * 100.0

    pct = max(0.0, min(100.0, pct))
    logger.debug("Final percentile for score=%.1f: %.1f", score, pct)

    return {
        "percentile": int(round(float(pct))),
        "role": role_name,
        "mean": round(data["mean"], 1),
        "min": round(data["min"], 1),
        "max": round(data["max"], 1),
        "isFallback": False
    }


# ── Full prediction pipeline ─────────────────────────────────────────

def predict_all(features: dict, current_skills: list, target_role: str) -> dict:
    """Run all models and return combined predictions."""
    resume = predict_resume_score(features)
    ats = predict_ats(features)
    career = predict_career_readiness(features)
    role = predict_role(features, target_role)
    interview = predict_interview(features)

    # For salary, need role recommendation
    salary_features = {**features, "role": role.get("role", target_role or "Software Engineer")}
    salary = predict_salary(salary_features)

    learning = predict_learning_path(current_skills, target_role or role.get("role", "Software Engineer"))
    importance = get_feature_importance("resume_score")

    # Real SHAP explanations
    from ml.services.explainer import explain_prediction
    shap_res = explain_prediction(
        "resume_score", features, _get_model("resume_score"),
        _get_scaler("resume_score"), _get_features("resume_score")
    )
    print("SHAP Result:", shap_res)

    if shap_res.get("success"):
        positive = [{"feature": c["feature"], "impact": c["impact"]} for c in shap_res.get("top_positive", [])]
        negative = [{"feature": c["feature"], "impact": c["impact"]} for c in shap_res.get("top_negative", [])]
    else:
        # Fallback to feature importance if SHAP fails
        positive = [{"feature": f["feature"], "impact": f["importance"]} for f in importance[:5] if features.get(f["feature"], 0) > 0]
        negative = [{"feature": f["feature"], "impact": -f["importance"] if f["importance"] > 0 else 0.0} for f in importance if features.get(f["feature"], 0) == 0][:3]

    role_for_benchmark = target_role or role.get("role", "Software Engineer")
    peer_benchmark = _get_peer_benchmark_data(role_for_benchmark, resume["score"])

    return {
        "resumeScore": resume["score"],
        "resumeScoreConfidence": resume.get("confidence"),
        "peerBenchmark": peer_benchmark,
        "atsProbability": ats["probability"],
        "atsPass": ats["pass"],
        "atsConfidence": ats.get("confidence"),
        "careerReadiness": career,
        "recommendedRole": role,
        "interviewProbability": interview["probability"],
        "interviewConfidence": interview.get("confidence"),
        "salaryPrediction": salary,
        "learningRoadmap": learning["skills"],
        "learningConfidence": learning.get("confidence"),
        "missingSkills": learning["skills"][:5],
        "featureImportance": importance[:10],
        "recommendations": _build_recommendations(features, career, role, learning),
        "explanations": {
            "topPositive": positive,
            "topNegative": negative,
            "shapRaw": shap_res.get("contributions", []) if shap_res.get("success") else [],
        },
    }


def _build_recommendations(features: dict, career: dict, role: dict, learning: dict) -> list[str]:
    """Generate actionable recommendations based on predictions."""
    recs = []
    if features.get("has_github", 0) == 0:
        recs.append("Add a GitHub profile to showcase your projects and code.")
    if features.get("has_linkedin", 0) == 0:
        recs.append("Create a LinkedIn profile to improve professional visibility.")
    if features.get("projects", 0) < 3:
        recs.append("Build 2-3 role-aligned projects to strengthen your portfolio.")
    if features.get("certifications", 0) == 0:
        recs.append("Earn at least one relevant certification to validate your skills.")
    if features.get("skills_count", 0) < 8:
        recs.append("Expand your skill set to at least 8-10 role-relevant skills.")
    if learning.get("skills"):
        top_skills = ", ".join(learning["skills"][:3])
        recs.append(f"Focus on learning: {top_skills}.")
    level = career.get("level", "")
    if level in ("Beginner", "Intermediate"):
        recs.append("Gain internship or project experience to move toward career readiness.")
    return recs[:6]

