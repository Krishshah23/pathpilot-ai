"""
Test that project-derived features are included and computed.
"""
from ml.utils.feature_engineering import extract_resume_features

sample_payload = {
    'skills': ['python', 'react'],
    'projects': [
        {'title': 'Auth Service', 'description': 'developed auth flow using flask and jwt'},
        {'title': 'UI', 'description': 'built responsive UI with react and tailwind'}
    ],
    'education': ['B.Tech Computer Science'],
    'experience': ['Intern at X'],
    'certifications': [],
    'contact': {'github': True},
    'profile': {},
    'rawText': 'developed built',
    'wordCount': 300,
}

features = extract_resume_features(sample_payload)
print('projects:', features.get('projects'))
print('projects_with_impact:', features.get('projects_with_impact'))
print('project_tech_count:', features.get('project_tech_count'))

assert features.get('projects') == 2
assert features.get('projects_with_impact') >= 1
assert features.get('project_tech_count') >= 2
print('Project feature test passed')
