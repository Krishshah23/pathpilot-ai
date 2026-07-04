"""
ML service endpoints. Consumed exclusively by the Node backend.

Phase 1 scaffolds the request/response contract so the Node integration layer
can be built against a stable API. The ML internals (Random Forest, Decision
Tree, Linear Regression) are implemented in a later phase; endpoints currently
return clearly-marked stub responses.
"""

from functools import wraps

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ml.services.career_analysis import (
    analyze_skill_gap as run_skill_gap,
    predict_readiness as run_readiness_prediction,
)
from ml.services.resume_parser import parse_resume as run_resume_parser


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


def stub(feature, echo=None):
    """Uniform 'not implemented yet' payload used by scaffolded endpoints."""
    return Response(
        {
            'success': True,
            'implemented': False,
            'feature': feature,
            'message': f'{feature} endpoint scaffolded — ML model lands in a later phase.',
            'echo': echo,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['GET'])
def health(_request):
    return Response({'success': True, 'service': 'pathpilot-ai', 'status': 'ok'})


@api_view(['POST'])
@require_internal_key
def parse_resume(request):
    """Extract skills, education, projects, experience, certifications + health."""
    text = request.data.get('text', '') or ''
    try:
        result = run_resume_parser(text)
    except Exception as exc:  # noqa: BLE001 — never let a parse edge-case 500
        return Response(
            {'success': False, 'implemented': True, 'message': f'Resume parsing failed: {exc}'},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    return Response({'success': True, 'implemented': True, 'data': result})


@api_view(['POST'])
@require_internal_key
def skill_gap(request):
    """Compare current skills vs. required skills for a target role."""
    result = run_skill_gap(
        request.data.get('targetRole'),
        request.data.get('currentSkills', []) or [],
    )
    return Response({'success': True, 'implemented': True, 'data': result})


@api_view(['POST'])
@require_internal_key
def predict_readiness(request):
    """Random Forest → career-readiness score/class."""
    result = run_readiness_prediction(request.data or {})
    return Response({'success': True, 'implemented': True, 'data': result})


@api_view(['POST'])
@require_internal_key
def recommend_roadmap(request):
    """Decision Tree → personalized week-wise learning roadmap."""
    return stub('roadmap-recommend', echo={'targetRole': request.data.get('targetRole')})
