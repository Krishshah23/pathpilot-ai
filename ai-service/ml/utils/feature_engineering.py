"""
Feature engineering and preprocessing utilities for PathPilot AI models.

Provides shared preprocessing pipelines, feature extraction from raw resume
data, and utilities used by both training scripts and the runtime predictor.
"""

import numpy as np
import pandas as pd
from typing import Any
from sklearn.preprocessing import StandardScaler, LabelEncoder, OneHotEncoder
from sklearn.model_selection import train_test_split


SEED = 42

FEATURE_COLS_RESUME = [
    "education", "cgpa", "projects", "internships", "experience",
    "skills_count", "frontend_skills", "backend_skills", "database_skills",
    "cloud_skills", "ml_skills", "has_github", "has_linkedin",
    "resume_length", "certifications", "achievements", "ats_keywords",
    "action_verbs", "leadership", "open_source",
]

FEATURE_COLS_ATS = [
    "skills_count", "experience", "projects", "education", "ats_keywords",
    "action_verbs", "resume_length", "has_contact", "has_sections",
    "formatting_score", "frontend_skills", "backend_skills",
    "database_skills", "cloud_skills", "ml_skills",
]

FEATURE_COLS_CAREER = [
    "education", "cgpa", "experience", "projects", "internships",
    "skills_count", "frontend_skills", "backend_skills", "database_skills",
    "cloud_skills", "ml_skills", "certifications", "has_github",
    "has_linkedin", "resume_score",
]

FEATURE_COLS_ROLE = [
    "education", "experience", "projects", "skills_count",
    "frontend_skills", "backend_skills", "database_skills",
    "cloud_skills", "ml_skills",
]

FEATURE_COLS_INTERVIEW = [
    "education", "cgpa", "experience", "projects", "internships",
    "skills_count", "frontend_skills", "backend_skills", "database_skills",
    "cloud_skills", "ml_skills", "resume_score", "certifications",
    "has_github", "mock_interviews",
]

CAREER_LABELS = ["Beginner", "Intermediate", "Career Ready", "Advanced"]

ROLES = [
    "Backend Developer", "Frontend Developer", "Full Stack Developer",
    "Data Analyst", "ML Engineer", "AI Engineer", "DevOps Engineer",
    "Cloud Engineer", "Cybersecurity Analyst", "Software Engineer",
]


def load_and_clean(path: str, feature_cols: list[str], target_col: str) -> tuple[pd.DataFrame, pd.Series]:
    """Load CSV, drop NaN rows, return features and target."""
    df = pd.read_csv(path)
    df = df.dropna(subset=feature_cols + [target_col])
    X = df[feature_cols].copy()
    y = df[target_col].copy()
    return X, y


def split_data(
    X: pd.DataFrame, y: pd.Series, test_size: float = 0.2
) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """Stratified split for classification, random for regression."""
    is_classification = y.dtype == object or y.nunique() <= 20
    return train_test_split(
        X, y, test_size=test_size, random_state=SEED,
        stratify=y if is_classification else None,
    )


def scale_features(
    X_train: pd.DataFrame, X_test: pd.DataFrame
) -> tuple[np.ndarray, np.ndarray, StandardScaler]:
    """Fit StandardScaler on train, transform both."""
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)
    return X_train_s, X_test_s, scaler


def encode_labels(y_train: pd.Series, y_test: pd.Series) -> tuple[np.ndarray, np.ndarray, LabelEncoder]:
    """Encode string labels to integers."""
    le = LabelEncoder()
    y_train_e = le.fit_transform(y_train)
    y_test_e = le.transform(y_test)
    return y_train_e, y_test_e, le


def extract_resume_features(resume_data: dict[str, Any]) -> dict[str, float]:
    """
    Extract ML feature vector from a resume analysis payload.

    This is the RUNTIME feature extractor used by the prediction API.
    It takes the same structure returned by the resume parser and the
    user profile, and produces the numeric features expected by all models.
    """
    skills = resume_data.get("skills", [])
    projects = resume_data.get("projects", [])
    education_entries = resume_data.get("education", [])
    experience_entries = resume_data.get("experience", [])
    certifications = resume_data.get("certifications", [])
    contact = resume_data.get("contact", {})
    profile = resume_data.get("profile", {})

    # Skill category counts
    from ml.data.skills import SKILL_ALIASES
    from ml.services.career_analysis import normalize_skills

    all_skills = normalize_skills(skills + (profile.get("skills") or []))
    skill_set = {s.lower() for s in all_skills}

    frontend_kw = {"html", "css", "javascript", "react", "vue", "angular", "typescript", "next.js", "tailwind css", "redux", "bootstrap", "sass"}
    backend_kw = {"node.js", "express", "django", "flask", "fastapi", "spring boot", "graphql", "rest apis"}
    database_kw = {"mongodb", "postgresql", "mysql", "redis", "sqlite", "firebase", "oracle", "sql"}
    cloud_kw = {"docker", "kubernetes", "aws", "azure", "gcp", "ci/cd", "jenkins", "terraform", "linux", "nginx"}
    ml_kw = {"python", "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "machine learning", "deep learning", "nlp", "data analysis"}

    fe_count = sum(1 for s in skill_set if s in frontend_kw)
    be_count = sum(1 for s in skill_set if s in backend_kw)
    db_count = sum(1 for s in skill_set if s in database_kw)
    cl_count = sum(1 for s in skill_set if s in cloud_kw)
    ml_count = sum(1 for s in skill_set if s in ml_kw)

    # Education level (ordinal)
    edu_text = " ".join(education_entries).lower()
    if any(k in edu_text for k in ["phd", "ph.d", "doctorate"]):
        edu_level = 4
    elif any(k in edu_text for k in ["master", "m.tech", "mtech", "m.sc", "mca", "mba"]):
        edu_level = 3
    elif any(k in edu_text for k in ["bachelor", "b.tech", "btech", "b.e", "b.sc", "bca"]):
        edu_level = 2
    elif any(k in edu_text for k in ["diploma"]):
        edu_level = 1
    else:
        edu_level = 0

    # CGPA extraction
    import re
    cgpa = 0.0
    for entry in education_entries:
        m = re.search(r'(\d+\.?\d*)\s*/?\s*(?:10|cgpa|gpa|cpi)', entry, re.I)
        if m:
            cgpa = float(m.group(1))
            break
    if cgpa == 0:
        cgpa = float(profile.get("cgpa", 7.0))

    word_count = resume_data.get("wordCount", 400)
    health_score = resume_data.get("healthScore", 50)

    # Action verbs detection
    action_verbs_list = [
        "developed", "built", "designed", "implemented", "created", "led",
        "managed", "improved", "optimized", "automated", "launched",
        "deployed", "engineered", "delivered", "reduced", "increased",
    ]
    resume_text = resume_data.get("rawText", "").lower()
    action_count = sum(1 for v in action_verbs_list if v in resume_text)

    # ATS keywords approximation
    ats_kw = len(all_skills) + action_count

    return {
        "education": edu_level,
        "cgpa": round(cgpa, 2),
        "projects": len(projects),
        "internships": len([e for e in experience_entries if "intern" in e.lower()]) if experience_entries else 0,
        "experience": len(experience_entries),
        "skills_count": len(all_skills),
        "frontend_skills": fe_count,
        "backend_skills": be_count,
        "database_skills": db_count,
        "cloud_skills": cl_count,
        "ml_skills": ml_count,
        "has_github": int(bool(contact.get("github", False))),
        "has_linkedin": int(bool(contact.get("linkedin", False))),
        "resume_length": word_count,
        "certifications": len(certifications),
        "achievements": 0,
        "ats_keywords": ats_kw,
        "action_verbs": action_count,
        "leadership": int(any(k in resume_text for k in ["led", "managed", "team lead", "captain"])),
        "open_source": int("open source" in resume_text or "contributor" in resume_text),
        "has_contact": int(bool(contact.get("email", False) or contact.get("phone", False))),
        "has_sections": 1,
        "formatting_score": min(health_score / 10, 10),
        "resume_score": health_score,
        "mock_interviews": 0,
    }
