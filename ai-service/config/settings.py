"""
Django settings for the PathPilot AI service.

This service is called ONLY by the Node backend (never the browser). It exposes
REST endpoints for resume parsing, skill-gap analysis, career-readiness
prediction, and roadmap recommendation, backed by ML models.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / '.env')


def env_bool(key, default=False):
    return os.getenv(key, str(default)).lower() in ('1', 'true', 'yes', 'on')


SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'dev-insecure-change-me')
DEBUG = env_bool('DJANGO_DEBUG', True)
ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Shared secret so only the Node backend can call this service.
INTERNAL_API_KEY = os.getenv('INTERNAL_API_KEY', 'dev-internal-key')

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',  # required by DRF (AnonymousUser); no login UI is exposed
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'corsheaders',
    # Local
    'ml',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {'context_processors': []},
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# This service is stateless/ML-only; a lightweight sqlite DB is kept for
# optional model metadata / caching but is not central to the design.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Only the Node backend origin may call this service directly.
CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS', 'http://localhost:5000'
).split(',')

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': ['rest_framework.parsers.JSONParser'],
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
}

# Where trained ML model artifacts (.pkl) are stored.
MODELS_DIR = BASE_DIR / 'ml' / 'artifacts'
MODELS_DIR.mkdir(parents=True, exist_ok=True)
