# PathPilot AI — ML Service

Headless Django + DRF service. **Called only by the Node backend**, never the browser.

## Run

```bash
python -m venv venv
source venv/Scripts/activate        # Windows Git Bash
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 8000
```

## Endpoints (`/api/...`)

| Method | Path                   | Purpose                                   |
| ------ | ---------------------- | ----------------------------------------- |
| GET    | `/health/`             | Liveness check                            |
| POST   | `/resume/parse/`       | Extract skills/education/projects/etc.    |
| POST   | `/skills/gap/`         | Current vs. required skills for a role    |
| POST   | `/readiness/predict/`  | Random Forest → career-readiness          |
| POST   | `/roadmap/recommend/`  | Decision Tree → week-wise roadmap         |

All endpoints except `/health/` require the `X-Internal-Key` header matching
`INTERNAL_API_KEY` (the shared secret with the Node backend).

## ML models (Phase 8)

- **Random Forest** — career-readiness prediction
- **Decision Tree** — roadmap recommendation
- **Linear Regression** — career-progress trend

Model logic lives in `ml/services/`; trained artifacts (`.pkl`) go in `ml/artifacts/`.
