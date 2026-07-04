"""Deterministic career analysis helpers for Phase 4.

These functions are not statistical ML yet. They provide transparent, stable
analysis contracts for Path Score and Gap Navigator while the Phase 8 model
work remains separate.
"""

import math
import re

from ml.data.roles import ROLE_REQUIREMENTS
from ml.data.skills import SKILL_ALIASES

PRIORITY_ORDER = {'core': 0, 'recommended': 1, 'supporting': 2}


def _key(value):
    return re.sub(r'[^a-z0-9+#]+', '', str(value or '').lower())


def _alias_lookup():
    lookup = {}
    for canonical, aliases in SKILL_ALIASES.items():
        lookup[_key(canonical)] = canonical
        for alias in aliases:
            plain = alias.replace(r'\b', '')
            lookup[_key(plain)] = canonical
    return lookup


ALIAS_LOOKUP = _alias_lookup()


def normalize_skills(skills):
    """Convert free-form skill names into canonical names where possible."""
    normalized = set()
    for raw in skills or []:
        raw_text = str(raw).strip()
        if _key(raw_text) == 'htmlcss':
            parts = ['HTML', 'CSS']
        else:
            parts = re.split(r'[,|]+', raw_text)
        for part in parts:
            cleaned = part.strip()
            if not cleaned:
                continue
            canonical = ALIAS_LOOKUP.get(_key(cleaned), cleaned)
            normalized.add(canonical)
    return sorted(normalized, key=str.lower)


def _resolve_role(target_role):
    if not target_role:
        return 'Full Stack Developer'

    for role in ROLE_REQUIREMENTS:
        if role.lower() == str(target_role).lower():
            return role

    return 'Full Stack Developer'


def _learning_time(hours):
    if hours <= 0:
        return '0 hours'
    if hours < 8:
        return f'{hours} hours'
    weeks = max(1, math.ceil(hours / 8))
    return f'{weeks} weeks at 6-8 hrs/week'


def analyze_skill_gap(target_role, current_skills):
    """Compare current skills with role requirements and explain the gap."""
    role = _resolve_role(target_role)
    requirements = ROLE_REQUIREMENTS[role]
    current = set(normalize_skills(current_skills))

    required_skills = [
        {
            'skill': item['skill'],
            'priority': item['priority'],
            'estimatedHours': item['hours'],
        }
        for item in requirements
    ]

    matched = [
        item for item in required_skills
        if item['skill'] in current
    ]
    missing = [
        item for item in required_skills
        if item['skill'] not in current
    ]
    missing.sort(key=lambda item: (PRIORITY_ORDER.get(item['priority'], 99), item['skill']))

    matched_count = len(matched)
    total_count = len(required_skills)
    coverage = round((matched_count / total_count) * 100) if total_count else 0
    estimated_hours = sum(item['estimatedHours'] for item in missing)
    focus_areas = [item['skill'] for item in missing if item['priority'] == 'core'][:4]

    if coverage >= 80:
        summary = 'Strong fit. Polish proof-of-work and fill the remaining gaps.'
    elif coverage >= 55:
        summary = 'Good foundation. Focus on the core missing skills first.'
    elif coverage > 0:
        summary = 'Early fit. Build a focused weekly plan around the core skills.'
    else:
        summary = 'Fresh start for this role. Begin with the listed core fundamentals.'

    recommendations = []
    if focus_areas:
        recommendations.append(f'Start with core skills: {", ".join(focus_areas)}.')
    if any(item['priority'] == 'recommended' for item in missing):
        recommendations.append('Add recommended skills after the core list reaches 70% coverage.')
    if coverage >= 70:
        recommendations.append('Strengthen your resume projects so these skills are visible.')
    elif matched_count:
        recommendations.append('Build one role-aligned project using your matched skills.')
    else:
        recommendations.append('Complete a beginner project before adding advanced tools.')

    return {
        'targetRole': role,
        'coverage': coverage,
        'summary': summary,
        'currentSkills': sorted(current, key=str.lower),
        'requiredSkills': required_skills,
        'matchedSkills': matched,
        'missingSkills': missing,
        'matchedCount': matched_count,
        'missingCount': len(missing),
        'estimatedLearningHours': estimated_hours,
        'estimatedLearningTime': _learning_time(estimated_hours),
        'focusAreas': focus_areas,
        'recommendations': recommendations[:4],
    }


def predict_readiness(payload):
    """Explainable readiness estimate based on profile, resume, and gap signals."""
    profile = payload.get('profile') or {}
    resume = payload.get('resume') or {}
    gap = payload.get('gap') or {}

    skills = normalize_skills(profile.get('skills', []))
    resume_skills = normalize_skills(resume.get('skills', []))
    all_skills = sorted(set(skills + resume_skills), key=str.lower)

    skill_score = min(len(all_skills), 10) / 10 * 30
    resume_health = float(resume.get('healthScore') or 0)
    resume_score = resume_health / 100 * 30
    project_score = min(len(resume.get('projects') or []), 3) / 3 * 15

    profile_fields = [
        profile.get('college'),
        profile.get('branch'),
        profile.get('semester'),
        profile.get('dreamRole'),
        all_skills,
        profile.get('resumeUrl') or resume.get('fileUrl'),
    ]
    profile_score = sum(1 for field in profile_fields if field) / len(profile_fields) * 15
    gap_score = float(gap.get('coverage') or 0) / 100 * 10

    score = round(skill_score + resume_score + project_score + profile_score + gap_score)

    if score >= 85:
        level = 'Career-ready'
        summary = 'Your profile is strong across resume, skills, projects, and role fit.'
    elif score >= 70:
        level = 'Interview-ready foundation'
        summary = 'You have a solid base. Closing a few gaps will improve confidence.'
    elif score >= 50:
        level = 'Building momentum'
        summary = 'The foundation is visible, but several readiness signals need work.'
    elif score > 0:
        level = 'Needs foundation'
        summary = 'Start by improving profile completeness, resume quality, and core skills.'
    else:
        level = 'Unscored'
        summary = 'Add profile details and skills to generate a reliable readiness estimate.'

    return {
        'score': score,
        'level': level,
        'summary': summary,
        'signals': [
            {'label': 'Skills', 'score': round(skill_score), 'max': 30},
            {'label': 'Resume health', 'score': round(resume_score), 'max': 30},
            {'label': 'Projects', 'score': round(project_score), 'max': 15},
            {'label': 'Profile', 'score': round(profile_score), 'max': 15},
            {'label': 'Role fit', 'score': round(gap_score), 'max': 10},
        ],
    }
