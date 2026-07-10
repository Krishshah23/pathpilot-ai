from ml.services.predictor import predict_all, models_loaded

print('Models loaded:', models_loaded())

# Minimal features payload with zeros and a few example values
features = {
    'skills_count': 5,
    'projects': 2,
    'experience': 12,
    'education': 1,
    'has_github': 1,
    'has_linkedin': 1,
    'certifications': 0,
    'resume_length': 800,
    'cgpa': 8.5,
}
current_skills = ['python', 'django']
target_role = 'Software Engineer'

res = predict_all(features, current_skills, target_role)

print('Keys returned:', sorted(res.keys()))
print('Has explanations:', 'explanations' in res)
if 'explanations' in res:
    ex = res['explanations']
    print('topPositive count:', len(ex.get('topPositive', [])))
    print('topNegative count:', len(ex.get('topNegative', [])))
    print('shapRaw length:', len(ex.get('shapRaw', [])))
    # print a small sample
    print('topPositive sample:', ex.get('topPositive', [])[:3])
