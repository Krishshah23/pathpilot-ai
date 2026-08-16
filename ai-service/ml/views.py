"""
ml/views.py — Django DRF Machine Learning Microservice Endpoints

ARCHITECTURAL ROLE:
Serves HTTP microservice endpoints consumed exclusively by the Node.js backend.

SECURITY & INTEGRITY:
Enforces `require_internal_key` decorator verifying `X-Internal-Key` header against `INTERNAL_API_KEY`.

ERROR HANDLING:
Endpoints that call into user-input-driven parsing/inference (`parse_resume`, `predict_ml`)
catch failures and log the real exception server-side via `logger.exception`, but only ever
return a generic, non-identifying message to the caller — the raw exception text (stack
internals, file paths, library error strings) never crosses the process boundary.

ENDPOINTS:
1. `GET /api/ml/health`: Microservice health check returning 200 OK.
2. `POST /api/ml/predict`: Runs unified 7-model inference pipeline (Resume Score, ATS Pass %,
   Career Readiness, Role Match, Salary Projection, Interview Success, SHAP Feature Attribution).
3. `POST /api/ml/parse-resume`: Text extraction & regex section entity extractor.
4. `POST /api/ml/skill-gap`: Multi-dimensional role skill gap matcher.
5. `POST /api/ml/roadmap`: Custom week-by-week learning roadmap builder.
"""

import logging
from functools import wraps

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ml.services.career_analysis import (
    analyze_skill_gap as run_skill_gap,
    predict_readiness as run_readiness_prediction,
)
from ml.services.growth_planner import build_roadmap as run_roadmap_builder
from ml.services.resume_parser import parse_resume as run_resume_parser

logger = logging.getLogger(__name__)


def require_internal_key(view):
    """Rejects calls that don't carry the shared secret from the Node backend."""

    @wraps(view)
    def wrapper(request, *args, **kwargs):
        provided = request.headers.get('X-Internal-Key')
        if provided != settings.INTERNAL_API_KEY:
            return Response(
                {'success': False, 'message': 'Forbidden: invalid internal key'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return view(request, *args, **kwargs)

    return wrapper


def _ok(data):
    """Standard success envelope — every endpoint below returns this shape."""
    return Response({'success': True, 'data': data})


def _error(message, http_status):
    """Standard error envelope — message must be safe to show a client, never a raw exception."""
    return Response({'success': False, 'message': message}, status=http_status)


def _target_role_and_skills(request):
    """Shared payload shape for the skill-gap and roadmap endpoints."""
    target_role = request.data.get('targetRole')
    current_skills = request.data.get('currentSkills', []) or []
    return target_role, current_skills


@api_view(['GET'])
def health(_request):
    return Response({'success': True, 'service': 'pathpilot-ai', 'status': 'ok'})


@api_view(['POST'])
@require_internal_key
def parse_resume(request):
    """Extract skills, education, projects, experience, certifications + health."""
    text = request.data.get('text', '') or ''
    links = request.data.get('links', []) or []
    try:
        result = run_resume_parser(text, links)
    except Exception:  # noqa: BLE001 — never let a parse edge-case 500
        logger.exception('Resume parsing failed')
        return _error('Resume parsing failed. Please try a different file.', status.HTTP_422_UNPROCESSABLE_ENTITY)
    return _ok(result)


@api_view(['POST'])
@require_internal_key
def skill_gap(request):
    """Compare current skills vs. required skills for a target role."""
    target_role, current_skills = _target_role_and_skills(request)
    result = run_skill_gap(target_role, current_skills)
    return _ok(result)


@api_view(['POST'])
@require_internal_key
def predict_readiness(request):
    """Random Forest → career-readiness score/class."""
    result = run_readiness_prediction(request.data or {})
    return _ok(result)


@api_view(['POST'])
@require_internal_key
def recommend_roadmap(request):
    """Deterministic → personalized week-wise learning roadmap."""
    target_role, current_skills = _target_role_and_skills(request)
    result = run_roadmap_builder(target_role, current_skills)
    return _ok(result)


@api_view(['POST'])
@require_internal_key
def predict_ml(request):
    """Unified ML prediction endpoint — runs all 7 trained models.

    The predictor/feature-engineering imports are deliberately deferred to call time
    (not module load) — they pull in joblib/numpy/pandas/shap, which would otherwise
    load eagerly at Django startup even for requests that never touch this endpoint.
    """
    from ml.services.predictor import predict_all, models_loaded
    from ml.utils.feature_engineering import extract_resume_features

    if not models_loaded():
        return _error('ML models not trained yet. Run train_all.py first.', status.HTTP_503_SERVICE_UNAVAILABLE)

    try:
        payload = request.data or {}
        features = extract_resume_features(payload)
        current_skills = payload.get('currentSkills', []) or []
        target_role = payload.get('targetRole', '') or ''

        result = predict_all(features, current_skills, target_role)
        return _ok(result)
    except Exception:
        logger.exception('ML prediction failed')
        return _error('Prediction failed. Please try again.', status.HTTP_500_INTERNAL_SERVER_ERROR)
