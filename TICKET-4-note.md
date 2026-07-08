Ticket 4 — Roadmap vs Gap Navigator disagreement

Status: verified — both roadmap generation and gap analysis use the same career-analysis functions in the ML service:

- Gap analysis: ai-service/ml/services/career_analysis.analyze_skill_gap
- Roadmap: ai-service/ml/services/growth_planner.build_roadmap (calls analyze_skill_gap)

No duplicate sources found; no code change required.