"""Deterministic week-wise Growth Path recommender for Phase 5.

Given a target role and the student's current skills, this builds a stable,
explainable learning roadmap by reusing the Phase 4 gap analysis and packing the
missing skills into weekly blocks of roughly equal effort. No randomness — the
same inputs always yield the same plan so progress tracking stays consistent.
"""

import re

from ml.services.career_analysis import analyze_skill_gap

# Target study effort per week (hours). Weeks are packed close to this.
WEEKLY_HOURS = 8

PRIORITY_LABEL = {
    'core': 'Core foundation',
    'recommended': 'Recommended depth',
    'supporting': 'Supporting skill',
}


def _slug(value):
    return re.sub(r'[^a-z0-9]+', '-', str(value or '').lower()).strip('-')


def _difficulty(hours):
    if hours <= 8:
        return 'Beginner'
    if hours <= 14:
        return 'Intermediate'
    return 'Advanced'


def _make_task(item):
    skill = item['skill']
    hours = item['estimatedHours']
    return {
        'key': _slug(skill),
        'skill': skill,
        'title': f'Learn {skill}',
        'priority': item['priority'],
        'difficulty': _difficulty(hours),
        'estimatedHours': hours,
    }


def _week_title(tasks):
    names = [t['skill'] for t in tasks]
    lead = PRIORITY_LABEL.get(tasks[0]['priority'], 'Focus')
    preview = ', '.join(names[:3])
    return f'{lead}: {preview}' if preview else lead


def _capstone_week():
    """Fallback week when the student already covers the role's skills."""
    return {
        'week': 1,
        'title': 'Capstone: prove your skills',
        'focusHours': 8,
        'tasks': [
            {
                'key': 'capstone-project',
                'skill': 'Portfolio Project',
                'title': 'Build one role-aligned portfolio project end to end',
                'priority': 'core',
                'difficulty': 'Advanced',
                'estimatedHours': 8,
            }
        ],
    }


def build_roadmap(target_role, current_skills):
    """Return a week-wise roadmap derived from the current skill gap."""
    gap = analyze_skill_gap(target_role, current_skills)
    role = gap['targetRole']
    missing = gap['missingSkills']  # pre-sorted: core first, then by name

    weeks = []
    week_tasks = []
    week_hours = 0
    week_num = 1

    def flush():
        nonlocal week_tasks, week_hours, week_num
        if not week_tasks:
            return
        weeks.append(
            {
                'week': week_num,
                'title': _week_title(week_tasks),
                'focusHours': week_hours,
                'tasks': week_tasks,
            }
        )
        week_num += 1
        week_tasks = []
        week_hours = 0

    for item in missing:
        task = _make_task(item)
        # Start a fresh week if this task would overflow a week that already
        # has content — keeps weekly effort near WEEKLY_HOURS.
        if week_tasks and week_hours + task['estimatedHours'] > WEEKLY_HOURS:
            flush()
        week_tasks.append(task)
        week_hours += task['estimatedHours']
        if week_hours >= WEEKLY_HOURS:
            flush()
    flush()

    if not weeks:
        weeks = [_capstone_week()]

    total_tasks = sum(len(w['tasks']) for w in weeks)
    total_hours = sum(w['focusHours'] for w in weeks)

    if gap['coverage'] >= 100:
        summary = (
            f'You already cover the {role} skill map. Focus on a capstone project '
            'to make your skills undeniable.'
        )
    else:
        summary = (
            f'{total_tasks} skills to learn across {len(weeks)} weeks '
            f'(~{total_hours} hrs) to close your {role} gap.'
        )

    return {
        'targetRole': role,
        'coverage': gap['coverage'],
        'summary': summary,
        'totalWeeks': len(weeks),
        'totalTasks': total_tasks,
        'totalHours': total_hours,
        'weeks': weeks,
        'strengths': [item['skill'] for item in gap['matchedSkills']],
    }
