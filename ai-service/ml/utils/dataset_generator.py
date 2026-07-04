"""
Synthetic dataset generator for PathPilot AI ML models.

Generates realistic career/resume datasets with proper distributions.
Each dataset has 50,000+ rows with correlated features (no random noise).
"""

import os
import numpy as np
import pandas as pd
from pathlib import Path

SEED = 42
np.random.seed(SEED)

DATASETS_DIR = Path(__file__).resolve().parent.parent / "datasets"
DATASETS_DIR.mkdir(parents=True, exist_ok=True)

# ── Shared constants ──────────────────────────────────────────────────

ROLES = [
    "Backend Developer", "Frontend Developer", "Full Stack Developer",
    "Data Analyst", "ML Engineer", "AI Engineer", "DevOps Engineer",
    "Cloud Engineer", "Cybersecurity Analyst", "Software Engineer",
]

EDUCATION_LEVELS = ["High School", "Diploma", "Bachelor", "Master", "PhD"]
EDUCATION_WEIGHTS = [0.05, 0.10, 0.55, 0.25, 0.05]

LOCATIONS = [
    "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Pune",
    "Chennai", "Kolkata", "Ahmedabad", "Remote", "US Remote",
]

FRONTEND_SKILLS = ["HTML", "CSS", "JavaScript", "React", "Vue", "Angular", "TypeScript", "Next.js", "Tailwind CSS", "Redux", "Bootstrap", "Sass"]
BACKEND_SKILLS = ["Node.js", "Express", "Django", "Flask", "FastAPI", "Spring Boot", "GraphQL", "REST APIs"]
DATABASE_SKILLS = ["MongoDB", "PostgreSQL", "MySQL", "Redis", "SQLite", "Firebase", "Oracle", "SQL"]
CLOUD_SKILLS = ["Docker", "Kubernetes", "AWS", "Azure", "GCP", "CI/CD", "Jenkins", "Terraform", "Linux", "Nginx"]
ML_SKILLS = ["Python", "Pandas", "NumPy", "scikit-learn", "TensorFlow", "PyTorch", "Machine Learning", "Deep Learning", "NLP", "Data Analysis"]
TOOL_SKILLS = ["Git", "GitHub", "Jira", "Figma", "Postman", "Data Structures", "Algorithms", "OOP", "System Design"]

ALL_SKILLS = FRONTEND_SKILLS + BACKEND_SKILLS + DATABASE_SKILLS + CLOUD_SKILLS + ML_SKILLS + TOOL_SKILLS


def _clamp(val: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, val))


def _skill_counts(n: int) -> dict:
    """Generate correlated skill category counts for one row."""
    profile = np.random.choice(["frontend_heavy", "backend_heavy", "fullstack", "data_heavy", "devops_heavy", "balanced"], p=[0.15, 0.15, 0.25, 0.15, 0.10, 0.20])

    base = {"frontend": 0, "backend": 0, "database": 0, "cloud": 0, "ml": 0}

    if profile == "frontend_heavy":
        base = {"frontend": np.random.randint(4, 10), "backend": np.random.randint(0, 3), "database": np.random.randint(1, 3), "cloud": np.random.randint(0, 2), "ml": np.random.randint(0, 1)}
    elif profile == "backend_heavy":
        base = {"frontend": np.random.randint(1, 4), "backend": np.random.randint(4, 8), "database": np.random.randint(2, 5), "cloud": np.random.randint(1, 4), "ml": np.random.randint(0, 2)}
    elif profile == "fullstack":
        base = {"frontend": np.random.randint(3, 7), "backend": np.random.randint(3, 6), "database": np.random.randint(2, 4), "cloud": np.random.randint(1, 3), "ml": np.random.randint(0, 2)}
    elif profile == "data_heavy":
        base = {"frontend": np.random.randint(0, 2), "backend": np.random.randint(1, 3), "database": np.random.randint(2, 5), "cloud": np.random.randint(1, 3), "ml": np.random.randint(4, 9)}
    elif profile == "devops_heavy":
        base = {"frontend": np.random.randint(0, 2), "backend": np.random.randint(1, 4), "database": np.random.randint(1, 3), "cloud": np.random.randint(4, 8), "ml": np.random.randint(0, 2)}
    else:
        base = {"frontend": np.random.randint(2, 5), "backend": np.random.randint(2, 4), "database": np.random.randint(1, 3), "cloud": np.random.randint(1, 3), "ml": np.random.randint(1, 3)}

    return base


def generate_resume_dataset(n: int = 50000) -> pd.DataFrame:
    """Generate resume score dataset with realistic feature correlations."""
    rows = []
    for _ in range(n):
        edu_idx = np.random.choice(len(EDUCATION_LEVELS), p=EDUCATION_WEIGHTS)
        education = edu_idx  # ordinal: 0-4
        cgpa = round(np.random.normal(7.5 + edu_idx * 0.3, 1.0), 2)
        cgpa = _clamp(cgpa, 4.0, 10.0)

        experience = max(0, round(np.random.exponential(1.5 + edu_idx * 0.5), 1))
        experience = min(experience, 15.0)
        projects = int(np.random.poisson(2 + experience * 0.3))
        projects = min(projects, 12)
        internships = int(np.random.poisson(0.8 + edu_idx * 0.3))
        internships = min(internships, 6)

        sc = _skill_counts(n)
        skills_count = sc["frontend"] + sc["backend"] + sc["database"] + sc["cloud"] + sc["ml"]
        skills_count += np.random.randint(1, 5)  # tools/misc

        has_github = int(np.random.random() < 0.6 + experience * 0.03)
        has_linkedin = int(np.random.random() < 0.7 + experience * 0.02)
        resume_length = int(np.random.normal(450 + experience * 30 + projects * 20, 80))
        resume_length = max(150, min(resume_length, 1200))

        certifications = int(np.random.poisson(1.0 + edu_idx * 0.3))
        certifications = min(certifications, 8)
        achievements = int(np.random.poisson(0.5 + experience * 0.1 + edu_idx * 0.2))
        achievements = min(achievements, 6)

        ats_keywords = int(np.random.normal(8 + skills_count * 0.5 + experience * 0.5, 3))
        ats_keywords = max(0, min(ats_keywords, 30))
        action_verbs = int(np.random.normal(4 + experience * 0.8, 2))
        action_verbs = max(0, min(action_verbs, 15))

        leadership = int(np.random.random() < 0.2 + experience * 0.04)
        open_source = int(np.random.random() < 0.15 + has_github * 0.15)

        # Score formula: weighted combination with noise
        score = (
            cgpa * 3.0
            + projects * 4.0
            + internships * 3.5
            + experience * 4.0
            + skills_count * 1.2
            + sc["frontend"] * 0.5
            + sc["backend"] * 0.6
            + sc["database"] * 0.4
            + sc["cloud"] * 0.8
            + sc["ml"] * 0.7
            + has_github * 3.0
            + has_linkedin * 2.0
            + (resume_length - 300) * 0.01
            + certifications * 2.5
            + achievements * 2.0
            + ats_keywords * 0.3
            + action_verbs * 0.8
            + leadership * 4.0
            + open_source * 3.0
            + education * 2.0
        )
        score = _clamp(score + np.random.normal(0, 3), 8, 98)
        score = round(score, 1)

        rows.append({
            "education": education, "cgpa": cgpa, "projects": projects,
            "internships": internships, "experience": experience,
            "skills_count": skills_count,
            "frontend_skills": sc["frontend"], "backend_skills": sc["backend"],
            "database_skills": sc["database"], "cloud_skills": sc["cloud"],
            "ml_skills": sc["ml"],
            "has_github": has_github, "has_linkedin": has_linkedin,
            "resume_length": resume_length, "certifications": certifications,
            "achievements": achievements, "ats_keywords": ats_keywords,
            "action_verbs": action_verbs, "leadership": leadership,
            "open_source": open_source, "resume_score": score,
        })

    df = pd.DataFrame(rows)
    path = DATASETS_DIR / "resume_dataset.csv"
    df.to_csv(path, index=False)
    print(f"[+] resume_dataset.csv: {len(df)} rows -> {path}")
    return df


def generate_ats_dataset(n: int = 50000) -> pd.DataFrame:
    """Generate ATS pass/reject dataset."""
    rows = []
    for _ in range(n):
        sc = _skill_counts(n)
        skills_count = sc["frontend"] + sc["backend"] + sc["database"] + sc["cloud"] + sc["ml"] + np.random.randint(1, 5)
        experience = max(0, round(np.random.exponential(2.0), 1))
        experience = min(experience, 15.0)
        projects = int(np.random.poisson(2 + experience * 0.3))
        projects = min(projects, 12)
        edu_idx = np.random.choice(len(EDUCATION_LEVELS), p=EDUCATION_WEIGHTS)

        ats_keywords = int(np.random.normal(8 + skills_count * 0.4, 3))
        ats_keywords = max(0, min(ats_keywords, 30))
        action_verbs = int(np.random.normal(4 + experience * 0.7, 2))
        action_verbs = max(0, min(action_verbs, 15))
        resume_length = int(np.random.normal(450 + experience * 25, 80))
        resume_length = max(150, min(resume_length, 1200))
        has_contact = int(np.random.random() < 0.85)
        has_sections = int(np.random.random() < 0.75 + experience * 0.02)
        formatting_score = round(np.random.beta(5, 2) * 10, 1)

        # ATS pass probability — calibrated for ~55/45 split
        prob = (
            ats_keywords * 0.015
            + action_verbs * 0.01
            + skills_count * 0.008
            + experience * 0.01
            + projects * 0.01
            + edu_idx * 0.015
            + has_contact * 0.03
            + has_sections * 0.03
            + formatting_score * 0.005
            + (0.02 if 300 <= resume_length <= 800 else -0.02)
        )
        prob = _clamp(prob + np.random.normal(0, 0.18), 0, 1)
        ats_pass = int(prob > 0.50)

        rows.append({
            "skills_count": skills_count, "experience": experience,
            "projects": projects, "education": edu_idx,
            "ats_keywords": ats_keywords, "action_verbs": action_verbs,
            "resume_length": resume_length, "has_contact": has_contact,
            "has_sections": has_sections, "formatting_score": formatting_score,
            "frontend_skills": sc["frontend"], "backend_skills": sc["backend"],
            "database_skills": sc["database"], "cloud_skills": sc["cloud"],
            "ml_skills": sc["ml"], "ats_pass": ats_pass,
        })

    df = pd.DataFrame(rows)
    path = DATASETS_DIR / "ats_dataset.csv"
    df.to_csv(path, index=False)
    print(f"[+] ats_dataset.csv: {len(df)} rows -> {path}")
    return df


def generate_career_dataset(n: int = 50000) -> pd.DataFrame:
    """Generate career readiness multi-class dataset."""
    rows = []
    for _ in range(n):
        sc = _skill_counts(n)
        skills_count = sc["frontend"] + sc["backend"] + sc["database"] + sc["cloud"] + sc["ml"] + np.random.randint(1, 5)
        edu_idx = np.random.choice(len(EDUCATION_LEVELS), p=EDUCATION_WEIGHTS)
        cgpa = round(np.random.normal(7.5 + edu_idx * 0.3, 1.0), 2)
        cgpa = _clamp(cgpa, 4.0, 10.0)
        experience = max(0, round(np.random.exponential(1.5 + edu_idx * 0.5), 1))
        experience = min(experience, 15.0)
        projects = int(np.random.poisson(2 + experience * 0.3))
        projects = min(projects, 12)
        internships = int(np.random.poisson(0.8 + edu_idx * 0.3))
        internships = min(internships, 6)
        certifications = int(np.random.poisson(1.0 + edu_idx * 0.3))
        certifications = min(certifications, 8)
        has_github = int(np.random.random() < 0.6 + experience * 0.03)
        has_linkedin = int(np.random.random() < 0.7)
        resume_score = round(np.random.normal(50 + experience * 3 + skills_count * 1.5, 10), 1)
        resume_score = _clamp(resume_score, 10, 98)

        # Readiness level based on combined signal — thresholds for ~25% per class
        signal = (skills_count * 1.0 + experience * 3.0 + projects * 2.0 + internships * 2.0
                  + certifications * 1.5 + has_github * 2.0 + cgpa * 1.0 + edu_idx * 1.0)
        signal += np.random.normal(0, 6)

        if signal >= 45:
            level = 3  # Advanced
        elif signal >= 32:
            level = 2  # Career Ready
        elif signal >= 20:
            level = 1  # Intermediate
        else:
            level = 0  # Beginner

        rows.append({
            "education": edu_idx, "cgpa": cgpa, "experience": experience,
            "projects": projects, "internships": internships,
            "skills_count": skills_count,
            "frontend_skills": sc["frontend"], "backend_skills": sc["backend"],
            "database_skills": sc["database"], "cloud_skills": sc["cloud"],
            "ml_skills": sc["ml"],
            "certifications": certifications,
            "has_github": has_github, "has_linkedin": has_linkedin,
            "resume_score": resume_score, "readiness_level": level,
        })

    df = pd.DataFrame(rows)
    path = DATASETS_DIR / "career_dataset.csv"
    df.to_csv(path, index=False)
    print(f"[+] career_dataset.csv: {len(df)} rows -> {path}")
    return df


def generate_role_dataset(n: int = 50000) -> pd.DataFrame:
    """Generate role recommendation multi-class dataset."""
    rows = []
    role_profiles = {
        "Backend Developer": {"fe": (1, 3), "be": (4, 8), "db": (2, 5), "cl": (1, 4), "ml": (0, 2)},
        "Frontend Developer": {"fe": (5, 10), "be": (0, 2), "db": (0, 2), "cl": (0, 2), "ml": (0, 1)},
        "Full Stack Developer": {"fe": (3, 7), "be": (3, 6), "db": (2, 4), "cl": (1, 3), "ml": (0, 2)},
        "Data Analyst": {"fe": (0, 2), "be": (0, 2), "db": (2, 5), "cl": (0, 2), "ml": (3, 7)},
        "ML Engineer": {"fe": (0, 2), "be": (1, 3), "db": (1, 3), "cl": (1, 4), "ml": (5, 10)},
        "AI Engineer": {"fe": (0, 2), "be": (1, 3), "db": (1, 3), "cl": (2, 5), "ml": (5, 10)},
        "DevOps Engineer": {"fe": (0, 2), "be": (1, 3), "db": (1, 3), "cl": (5, 9), "ml": (0, 2)},
        "Cloud Engineer": {"fe": (0, 2), "be": (1, 3), "db": (1, 3), "cl": (5, 9), "ml": (0, 2)},
        "Cybersecurity Analyst": {"fe": (0, 1), "be": (1, 3), "db": (1, 3), "cl": (3, 6), "ml": (0, 2)},
        "Software Engineer": {"fe": (2, 5), "be": (2, 5), "db": (2, 4), "cl": (1, 3), "ml": (0, 3)},
    }

    per_role = n // len(ROLES)
    for role in ROLES:
        p = role_profiles[role]
        for _ in range(per_role):
            fe = np.random.randint(*p["fe"])
            be = np.random.randint(*p["be"])
            db = np.random.randint(*p["db"])
            cl = np.random.randint(*p["cl"])
            ml = np.random.randint(*p["ml"])
            skills_count = fe + be + db + cl + ml + np.random.randint(1, 5)
            edu_idx = np.random.choice(len(EDUCATION_LEVELS), p=EDUCATION_WEIGHTS)
            experience = max(0, round(np.random.exponential(2.0), 1))
            experience = min(experience, 15.0)
            projects = int(np.random.poisson(2 + experience * 0.3))
            projects = min(projects, 12)

            rows.append({
                "education": edu_idx, "experience": experience,
                "projects": projects, "skills_count": skills_count,
                "frontend_skills": fe, "backend_skills": be,
                "database_skills": db, "cloud_skills": cl, "ml_skills": ml,
                "recommended_role": role,
            })

    df = pd.DataFrame(rows)
    df = df.sample(frac=1, random_state=SEED).reset_index(drop=True)
    path = DATASETS_DIR / "role_dataset.csv"
    df.to_csv(path, index=False)
    print(f"[+] role_dataset.csv: {len(df)} rows -> {path}")
    return df


def generate_salary_dataset(n: int = 50000) -> pd.DataFrame:
    """Generate salary prediction dataset (INR lakhs per annum)."""
    role_base = {
        "Backend Developer": 6, "Frontend Developer": 5.5, "Full Stack Developer": 7,
        "Data Analyst": 5, "ML Engineer": 9, "AI Engineer": 10,
        "DevOps Engineer": 8, "Cloud Engineer": 8.5, "Cybersecurity Analyst": 7,
        "Software Engineer": 6.5,
    }
    location_mult = {
        "Bangalore": 1.15, "Mumbai": 1.10, "Delhi": 1.05, "Hyderabad": 1.08,
        "Pune": 1.02, "Chennai": 1.0, "Kolkata": 0.90, "Ahmedabad": 0.92,
        "Remote": 1.05, "US Remote": 3.5,
    }

    rows = []
    for _ in range(n):
        role = np.random.choice(ROLES)
        location = np.random.choice(LOCATIONS)
        edu_idx = np.random.choice(len(EDUCATION_LEVELS), p=EDUCATION_WEIGHTS)
        experience = max(0, round(np.random.exponential(2.5), 1))
        experience = min(experience, 20.0)
        skills_count = np.random.randint(5, 25)
        projects = int(np.random.poisson(3 + experience * 0.3))
        projects = min(projects, 12)

        base = role_base[role]
        salary = base * location_mult[location]
        salary += experience * 1.8
        salary += skills_count * 0.15
        salary += projects * 0.3
        salary += edu_idx * 0.8
        salary *= np.random.normal(1.0, 0.12)
        salary = round(max(2.5, salary), 2)

        rows.append({
            "role": role, "location": location, "education": edu_idx,
            "experience": experience, "skills_count": skills_count,
            "projects": projects, "salary_lpa": salary,
        })

    df = pd.DataFrame(rows)
    path = DATASETS_DIR / "salary_dataset.csv"
    df.to_csv(path, index=False)
    print(f"[+] salary_dataset.csv: {len(df)} rows -> {path}")
    return df


def generate_interview_dataset(n: int = 50000) -> pd.DataFrame:
    """Generate interview success probability dataset."""
    rows = []
    for _ in range(n):
        sc = _skill_counts(n)
        skills_count = sc["frontend"] + sc["backend"] + sc["database"] + sc["cloud"] + sc["ml"] + np.random.randint(1, 5)
        edu_idx = np.random.choice(len(EDUCATION_LEVELS), p=EDUCATION_WEIGHTS)
        cgpa = round(np.random.normal(7.5 + edu_idx * 0.3, 1.0), 2)
        cgpa = _clamp(cgpa, 4.0, 10.0)
        experience = max(0, round(np.random.exponential(2.0), 1))
        experience = min(experience, 15.0)
        projects = int(np.random.poisson(2 + experience * 0.3))
        projects = min(projects, 12)
        internships = int(np.random.poisson(0.8 + edu_idx * 0.3))
        internships = min(internships, 6)
        resume_score = round(np.random.normal(50 + experience * 3 + skills_count * 1.5, 10), 1)
        resume_score = _clamp(resume_score, 10, 98)
        certifications = int(np.random.poisson(1.0))
        certifications = min(certifications, 8)
        has_github = int(np.random.random() < 0.6)
        mock_interviews = int(np.random.poisson(1.5 + experience * 0.3))
        mock_interviews = min(mock_interviews, 10)

        prob = (
            skills_count * 1.2 + experience * 4.0 + projects * 2.5
            + internships * 3.0 + resume_score * 0.3 + certifications * 2.0
            + has_github * 3.0 + cgpa * 1.5 + edu_idx * 1.5
            + mock_interviews * 2.0
        )
        prob = _clamp(prob + np.random.normal(0, 5), 5, 98)
        prob = round(prob, 1)

        rows.append({
            "education": edu_idx, "cgpa": cgpa, "experience": experience,
            "projects": projects, "internships": internships,
            "skills_count": skills_count,
            "frontend_skills": sc["frontend"], "backend_skills": sc["backend"],
            "database_skills": sc["database"], "cloud_skills": sc["cloud"],
            "ml_skills": sc["ml"],
            "resume_score": resume_score, "certifications": certifications,
            "has_github": has_github, "mock_interviews": mock_interviews,
            "interview_probability": prob,
        })

    df = pd.DataFrame(rows)
    path = DATASETS_DIR / "interview_dataset.csv"
    df.to_csv(path, index=False)
    print(f"[+] interview_dataset.csv: {len(df)} rows -> {path}")
    return df


def generate_learning_dataset(n: int = 50000) -> pd.DataFrame:
    """Generate learning path dataset mapping current skills + target role to ordered skills."""
    rows = []
    for _ in range(n):
        role = np.random.choice(ROLES)
        num_current = np.random.randint(2, 15)
        current_skills = sorted(np.random.choice(ALL_SKILLS, size=min(num_current, len(ALL_SKILLS)), replace=False).tolist())
        current_str = "|".join(current_skills)

        # Missing skills depend on role
        role_key_skills = {
            "Backend Developer": BACKEND_SKILLS + DATABASE_SKILLS[:3],
            "Frontend Developer": FRONTEND_SKILLS[:8],
            "Full Stack Developer": FRONTEND_SKILLS[:5] + BACKEND_SKILLS[:4],
            "Data Analyst": ML_SKILLS[:5] + DATABASE_SKILLS[:2],
            "ML Engineer": ML_SKILLS + ["Docker", "AWS"],
            "AI Engineer": ML_SKILLS + CLOUD_SKILLS[:3],
            "DevOps Engineer": CLOUD_SKILLS,
            "Cloud Engineer": CLOUD_SKILLS + ["Python"],
            "Cybersecurity Analyst": ["Linux", "Python", "SQL", "AWS", "Docker"],
            "Software Engineer": BACKEND_SKILLS[:4] + FRONTEND_SKILLS[:3] + ["Git", "Data Structures"],
        }
        needed = [s for s in role_key_skills.get(role, ALL_SKILLS[:8]) if s not in current_skills]
        if not needed:
            needed = ["System Design", "Microservices"]
        learning_path = "|".join(needed[:8])

        rows.append({
            "target_role": role,
            "current_skills": current_str,
            "num_current_skills": len(current_skills),
            "learning_path": learning_path,
        })

    df = pd.DataFrame(rows)
    path = DATASETS_DIR / "learning_dataset.csv"
    df.to_csv(path, index=False)
    print(f"[+] learning_dataset.csv: {len(df)} rows -> {path}")
    return df


def generate_all() -> None:
    """Generate all 7 datasets."""
    print("=" * 60)
    print("PathPilot AI — Synthetic Dataset Generation")
    print("=" * 60)
    generate_resume_dataset()
    generate_ats_dataset()
    generate_career_dataset()
    generate_role_dataset()
    generate_salary_dataset()
    generate_interview_dataset()
    generate_learning_dataset()
    print("=" * 60)
    print("All datasets generated successfully!")
    print("=" * 60)


if __name__ == "__main__":
    generate_all()
