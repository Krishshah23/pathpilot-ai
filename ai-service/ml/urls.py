from django.urls import path

from . import views

# All endpoints are consumed by the Node backend, not the browser.
urlpatterns = [
    path('health/', views.health, name='health'),
    path('resume/parse/', views.parse_resume, name='parse-resume'),
    path('skills/gap/', views.skill_gap, name='skill-gap'),
    path('readiness/predict/', views.predict_readiness, name='predict-readiness'),
    path('roadmap/recommend/', views.recommend_roadmap, name='recommend-roadmap'),
    path('predict/', views.predict_ml, name='predict-ml'),
]
