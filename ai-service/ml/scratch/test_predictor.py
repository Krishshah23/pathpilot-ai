import os
import sys
from pathlib import Path

# Add parent of ml to python path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

# Mock settings/django setup if needed, or just import
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from ml.services.predictor import predict_all, models_loaded
from ml.utils.feature_engineering import extract_resume_features

print("Models loaded:", models_loaded())

payload = {
    "skills": ["Python", "JavaScript", "React"],
    "education": ["B.Tech in Computer Science, CGPA 8.5/10"],
    "projects": [{"title": "My project", "description": "built a website using react"}],
    "experience": ["Intern at Google"],
    "certifications": ["AWS Certified Cloud Practitioner"],
    "contact": {"email": True, "phone": True, "linkedin": True, "github": True},
    "healthScore": 75,
    "wordCount": 350,
    "rawText": "Google intern python javascript react",
    "profile": {
        "college": "My College",
        "branch": "CS",
        "semester": 6,
        "dreamRole": "Software Engineer",
        "skills": ["Python", "React"],
        "resumeUrl": ""
    },
    "currentSkills": ["Python", "JavaScript", "React"],
    "targetRole": "Software Engineer"
}

features = extract_resume_features(payload)
print("Extracted features:", features)

try:
    result = predict_all(features, payload["currentSkills"], payload["targetRole"])
    print("Prediction succeeded!")
    print(list(result.keys()))
except Exception as e:
    import traceback
    print("Prediction failed with error:")
    traceback.print_exc()
