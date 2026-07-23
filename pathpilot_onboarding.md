# PathPilot AI — New Engineer Onboarding Guide

> Generated from live code analysis on 2026-07-16. Last updated 2026-07-24 to reflect architectural fixes, design-system audit, and new components. Ignores old planning docs.

---

## Phase 1 — 30,000-Foot Overview

### What does this product actually do, for whom?

PathPilot AI is a **career intelligence platform built for computer-science students in India** who are preparing to enter the job market. A student uploads their résumé, declares a dream role (e.g. "Full Stack Developer"), and the platform runs it through a dual AI pipeline — a Django/Python ML service for structured feature extraction and seven trained models, plus Google Gemini for natural-language role-fit analysis. The output is a holistic "Path Score", a skill-gap analysis mapped to live job-market demand, a week-by-week learning roadmap, an AI mock interview coach (voice-enabled), a Kanban job-application tracker, and a shareable public career card. The system is explicitly designed to replace the "I don't know where to start" feeling of a final-year student staring at LinkedIn with an actionable, data-driven career plan.

---

### High-Level Architecture

```
┌─────────────────────────────────┐
│   Browser (React + Vite SPA)    │
│   client/  — port 5173          │
│                                 │
│  HTTP/REST (Axios)              │
│  Credentials via HttpOnly       │
│  cookie (JWT refresh)           │
└───────────────┬─────────────────┘
                │ HTTPS REST
                ▼
┌─────────────────────────────────┐
│   Node.js / Express API         │
│   server/  — port 5000          │
│                                 │
│  • Auth (JWT access + refresh)  │
│  • Resume file store (Multer)   │
│  • Business logic / controllers │
│  • Gemini AI calls              │
│  • Adzuna + TheirStack calls    │
│  • Cron (weekly market refresh) │
│                                 │
│  MongoDB Atlas (Mongoose)       │
└────────┬────────────────────────┘
         │ HTTP REST
         │ Header: X-Internal-Key
         │ (internal shared secret)
         ▼
┌─────────────────────────────────┐
│   Django / DRF ML Service       │
│   ai-service/  — port 8000      │
│   SQLite (lightweight, optional)│
│                                 │
│  • Resume text parser           │
│  • Skill-gap analyzer           │
│  • 7 trained ML models          │
│    (loaded once at startup)     │
│  • SHAP explainability layer    │
└─────────────────────────────────┘

catboost_info/  ← Training run logs/artifacts
                  from the resume-score CatBoost
                  model. NOT a live service.
```

**Key constraint:** The browser **never** talks to Django directly. All ML calls go `Browser → Node → Django`.

---

### Tech Stack

| Layer | Folder | Language / Framework | Key Libraries | Database |
|---|---|---|---|---|
| Frontend | `client/` | JavaScript (React 19, Vite 8) | React Router 7, Axios, Framer Motion, Recharts, Tailwind CSS 4 | — |
| Backend API | `server/` | Node.js ESM, Express 4 | Mongoose, bcryptjs, jsonwebtoken, Multer, Mammoth, pdfjs-dist, pdf-parse, nodemailer, node-cron, Zod, @google/genai | MongoDB Atlas |
| ML Service | `ai-service/` | Python 3, Django 5 / DRF | scikit-learn, CatBoost, XGBoost, LightGBM, SHAP, pandas, numpy, joblib | SQLite (metadata only) |
| Training artifacts | `catboost_info/` | — | — | — (flat JSON/TSV logs) |

**Third-party APIs used by Node:**
- **Google Gemini** — resume intelligence, chat coaching, interview Q&A evaluation
- **Adzuna** — weekly job-listing pull for market skill-frequency data (India)
- **TheirStack** — live job openings with 6-hour MongoDB TTL cache

---

### How to Run This Locally (End-to-End)

#### 1. Python ML Service (Django)
```bash
cd ai-service
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

cp .env.example .env           # fill DJANGO_SECRET_KEY + INTERNAL_API_KEY

# (First time only) Train all 7 ML models — creates ml/models/*/model.pkl
python -m ml.training.train_all

# Start Django dev server on port 8000
python manage.py runserver 8000
```

#### 2. Node.js API Server
```bash
cd server
npm install

cp .env.example .env           # fill MONGODB_URI, JWT secrets,
                               # AI_SERVICE_URL=http://localhost:8000,
                               # INTERNAL_API_KEY (same as Django),
                               # GEMINI_API_KEY

npm run dev                    # nodemon src/index.js → port 5000
# Optional: npm run seed       # seed DB with sample data
```

#### 3. React Client
```bash
cd client
npm install
npm run dev                    # Vite → http://localhost:5173
```

**Startup order:** Django first → Node second → Client last.  
**Health check:** `GET http://localhost:5000/api/health/ai` — pings Django and returns combined status.

---

> Phase 2 below.

---

## Phase 2 — Folder-by-Folder Map

### `client/` — React SPA (Vite)

**Entry point:** `client/src/main.jsx` → mounts `<App>` inside `<AuthProvider>` + `<ToastContext>`

#### Key subfolders / files

| Path | What it does |
|---|---|
| `src/main.jsx` | ReactDOM root mount |
| `src/App.jsx` | Full router tree — all page ↔ guard mappings |
| `src/index.css` | Global design tokens + Tailwind base |
| `src/lib/api.js` | Axios singleton with Bearer-auth interceptor + silent 401→refresh retry |
| `src/lib/cn.js` | Tiny class-name utility (`clsx` equivalent) |
| `src/context/AuthContext.jsx` | Global auth state: user object, login/register/logout, silent session restore |
| `src/context/ToastContext.jsx` | Global toast notification queue |
| `src/config/careerData.js` | Static lists: DREAM_ROLES, BRANCHES, SEMESTERS, COMMON_SKILLS |
| `src/config/nav.js` | Sidebar nav item definitions |
| `src/routes/guards.jsx` | `ProtectedRoute`, `PublicOnlyRoute`, `RequireOnboarding`, `RequireAdmin`, `StudentOnlyRoute` |
| `src/pages/auth/` | Login, Register, ForgotPassword, ResetPassword, VerifyEmail |
| `src/pages/OnboardingPage.jsx` | 3-step wizard (college → role → skills) |
| `src/pages/OverviewPage.jsx` | Dashboard: Path Score, peer benchmark, AI narrative, notifications |
| `src/pages/TalentAnalyzerPage.jsx` | Resume upload, health, gap analysis, ML predictions |
| `src/pages/ExecutionEnginePage.jsx` | Growth roadmap + job-application Kanban tracker |
| `src/pages/InterviewPrepPage.jsx` | AI mock interview coach (voice-to-text, timer, scoring) |
| `src/pages/CareerReportPage.jsx` | Printable/shareable career report |
| `src/pages/ProfilePage.jsx` | User profile edit + public-card toggle |
| `src/pages/PublicProfilePage.jsx` | Public shareable career card (no auth) |
| `src/pages/AdminPage.jsx` | Admin panel: user list, stats, manage users |
| `src/components/layout/AppShell.jsx` | Main authenticated shell: sidebar, topbar, notification drawer |
| `src/components/layout/AuthLayout.jsx` | Centered card wrapper for auth pages |
| `src/components/ui/` | Button, Card, Input, Select, FileUpload, Spinner, Stepper, TagInput, Avatar, icons… |
| `src/components/ui/icons.jsx` | Custom hand-rolled SVG icon library (Lucide-style, no external dependency). All icons are properties of the exported `Icon` object — e.g. `Icon.Layers`, `Icon.BookOpen`. Add new icons here; never import a separate icon package. |
| `src/components/charts/` | Custom chart components. `ScoreGauge.jsx` is a hand-crafted SVG radial gauge with gradient stroke, framer-motion arc animation, and 10 precision tick marks. |
| `src/components/charts/ScoreGauge.jsx` | **[NEW]** Animated radial score gauge. Draws a gradient SVG arc (`--color-brand` → `--color-brand-soft`), 10 tick marks, `framer-motion` spring animation, and `animate-count-up` central number. Used in `OverviewPage` and `PublicProfilePage`. |
| `src/components/ErrorBoundary.jsx` | **[NEW]** Global React class-based Error Boundary. Wraps the entire router tree in `App.jsx`. Catches uncaught render-phase exceptions and shows a user-friendly error card with the exact error message and a Reload button instead of a blank white screen. |
| `src/components/resume/` | Resume health card, factor breakdown |
| `src/components/opportunity/` | OpportunityModal + Kanban column/card components |

#### Client-side routing (all routes)

| Path | Guard | Page |
|---|---|---|
| `/login` | PublicOnly | LoginPage |
| `/register` | PublicOnly | RegisterPage |
| `/forgot-password` | PublicOnly | ForgotPasswordPage |
| `/reset-password` | None | ResetPasswordPage |
| `/verify-email` | None | VerifyEmailPage |
| `/profile/:publicCardId` | None | PublicProfilePage |
| `/onboarding` | Auth | OnboardingPage |
| `/dashboard` | Auth + Onboarded + Student | OverviewPage |
| `/talent-analyzer` | Auth + Onboarded + Student | TalentAnalyzerPage |
| `/execution-engine` | Auth + Onboarded + Student | ExecutionEnginePage |
| `/interview-prep` | Auth + Onboarded + Student | InterviewPrepPage |
| `/report` | Auth + Onboarded + Student | CareerReportPage |
| `/profile` | Auth + Onboarded + Student | ProfilePage |
| `/admin` | Auth + Onboarded + Admin | AdminPage |
| `/` | — | Redirect → `/dashboard` |
| `*` | — | NotFoundPage |
| `/resume`, `/gap`, `/growth`, `/opportunities`, `/path-score`, `/insights`, `/interview` | — | Legacy redirects to new hub pages |

#### Config / environment

`vite.config.js` — dev proxy: `/api` and `/uploads` → `http://localhost:5000`. No `.env` file needed on client; the backend URL is inferred from the proxy. `@` alias maps to `src/`.

---

### `server/` — Node.js / Express API

**Entry point:** `src/index.js` → calls `connectDB()`, then `createApp()`, then starts the cron.

**App factory:** `src/app.js` → configures CORS, JSON body parsing, cookie-parser, static file serving, all `/api` routes, and error middleware.

#### Key subfolders / files

| Path | What it does |
|---|---|
| `src/index.js` | Bootstrap: DB connect → app → listen → cron start |
| `src/app.js` | Express factory (test-friendly — no open port) |
| `src/config/env.js` | Centralized env validation; exports typed `env` object |
| `src/config/db.js` | Mongoose connection with retry |
| `src/routes/index.js` | Mounts all 16 sub-routers under `/api` |
| `src/controllers/` | One controller per domain (16 files) |
| `src/models/` | 8 Mongoose models (see Phase 5 for schema details) |
| `src/services/gemini.service.js` | All Gemini AI calls: resume analysis, chat, Q generation, answer eval, score explain, fallback parser |
| `src/services/ai.service.js` | Thin axios client to Django — the **only** file that calls Django |
| `src/services/resumeText.service.js` | PDF (coord-aware + annotation link extraction) + DOCX text extraction |
| `src/services/pathScore.service.js` | Pure function: computes weighted Path Score from user + resume data |
| `src/services/jobMarket.service.js` | Adzuna fetch + skill frequency analysis + MongoDB upsert; mock-data seeder |
| `src/services/liveJobs.service.js` | TheirStack live-job search with 6 h in-memory + MongoDB persistence cache |
| `src/services/jobMarketCron.js` | `node-cron` weekly scheduler for Adzuna refresh |
| `src/services/resumeRedFlags.js` | Heuristic red-flag detector (no email, no GitHub, etc.) |
| `src/services/email.service.js` | Nodemailer send helpers (verification, password reset) |
| `src/services/token.service.js` | Sign/verify short-lived tokens for email/password flows |
| `src/services/growth.service.js` | Roadmap generation via Django + task-completion merge logic |
| `src/services/insights.service.js` | Aggregates resume + roadmap + interview data into an Insights summary |
| `src/middleware/auth.middleware.js` | `protect` (JWT verify) + `authorize(role)` |
| `src/middleware/upload.middleware.js` | Multer config: disk storage, file type whitelist, 5 MB limit |
| `src/middleware/validate.middleware.js` | Zod schema validation wrapper |
| `src/middleware/error.middleware.js` | Global 404 + error handler |
| `src/utils/ApiError.js` | Custom error class with HTTP status + static factories |
| `src/utils/ApiResponse.js` | `sendSuccess()` helper for consistent JSON shape |
| `src/utils/asyncHandler.js` | Wraps async route handlers to forward errors to Express |
| `src/validators/` | Zod schemas: auth, profile, path/gap/roadmap |
| `src/scripts/` | seed.js (demo data), test scripts for gap/URL extraction |
| `uploads/` | Runtime file store: `resumes/` + `avatars/` (served statically) |

#### All API Routes

| Method | Path | Controller file | What it does |
|---|---|---|---|
| GET | `/api/health` | routes/index.js | Service health ping |
| GET | `/api/health/ai` | routes/index.js | Node + Django connectivity check |
| **Auth** |||||
| POST | `/api/auth/register` | auth.controller.js | Register + send verification email |
| POST | `/api/auth/login` | auth.controller.js | Login → access token + refresh cookie |
| POST | `/api/auth/refresh` | auth.controller.js | Rotate refresh token → new access token |
| POST | `/api/auth/logout` | auth.controller.js | Clear refresh cookie |
| GET | `/api/auth/me` | auth.controller.js | Return authenticated user |
| POST | `/api/auth/verify-email` | auth.controller.js | Confirm email address |
| POST | `/api/auth/resend-verification` | auth.controller.js | Re-send verification email |
| POST | `/api/auth/forgot-password` | auth.controller.js | Send password-reset email |
| POST | `/api/auth/reset-password` | auth.controller.js | Apply new password via reset token |
| **Onboarding** |||||
| PUT | `/api/onboarding` | onboarding.controller.js | Save college/branch/semester/role/skills, mark complete |
| **Profile** |||||
| GET | `/api/profile/public/:publicCardId` | profile.controller.js | Public career card (no auth) |
| GET | `/api/profile` | profile.controller.js | Get own profile |
| PATCH | `/api/profile` | profile.controller.js | Update profile fields |
| PATCH | `/api/profile/password` | profile.controller.js | Change password |
| PATCH | `/api/profile/public-card` | profile.controller.js | Toggle public card on/off |
| POST | `/api/profile/avatar` | profile.controller.js | Upload avatar image |
| POST | `/api/profile/resume` | profile.controller.js | Update resume URL pointer only |
| **Resume** |||||
| POST | `/api/resume/analyze` | resume.controller.js | Upload + full pipeline: extract → Django parse → Gemini analyze → save |
| GET | `/api/resume` | resume.controller.js | Get latest resume analysis |
| GET | `/api/resume/history` | resume.controller.js | All past analyses (score + date only) |
| **Path Score** |||||
| GET | `/api/path-score` | pathScore.controller.js | Compute Path Score + call Django ML predict + market salary |
| **Gap Analysis** |||||
| POST | `/api/gap/analyze` | gap.controller.js | Compare skills vs. role requirements via Django |
| **Growth / Roadmap** |||||
| GET | `/api/growth` | growth.controller.js | Get active growth plan |
| POST | `/api/growth/generate` | growth.controller.js | Generate new roadmap via Django |
| PATCH | `/api/growth/tasks/:key` | growth.controller.js | Toggle a task done/undone |
| **Insights** |||||
| GET | `/api/insights` | insights.controller.js | Aggregated career progress insights |
| **Opportunities (Kanban)** |||||
| GET | `/api/opportunities/stats` | opportunity.controller.js | Stage counts summary |
| GET | `/api/opportunities` | opportunity.controller.js | List all opportunities for user |
| POST | `/api/opportunities` | opportunity.controller.js | Create new opportunity |
| PATCH | `/api/opportunities/:id` | opportunity.controller.js | Update stage/notes/details + append timeline |
| DELETE | `/api/opportunities/:id` | opportunity.controller.js | Delete opportunity |
| **Notifications** |||||
| GET | `/api/notifications` | notification.controller.js | List notifications |
| PATCH | `/api/notifications/mark-all` | notification.controller.js | Mark all as read |
| PATCH | `/api/notifications/:id` | notification.controller.js | Mark one as read |
| **AI Coach** |||||
| POST | `/api/ai-coach/explain` | aiCoach.controller.js | Gemini: explain Path Score in plain English |
| POST | `/api/ai-coach/chat` | aiCoach.controller.js | Gemini: context-aware career coaching chat |
| POST | `/api/ai-coach/interview/question` | aiCoach.controller.js | Gemini: generate one targeted interview question |
| POST | `/api/ai-coach/interview/evaluate` | aiCoach.controller.js | Gemini: score + grade a candidate's answer |
| POST | `/api/ai-coach/interview/save-session` | aiCoach.controller.js | Persist completed session to MongoDB |
| GET | `/api/ai-coach/interview/sessions` | aiCoach.controller.js | Get past interview sessions |
| **Report** |||||
| GET | `/api/report` | report.controller.js | Compile full career report (all data merged) |
| **Job Market** |||||
| GET | `/api/job-market/:role` | jobMarket.controller.js | Market skill frequencies for a role |
| GET | `/api/job-market/:role/salary` | jobMarket.controller.js | Salary range for a role |
| POST | `/api/job-market/refresh` | jobMarket.controller.js | Admin: force Adzuna data refresh |
| **Live Jobs** |||||
| GET | `/api/live-jobs` | liveJobs.controller.js | TheirStack live job openings (cached 6 h) |
| DELETE | `/api/live-jobs/cache` | liveJobs.controller.js | Admin: invalidate live-jobs cache |
| **Admin** |||||
| GET | `/api/admin/stats` | admin.controller.js | Platform-wide stats (user count, resume count…) |
| GET | `/api/admin/users` | admin.controller.js | List all users |
| GET | `/api/admin/users/:id` | admin.controller.js | Get one user |
| PATCH | `/api/admin/users/:id` | admin.controller.js | Update user (role, flags) |
| DELETE | `/api/admin/users/:id` | admin.controller.js | Delete user |
| **ML (pass-through)** |||||
| POST | `/api/ml/predict` | ml.controller.js | Forward to Django `/api/predict/` (all 7 models) |

#### Server environment variables (`server/.env.example`)

| Variable | Purpose |
|---|---|
| `PORT` | Express listen port (default 5000) |
| `NODE_ENV` | `development` / `production` |
| `CLIENT_URL` | CORS allowed origin (default `http://localhost:5173`) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` / `JWT_ACCESS_EXPIRES` | Short-lived access token (default 15 m) |
| `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES` | Refresh token cookie (default 7 d) |
| `TOKEN_SECRET` | Signs email-verify / password-reset tokens |
| `AI_SERVICE_URL` | Django base URL (default `http://localhost:8000`) |
| `INTERNAL_API_KEY` | Shared secret sent as `X-Internal-Key` header to Django |
| `SMTP_HOST/PORT/USER/PASS` | Nodemailer SMTP (blank = log to console in dev) |
| `EMAIL_FROM` | Sender display name + address |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Adzuna job-market API (omit to disable) |
| `THEIRSTACK_API_KEY` | TheirStack live-jobs API |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | Model name (default `gemini-3.5-flash`) |

---

### `ai-service/` — Django / DRF ML Service

**Entry point:** `manage.py runserver` → WSGI via `config/wsgi.py` → `config/urls.py` → all routes under `api/` → `ml/urls.py`

#### Key subfolders / files

| Path | What it does |
|---|---|
| `config/settings.py` | Django settings: CORS allow Node only, `INTERNAL_API_KEY`, `MODELS_DIR` |
| `config/urls.py` | Root URL: mounts all endpoints under `api/` |
| `ml/views.py` | All 5 DRF endpoints; enforces `X-Internal-Key` on every call |
| `ml/urls.py` | URL → view mapping for the 5 endpoints |
| `ml/services/resume_parser.py` | Rule-based resume sectioner: regex + keyword matching for skills/edu/projects/experience |
| `ml/services/career_analysis.py` | `analyze_skill_gap()` + `predict_readiness()` (pre-model heuristic fallback) |
| `ml/services/predictor.py` | Loads all 7 model `.pkl` files once; `predict_all()` orchestrates them |
| `ml/services/explainer.py` | SHAP TreeExplainer wrapper; produces top positive/negative feature contributions |
| `ml/services/growth_planner.py` | Deterministic week-by-week roadmap builder from skill-gap data |
| `ml/training/train_all.py` | Master script: calls all 7 `train_*.py` sequentially |
| `ml/training/train_resume.py` | Trains RF / XGBoost / **CatBoost** on resume_dataset.csv; saves best |
| `ml/training/train_ats.py` | Trains ATS pass/fail classifier |
| `ml/training/train_career.py` | Trains RF / LightGBM / **CatBoost** career-readiness classifier (4 classes) |
| `ml/training/train_role.py` | Trains role-recommendation classifier (10 roles) |
| `ml/training/train_interview.py` | Trains interview-success probability regressor |
| `ml/training/train_salary.py` | Trains salary-prediction regressor |
| `ml/training/train_learning.py` | Trains KNN learning-path recommender |
| `ml/utils/feature_engineering.py` | Shared feature column lists + `extract_resume_features()` (runtime feature extractor) |
| `ml/utils/dataset_generator.py` | Generates synthetic training CSVs (1000–5000 rows each) |
| `ml/utils/build_peer_benchmarks.py` | Generates `peer_benchmarks.json` percentile distributions per role |
| `ml/data/roles.py` | Authoritative role → required-skills mapping used for gap analysis |
| `ml/data/skills.py` | Canonical skill aliases dictionary (e.g. `node.js` → `Node.js`) |
| `ml/models/` | `resume_score/`, `ats/`, `career/`, `role/`, `interview/`, `salary/`, `learning/` — each with `model.pkl`, `scaler.pkl`, `features.pkl` |
| `ml/models/peer_benchmarks.json` | 101-point percentile distribution per role |
| `ml/artifacts/` | Empty at runtime — reserved for any future binary artifacts |
| `ml/datasets/` | Generated CSVs used for training (not committed; re-run `dataset_generator.py`) |
| `ml/reports/` | PNG plots from training (feature importance, confusion matrix, actual vs. predicted) |
| `tools/call_predict.js` | Dev script: calls `/api/predict/` directly to smoke-test the Django service |
| `tools/test_percentile.js` | Dev script: validates percentile interpolation logic in `peer_benchmarks.json` |
| `db.sqlite3` | Django SQLite — holds only migrations/metadata; not used for ML state |

#### Django API endpoints

| Method | Path | View function | What it does |
|---|---|---|---|
| GET | `/api/health/` | `health` | Liveness check |
| POST | `/api/resume/parse/` | `parse_resume` | Rule-based text parser → skills/edu/projects/health |
| POST | `/api/skills/gap/` | `skill_gap` | Compare skills vs. role → missing + present |
| POST | `/api/readiness/predict/` | `predict_readiness` | Heuristic career-readiness score |
| POST | `/api/roadmap/recommend/` | `recommend_roadmap` | Deterministic week-wise learning roadmap |
| POST | `/api/predict/` | `predict_ml` | **Unified**: all 7 models + SHAP + peer benchmark |

#### AI-service environment variables (`ai-service/.env.example`)

| Variable | Purpose |
|---|---|
| `DJANGO_SECRET_KEY` | Django secret (required in prod) |
| `DJANGO_DEBUG` | `True` in dev |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated allowed hosts |
| `CORS_ALLOWED_ORIGINS` | Must include Node server origin |
| `INTERNAL_API_KEY` | Must match `INTERNAL_API_KEY` in `server/.env` |

---

### `catboost_info/` — Training Run Logs (Not a service)

| File / Folder | What it is |
|---|---|
| `catboost_training.json` | Per-iteration RMSE log from the CatBoost resume-score training run (200 iterations, final RMSE ≈ 2.32) |
| `learn_error.tsv` | Same RMSE per iteration as TSV (CatBoost default output) |
| `time_left.tsv` | Estimated time remaining per iteration during that training run |
| `learn/` | CatBoost internal binary snapshot directory |

> This folder is **side-effect output** that CatBoost writes to its working directory when training. It has no role at runtime. It confirms that CatBoost was used as one of the three candidates for the resume-score model and converged to RMSE ~2.32 after 200 iterations.

---

> Phase 3 below.

---

## Phase 3 — Feature-to-File Mapping

### Main User-Facing Features

| Feature | Entry Point (UI) | API Endpoint(s) | Backend Handler | Business Logic | AI/Model Files | DB Collection(s) |
|---|---|---|---|---|---|---|
| **Register / Login** | `LoginPage.jsx` / `RegisterPage.jsx` | `POST /auth/register` `POST /auth/login` `POST /auth/refresh` | `auth.controller.js` | `token.service.js` `email.service.js` | — | `users` |
| **Onboarding Wizard** | `OnboardingPage.jsx` | `PUT /onboarding` | `onboarding.controller.js` | Validates + sets `onboardingCompleted=true` | — | `users` (embedded `profile`) |
| **Resume Upload & Analysis** | `TalentAnalyzerPage.jsx` (FileUpload) | `POST /resume/analyze` | `resume.controller.js` | `resumeText.service.js` `resumeRedFlags.js` `pathScore.service.js` | Django `resume_parser.py` · `gemini.service.js` (`geminiAnalyzeResume`, `geminiExplainScore`, `geminiParseFallback`) | `resumes` `users` `notifications` |
| **Path Score / Dashboard** | `OverviewPage.jsx` | `GET /path-score` | `pathScore.controller.js` | `pathScore.service.js` `jobMarket.service.js` | Django `predictor.py` → all 7 models + SHAP | `resumes` `jobmarketsnapshots` |
| **Skill Gap Analysis** | `TalentAnalyzerPage.jsx` (Gap tab) | `POST /gap/analyze` | `gap.controller.js` | — | Django `career_analysis.py` → `analyze_skill_gap()` · `ml/data/roles.py` | `resumes` |
| **Learning Roadmap** | `ExecutionEnginePage.jsx` (Roadmap tab) | `GET /growth` `POST /growth/generate` `PATCH /growth/tasks/:key` | `growth.controller.js` | `growth.service.js` | Django `growth_planner.py` → `recommend_roadmap()` · optionally `gemini.service.js` (`geminiGenerateGapRoadmap`) | `growthplans` |
| **AI Career Coaching Chat** | `OverviewPage.jsx` or `TalentAnalyzerPage.jsx` (chat widget) | `POST /ai-coach/chat` | `aiCoach.controller.js` | `gemini.service.js` → `geminiChat()` | Gemini LLM (context-injected with user + resume + roadmap) | `resumes` `growthplans` (read-only for context) |
| **AI Mock Interview Coach** | `InterviewPrepPage.jsx` | `POST /ai-coach/interview/question` `POST /ai-coach/interview/evaluate` `POST /ai-coach/interview/save-session` `GET /ai-coach/interview/sessions` | `aiCoach.controller.js` | `gemini.service.js` → `geminiGenerateQuestion()` `geminiEvaluateAnswer()` | Gemini LLM | `interviewsessions` |
| **Job-Application Kanban** | `ExecutionEnginePage.jsx` (Opportunities tab) | `GET /opportunities` `POST /opportunities` `PATCH /opportunities/:id` `DELETE /opportunities/:id` | `opportunity.controller.js` | Fit-score calculation inline in controller | — | `opportunities` |
| **Live Job Openings** | `ExecutionEnginePage.jsx` (Live Jobs tab) | `GET /live-jobs` | `liveJobs.controller.js` | `liveJobs.service.js` → TheirStack API → `LiveJobCache` (6 h TTL) | — | `livejobcaches` |
| **Market Intelligence** | `TalentAnalyzerPage.jsx` (Market tab) / `OverviewPage.jsx` | `GET /job-market/:role` `GET /job-market/:role/salary` | `jobMarket.controller.js` | `jobMarket.service.js` → reads `JobMarketSnapshot` (seeded if empty) | — | `jobmarketsnapshots` |
| **AI Career Insights** | `OverviewPage.jsx` (Insights panel) | `GET /insights` | `insights.controller.js` | `insights.service.js` → merges resume + roadmap + interview data. **Note:** The controller must NOT call `pathScore.service.js` to re-compute a fresh score and override the already-stored weighted composite. It should read and surface the composite stored on the resume document. See [Known Bug Fix #1](#known-bug-fix-1-path-score-override-in-insights) below. | — | `resumes` `growthplans` `interviewsessions` |
| **Career Report** | `CareerReportPage.jsx` | `GET /report` | `report.controller.js` | Collects all data; formats printable report | — | `resumes` `growthplans` `interviewsessions` `opportunities` |
| **Public Profile / Career Card** | `PublicProfilePage.jsx` | `GET /profile/public/:publicCardId` | `profile.controller.js` | Reads user + latest resume | — | `users` `resumes` |
| **Profile & Settings** | `ProfilePage.jsx` | `GET/PATCH /profile` `POST /profile/avatar` `PATCH /profile/password` `PATCH /profile/public-card` | `profile.controller.js` | `upload.middleware.js` | — | `users` |
| **Notifications** | `AppShell.jsx` (notification drawer) | `GET /notifications` `PATCH /notifications/:id` `PATCH /notifications/mark-all` | `notification.controller.js` | Created by `resume.controller.js` as a side-effect | — | `notifications` |
| **Admin Panel** | `AdminPage.jsx` | `GET /admin/stats` `GET /admin/users` `PATCH /admin/users/:id` `DELETE /admin/users/:id` | `admin.controller.js` | Aggregation pipeline for stats | — | `users` `resumes` |

---

### End-to-End Trace: "User uploads their résumé"

This is the **most important flow** in the entire system — everything else (Path Score, Gap, Roadmap, Interview) depends on data created here.

```
USER clicks "Upload Resume" on TalentAnalyzerPage
        │
        ▼
[CLIENT] TalentAnalyzerPage.jsx
  → Calls api.post('/resume/analyze', formData)  [multipart/form-data, field: "file"]
  → Sets uploadState = 'uploading'
        │
        │  HTTP POST /api/resume/analyze
        ▼
[SERVER] upload.middleware.js  (Multer)
  → Validates: file type must be .pdf or .docx, size ≤ 5 MB
  → Saves file to  uploads/resumes/<userId>-<timestamp>.<ext>
  → Attaches req.file
        │
        ▼
[SERVER] resume.controller.js → analyzeResume()

  STEP 1 — Extract text
  → resumeText.service.js → extractResumeText(absPath, originalName)
      ├─ If .pdf: extractPdfTextWithLayout()  [coordinate-aware, 2-column support]
      │           + extractPdfLinks()          [annotation URI annotations]
      │           + extractUrlsFromText()      [regex scan for github/linkedin]
      └─ If .docx: mammoth.extractRawText()
      Returns { text, links }

  STEP 2 — Django ML parse (primary)
  → ai.service.js → aiService.parseResume({ text, links })
      │   HTTP POST http://localhost:8000/api/resume/parse/
      │   Header: X-Internal-Key: <secret>
      ▼
  [DJANGO] ml/views.py → parse_resume()
    → require_internal_key()  [403 if key mismatch]
    → ml/services/resume_parser.py → parse_resume(text, links)
        ├─ Section detection (regex headers: SKILLS, EDUCATION, EXPERIENCE...)
        ├─ Skill extraction (keyword match against ml/data/skills.py SKILL_ALIASES)
        ├─ Contact extraction (email regex, phone regex, LinkedIn/GitHub URL detection)
        ├─ Project segmentation
        ├─ Health score computation (10 factors: contact, skills count, projects...)
        ├─ ATS suggestions generation
        └─ lowText flag if word count < threshold
    Returns { skills, education, projects, experience, certifications,
              contact, health: { score, breakdown }, suggestions, wordCount, lowText }

  STEP 3 — Gemini fallback parser (if Django returned low quality)
  → IF parsed.lowText OR (skills.length=0 AND projects.length=0):
      gemini.service.js → geminiParseFallback(text)
        → Prompts Gemini to extract structured JSON from raw text
        → Returns same schema as Django parser
        [Replaces parsed if Gemini succeeds]

  STEP 4 — Red-flag detection
  → resumeRedFlags.js → detectRedFlags(text, parsed)
      → Checks: missing contact info, no GitHub, no LinkedIn,
                no quantified achievements, too short, job-hopping signals...
      → Returns array of { key, label, description, fix, severity }

  STEP 5 — Gemini role-fit intelligence layer
  → gemini.service.js → geminiAnalyzeResume({ resumeText, parsedData, targetRole, skills })
      → Prompt: compare resume against user's dreamRole
      → Returns JSON: { roleFitScore, keyGaps, strengthAreas,
                        atsKeywordsMissing, recommendations, nextStepPriority }
      [Falls back to local heuristic if Gemini quota exceeded]

  STEP 6 — Persist to MongoDB
  → Resume.create({ user, fileUrl, skills, education, projects, experience,
                    certifications, contact, healthScore, healthBreakdown,
                    suggestions, redFlags, wordCount, lowText,
                    roleFitScore, keyGaps, strengthAreas, atsKeywordsMissing,
                    aiRecommendations, nextStepPriority })
  → user.profile.resumeUrl = fileUrl; user.save()

  STEP 7 — Pre-generate AI narrative (async, non-blocking if slow)
  → pathScore.service.js → buildPathScore(user, resume)  [pure function, no DB]
  → gemini.service.js → geminiExplainScore({ user, resume, pathScore })
      → Writes 3-4 paragraph coaching narrative
  → resume.aiNarrative = explanation; resume.save()

  STEP 8 — Create in-app notification
  → Notification.create({ user, title: 'Resume Processed', type: 'success' })

  STEP 9 — Return 201 response to client
  → { resume: <full resume doc> }
        │
        ▼
[CLIENT] TalentAnalyzerPage.jsx
  → Sets uploadState = 'done'
  → Displays health score, red flags, role fit score, key gaps
  → Refreshes Path Score panel (triggers GET /path-score)
```

**Key architectural decisions visible in this trace:**
1. **Django parses structure; Gemini adds intelligence** — clean separation of rule-based vs. LLM layers
2. **Gemini fallback at two levels**: full parse fallback (if Django returns low text) AND local heuristic fallback (if Gemini quota exceeded during analysis)
3. **AI narrative is pre-generated eagerly** but wrapped in try/catch — upload succeeds even if Gemini times out
4. **Resume history is preserved** — `Resume.create()` always inserts a new document; the UI reads `.sort({ createdAt: -1 })` for the latest
5. **Notifications are a side-effect** — the resume controller creates them, not a separate service call

---

> Phase 4 below.

---

## Phase 4 — The AI/ML Layer in Depth

PathPilot AI implements a **hybrid intelligence model**: deterministic rules and local ML models handle scale, speed, and baseline analytics, while Gemini LLM provides contextual, conversational, and qualitative insights.

---

### The 7 CatBoost/ML Models

All models live under `ai-service/ml/models/` and are trained via `ai-service/ml/training/train_all.py` on synthetic datasets generated by `ai-service/ml/utils/dataset_generator.py`.

```
                  ┌──────────────────────┐
                  │ extract_resume_feats │
                  └──────────┬───────────┘
                             │ (17-dim vector)
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │                      Unified Predict                   │
 └─┬─────────┬─────────┬─────────┬─────────┬─────────┬────┘
   │         │         │         │         │         │
   ▼         ▼         ▼         ▼         ▼         ▼
[Resume]   [ATS]   [Readiness] [RoleRec] [Interview] [Salary]
CatBoost  XGBoost   CatBoost     RF/GBM   Regressor  Regressor
(0-100)  (Pass/F)  (0=Beg...3) (10 class)  (0-100%)    (LPA)
   │                                                 ▲
   └─────────────── (role_encoded input) ────────────┘
```

#### 1. Resume Score (`resume_score`)
*   **Predicts:** Resume Quality Score (0 to 100).
*   **Algorithm:** CatBoost Regressor (RMSE ≈ 2.32, R² ≈ 0.90).
*   **Features (8):** `skills_count`, `projects`, `experience`, `education`, `has_github`, `has_linkedin`, `certifications`, `resume_length`.
*   **Confidence Calculation:** Heuristic regressor density (`_regressor_confidence()`). Calculated as the percentage of non-zero key signals present.
    *   $\geq 70\%$: High confidence.
    *   $40\% - 69\%$: Moderate confidence.
    *   $< 40\%$: Low confidence.

#### 2. ATS Pass Probability (`ats`)
*   **Predicts:** Pass/Fail (Binary classification) + probability.
*   **Algorithm:** XGBoost Classifier.
*   **Features (8):** Same 8 features as the Resume Score model.
*   **Confidence Calculation:** Classifier separation (`_classifier_confidence()`). Calculated using the spread between the class probabilities: $\text{score} = \text{spread} \times 100 + P(\text{top\_class}) \times 30$.

#### 3. Career Readiness (`career`)
*   **Predicts:** Readiness Level Index (0 = Beginner, 1 = Intermediate, 2 = Career Ready, 3 = Advanced).
*   **Algorithm:** CatBoost Classifier.
*   **Features (10):** Adds `internships` and `cgpa` to the baseline 8 features.
*   **Confidence Calculation:** Classifier separation on the predicted multi-class probability output.

#### 4. Role Recommendation (`role`)
*   **Predicts:** Best-fit role recommendation out of 10 standard categories.
*   **Algorithm:** Random Forest Classifier.
*   **Features (14):** Encodes the presence of specific key skill clusters (Frontend, Backend, Cloud, Data Sci, Mobile, DevOps, Security, UIUX, Management).
*   **Confidence Calculation:** Top-1 class probability spread vs. second-highest probability.

#### 5. Interview Success Probability (`interview`)
*   **Predicts:** Success probability in a mock interview (0% to 100%).
*   **Algorithm:** Random Forest Regressor.
*   **Features (6):** `skills_count`, `projects`, `internships`, `experience`, `certifications`, `cgpa`.
*   **Confidence Calculation:** Heuristic regressor density based on available signals.

#### 6. Salary Prediction (`salary`)
*   **Predicts:** Estimated starting salary in India in LPA (INR Lakhs Per Annum).
*   **Algorithm:** Random Forest Regressor.
*   **Features (8):** Same as interview model, plus `role_encoded` and `location_encoded`.
*   **Confidence Calculation:** Heuristic regressor density.

#### 7. Learning Path / Roadmap (`learning`)
*   **Predicts:** Key missing skills recommending what to study next.
*   **Algorithm:** K-Nearest Neighbors (KNN) with $k=5$.
*   **Features:** Multi-label binarizer array of current skills + `role_encoded`.
*   **Confidence Calculation:** Neighbor distance average (`_knn_confidence()`). Signature $100 / (1 + \text{avg\_distance} \times 0.5)$.

---

### Dataset Generation & Seeding

Since candidate training datasets mapping profile features to salary/readiness are not publicly available, `dataset_generator.py` generates high-quality synthetic data:
*   **Synthetic Logic:** Implements realistic correlation matrices. E.g., higher `experience` + `skills_count` dynamically scales `salaryLPA` upward with random Gaussian noise; `has_github` boosts `ats_pass` probability by 15%.
*   **Seeding command:** Re-run generators to train models locally:
    ```bash
    python -m ml.utils.dataset_generator     # Writes CSVs to ml/datasets/
    python -m ml.training.train_all           # Reads CSVs → writes PKLs to ml/models/
    ```

---

### SHAP Explanations

SHAP (SHapley Additive exPlanations) explains individual predictions by calculating how each feature pushed the model's output away from the base value.

```
Base Value (e.g. 68.5) ──► +5.2 (has_github=1) ──► -3.1 (experience=0) ──► Prediction (70.6)
```

#### How they are generated at request time:
1. When `POST /api/predict/` runs, it loads the cached models.
2. In `explainer.py`, a `shap.TreeExplainer` is retrieved (created lazily once and cached in `_explainers`).
3. The model type is inspected. If it's a tree model (CatBoost/XGBoost/RF), `TreeExplainer` executes. If SHAP is missing or it's a linear model, it falls back to a background-summarized `KernelExplainer`.
4. `explainer(X_input)` calculates the SHAP values vector.
5. The raw array is zipped with the canonical feature column names, mapped to directions (`positive` if $>0$, `negative` if $<0$), and sorted descending by absolute impact.

#### Translation to UI Drivers:
- **Top Positive Drivers:** Features with a positive impact (e.g. `has_github` = +12.3) are mapped to **"Strengths"** or positive drivers (e.g. "Github profile added: +12%").
- **Top Negative Drivers:** Features with a negative impact (e.g. `experience` = -8.4) are mapped to **"Gaps"** or negative drivers (e.g. "Lack of experience: -8%").
- **Visual Presentation:** `OverviewPage.jsx` renders these using horizontal bar charts, showing exactly what steps will yield the highest increase in their score.

---

### Gemini Fallback Paths

Since Gemini API keys can experience rate-limiting (quota errors) or latency spikes, the backend provides fallback coverage.

```
                    ┌─────────────────────────┐
                    │  Call Gemini API (LLM)  │
                    └───────────┬─────────────┘
                                │
                  ┌─────────────┴─────────────┐
        Success   │                           │   Quota/Timeout/Error
     ┌────────────┴──┐                     ┌──┴─────────────┐
     │ Return JSON   │                     │ Local Heuristic│
     │ from LLM      │                     │ Fallback runs  │
     └───────────────┘                     └──┬─────────────┘
                                              │
                       ┌──────────────────────┴──────────────────────┐
                       │ • Inspects candidate skills (lowercase list)│
                       │ • Pulls target role expected skills         │
                       │ • Calculates overlap to compute Fit Score    │
                       │ • Pulls default ATS keywords + key gaps      │
                       │ • Returns structure matching Gemini spec    │
                       └─────────────────────────────────────────────┘
```

#### 1. Resume Parsing Fallback (`geminiParseFallback`)
- **Trigger:** Django's text parser returns `lowText=true` or zero projects/skills.
- **Action:** Node calls `geminiParseFallback(text)`. Gemini attempts to extract structured details that the regex parser missed (common in two-column PDFs with complex tables). If Gemini fails here, the system falls back to a minimal empty profile so onboarding does not crash.

#### 2. Resume Target-Fit Analysis Fallback (`getLocalResumeFallback`)
- **Trigger:** Gemini API returns a 429 (rate limit), 503 (overloaded), or fails due to network timeout during the resume-fit analysis step.
- **Action:** Caught by `gemini.service.js` which immediately invokes `getLocalResumeFallback(parsedData, targetRole)`.
- **Heuristic Logic:**
    1. Maps `targetRole` to standard clusters (Frontend, Backend, Data/ML).
    2. Compares the user's `skills` array against the target cluster's expected list (e.g., matching a Frontend user against `[react, javascript, html, css, typescript, tailwind]`).
    3. Calculates matching count as a percentage to set `roleFitScore`.
    4. Evaluates missing expected skills to populate `keyGaps` and `atsKeywordsMissing`.
    5. Returns a mock-narrative object with the exact JSON structure of the Gemini response.

---

> Phase 5 below.

---

## Phase 5 — Database Schemas & Relationships

PathPilot AI uses a clean, index-optimized Mongoose schema system. Below is the detailed structure of all 8 primary database collections.

```
       ┌────────────────────────┐
       │         users          │◄──────────────────────┐
       └───────────┬────────────┘                       │
                   │ (1:1 embed)                        │
                   ▼                                    │
         ┌───────────────────┐                          │
         │   profileSchema   │                          │
         └───────────────────┘                          │
                   │                                    │
        ┌──────────┼───────────┬────────────┐           │ (1:N)
        │ (1:N)    │ (1:1)     │ (1:N)      │ (1:N)     │
        ▼          ▼           ▼            ▼           │
   ┌─────────┐┌───────────┐┌─────────┐┌───────────┐     │
   │ resumes ││growthplans││ opportu-││interview- │     │
   └─────────┘└───────────┘│ nities  ││ sessions  │     │
                           └─────────┘└───────────┘     │
                                                        │
┌──────────────────────┐   ┌──────────────────────┐     │
│ jobmarketsnapshots   │   │    livejobcaches     │     │
└──────────────────────┘   └──────────────────────┘     │
  (Cron populated)           (TTL Cached: 6 hours)      │
                                                        │
┌───────────────────────────────────────────────────────┘
│ (1:N)
▼
┌──────────────────────┐
│    notifications     │
└──────────────────────┘
```

---

### Mongoose Collection Details

#### 1. `users` (User Model)
*   **Purpose:** Core user account and profile settings.
*   **Schema highlights:**
    *   `profile` is an embedded schema containing `college`, `branch`, `semester`, `dreamRole`, `skills`, `resumeUrl`, and `avatarUrl`. (Embedded since it is unique to the user, loaded on every session, and eliminates separate joins).
    *   `publicCardId`: A unique 24-character hexadecimal slug generated automatically (`crypto.randomBytes(12)`). Used for public sharing of the card if `isPublicCardEnabled` is `true`.
*   **Indexes:**
    *   `email: 1` (unique)
    *   `publicCardId: 1` (unique)

#### 2. `resumes` (Resume Model)
*   **Purpose:** Persists raw text, extracted structure, and Gemini analysis for every resume upload.
*   **Relationship:** Refers to `User` ($1:N$). Surfaced in the UI by querying the newest document for a user.
*   **Schema highlights:**
    *   `projects`: Embedded sub-document array with `title` and `description`.
    *   `healthBreakdown`: List of 10 evaluated factors (e.g. "github", "education") with a score, max value, status flag (`good`, `warn`, `bad`), and an actionable tip.
    *   `redFlags`: Embedded array of detected issues with keys, labels, descriptions, recommendations, and severity levels.
    *   **Gemini layer:** `roleFitScore`, `keyGaps`, `strengthAreas`, `atsKeywordsMissing`, `aiRecommendations`, `nextStepPriority`, and `aiNarrative` (long narrative explanation).
*   **Indexes:**
    *   `user: 1`

#### 3. `growthplans` (GrowthPlan Model)
*   **Purpose:** The student's current learning roadmap and weekly task list.
*   **Relationship:** Refers to `User` ($1:1$ unique constraint).
*   **Schema highlights:**
    *   `weeks`: Array of week objects. Each week has a `week` number, `title`, `focusHours`, and `tasks`.
    *   `tasks`: Array of tasks. Each task has a stable `key` (e.g., `"node-js"`), `skill`, `title`, `priority` (`core`, `recommended`, `supporting`), `difficulty`, `estimatedHours`, `completed` flag, and `completedAt` timestamp.
*   **Indexes:**
    *   `user: 1` (unique)

#### 4. `opportunities` (Opportunity Model)
*   **Purpose:** Tracks internships and job applications on a Kanban board.
*   **Relationship:** Refers to `User` ($1:N$).
*   **Schema highlights:**
    *   `stage`: Enum matching typical stages: `wishlist`, `applied`, `oa` (online assessment), `interview`, `hr`, `offer`, `rejected`.
    *   `timeline`: Embedded array of `timelineEntrySchema` tracking every stage change with date and optional notes.
    *   `fitScore`: Embedded calculations calculated at runtime comparing the opportunity to the user's latest resume analysis (`roleFit`, `atsPass`, `interviewSuccess` probabilities, and a confidence tag).
*   **Indexes:**
    *   `user: 1, updatedAt: -1` (compound index for fast query of a student's pipeline, sorted by most recently modified first)

#### 5. `interviewsessions` (InterviewSession Model)
*   **Purpose:** Historical records of completed mock interviews.
*   **Relationship:** Refers to `User` ($1:N$).
*   **Schema highlights:**
    *   `questions`: Embedded array of evaluated answers. Tracks the `question`, candidate's `answer`, `gapAddressed`, `totalScore`, `grade`, strengths, improvements, model answer, and time taken in seconds.
*   **Indexes:**
    *   `user: 1`

#### 6. `jobmarketsnapshots` (JobMarketSnapshot Model)
*   **Purpose:** Aggregated analytics of skills and salaries from live listings.
*   **Relationship:** Independent. Populated weekly by the Adzuna cron task.
*   **Schema highlights:**
    *   `role` / `skill`: The query keys.
    *   `frequency`: Percentage of matching job postings containing this skill.
    *   `avgSalaryRange`: `{ min, max }` in LPA.
    *   `weekOf`: Monday of the ISO week.
*   **Indexes:**
    *   `role: 1, weekOf: -1` (compound index for fast lookup of a role's latest snapshots)
    *   `role: 1, skill: 1, weekOf: 1` (unique compound index to prevent duplicate inserts when rerun)

#### 7. `livejobcaches` (LiveJobCache Model)
*   **Purpose:** MongoDB-backed cache for live job openings returned by the TheirStack API.
*   **Relationship:** Independent. Used by `liveJobs.service.js`.
*   **Schema highlights:**
    *   `role`: Lowercase query string.
    *   `countryCode`: E.g., `"in"`.
    *   `jobs`: Array of normalized job listings (title, company, salary bounds, apply link).
    *   `fetchedAt`: Anchor field for TTL eviction.
*   **Indexes:**
    *   `role: 1, countryCode: 1` (unique)
    *   `fetchedAt: 1` with an `expireAfterSeconds` parameter set to 21600 seconds (6 hours). MongoDB automatically removes expired documents.

#### 8. `notifications` (Notification Model)
*   **Purpose:** User alerts (e.g., "Resume upload successful").
*   **Relationship:** Refers to `User` ($1:N$).
*   **Indexes:**
    *   `user: 1, read: 1, createdAt: -1` (compound index for fast query of unread alerts, newest first)

---

> Phase 6 below.

---

## Phase 6 — State Management & API Communications

PathPilot AI is architected with a decoupled frontend/backend structure, relying on single-origin session delegation via proxies, in-memory React contexts, and a dual-token automatic rotating credential handshake.

---

### React State Management: `AuthContext`

The React app does not use Redux. Instead, it relies on standard React Context (`AuthContext.jsx`) to manage global user state.

```
                  ┌──────────────────────┐
                  │     AuthProvider     │
                  └──────────┬───────────┘
                             │ (Exposes user, setUser, loading,
                             │  isAuthenticated, login, logout, refreshUser)
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │                 Children components                    │
  │  (e.g., AppShell, OverviewPage via useAuth() hook)      │
  └────────────────────────────────────────────────────────┘
```

#### Silent Session Restore:
- On initial mount, a React `useEffect` in `AuthProvider` fires a post request to `/api/auth/refresh`.
- If a valid `httpOnly` refresh token cookie exists, the backend returns a new access token.
- `setAccessToken()` writes the token to local memory and `localStorage`.
- The provider calls `/api/auth/me` to fetch the complete user object, sets `setUser(user)`, and flips `loading` to `false`.
- This ensures page reloads preserve the session seamlessly without flashing login screens.

---

### Axios Silent Refresh-on-401 Interceptor

All API calls from the client go through the Axios singleton defined in `client/src/lib/api.js`.

```
                  [ CLIENT API CALL ]
                          │
                          ▼
            Does access token exist?
            ├─ YES: Attach `Bearer <token>` to headers
            └─ NO:  Send request without auth
                          │
                          ▼
                [ BACKEND RETURNS ]
                /        \
          Success (2xx)   401 Unauthorized
               │            │
            Return        Is it an auth route or already retried?
             data         ├─ YES: Reject error immediately
                          └─ NO:  Set _retry = true
                                    │
                                    ▼
                          [ SILENT ROTATION ]
                            Post to `/auth/refresh`
                            ├─ Success: Write new access token
                            │           Re-dispatch original request
                            └─ Fail:    Set access token = null
                                        Redirect to /login
```

#### Code Implementation Details:
- **`withCredentials: true`** is hardcoded in the Axios creation params to ensure browser cookies (the refresh token) are included in same-site requests.
- **Concurrent 401 De-duplication:** To prevent multiple concurrent 401s (e.g., when a page mounts and fires 3 parallel requests) from triggering duplicate refresh token rotations, the interceptor uses a `refreshing` promise cache:
    ```javascript
    refreshing = refreshing || api.post('/auth/refresh').finally(() => { refreshing = null; });
    const { data } = await refreshing;
    ```
    This coordinates parallel failures so they all await the same refresh flight.

---

### Page-Level Data Loading Strategy

PathPilot AI uses a **pull-on-mount / local-state** loading pattern. It does not synchronize page data in a global client state manager.

#### Example: Dashboard (`OverviewPage.jsx`)
1. **Initial Mount:** When the user hits `/dashboard`, `useEffect` fires immediately.
2. **Parallel Fetching:** It runs `Promise.all` calling:
    - `api.get('/path-score')` (pulls Path Score breakdown, ML readiness level, salary, and benchmarks).
    - `api.get('/growth')` (pulls week-by-week roadmap progress).
3. **Graceful Failures:** Roadmap 404s (e.g., if not generated yet) are caught locally so they do not block the dashboard from rendering the resume upload prompt:
    ```javascript
    api.get('/growth').catch(() => ({ data: { data: { plan: null } } }))
    ```
4. **AI Narrative Trigger:** If the user has a resume uploaded, a separate, non-blocking call is made to `api.post('/ai-coach/explain')` to fetch the Gemini coaching narrative. This keeps the initial page load fast.
5. **Role Modification (Soft Re-fetch):** If the user changes their dream role dropdown, the page patches the profile, resets the narrative container to a loading spinner, and runs `Promise.all` on `/path-score` and `/growth` again to refresh the scores inline without triggering a page reload.

---

> Phase 7 below.

---

## Phase 7 — Verification Checklist & Good First Issues

This final phase provides a concrete checklist to verify your local stack is fully operational, followed by target features to build next.

---

### Local Environment Verification Checklist

Follow these steps sequentially to confirm all integration links are active:

- [ ] **Step 1: Database Seeding**
    *   Command: `cd server && npm run seed`
    *   Verification: Open MongoDB Compass or check console logs. You should see `Admin`, `Student`, and `New` accounts added to the `users` collection.
- [ ] **Step 2: Start Services & Login**
    *   Terminal 1: `cd server && npm run dev` (Port 5000)
    *   Terminal 2: `cd client && npm run dev` (Port 5173)
    *   Terminal 3: `cd ai-service && venv\Scripts\activate && python manage.py runserver 8000`
    *   Action: Open `http://localhost:5173`. Log in using `student@pathpilot.ai` / `Student@1234`.
- [ ] **Step 3: Test ML Predict (CatBoost/SHAP Link)**
    *   Action: Log in and visit the dashboard.
    *   Behind the scenes: The client triggers `GET /api/path-score` which sends an internal REST call to `http://localhost:8000/api/predict/`.
    *   Verification: The terminal running `ai-service` should print `SHAP Result: {'success': True, ...}`. The frontend should display a non-zero "Path Score" and "Score Breakdown".
- [ ] **Step 4: Test Resume Upload & Parsing**
    *   Action: Go to **Talent Analyzer** → click **Analyze Resume**. Upload any standard PDF or DOCX resume.
    *   Verification: Verify that:
        1. A file is written to `server/uploads/resumes/`.
        2. Django console shows `POST /api/resume/parse/ 200`.
        3. Node console shows `[Gemini] Analyze resume completed successfully`.
        4. The frontend UI transitions from "uploading" to displaying parsed skills, red flags, and ATS gaps.
- [ ] **Step 5: Test AI Mock Interview Coach**
    *   Action: Go to **Interview Prep** → select an identified gap → click **Start Interview**.
    *   Verification:
        1. The coach displays a Gemini-generated question.
        2. Speak or type a short response and click **Submit Answer**.
        3. The screen should show detailed rubric scores, a grade, and a model answer.

---

### Good First Issues (Coding Exercises)

To build hands-on familiarity with the codebase, try implementing these targeted improvements:

#### Issue 1: Add a "Project Density" Red Flag
*   **Goal:** Flag resumes that have project descriptions that are too brief (e.g. fewer than 10 words).
*   **Where to edit:** `server/src/services/resumeRedFlags.js`
*   **Implementation:** Add a check in `detectRedFlags()` iterating over `parsedData.projects`. If a project has a description but it is extremely short, push a new warning object:
    ```javascript
    {
      key: 'shallow_projects',
      label: 'Shallow Project Descriptions',
      description: 'Some of your projects lack descriptive detail.',
      fix: 'Use the STAR method (Situation, Task, Action, Result) to detail your impact.',
      severity: 'warning'
    }
    ```

#### Issue 2: Inject CGPA into the Path Score Formula
*   **Goal:** Include the candidate's CGPA (if available) as a factor in the overall Path Score.
*   **Where to edit:** `server/src/services/pathScore.service.js`
*   **Implementation:** Locate `buildPathScore()`. Extract the user's CGPA (from the latest resume if parsed). Add a new factor to `factors`:
    ```javascript
    const cgpa = resume.education_gpa || 0; // locate or parse
    factors.push({
      key: 'cgpa',
      label: 'Academic Standing (CGPA)',
      score: cgpa,
      max: 10,
      percent: (cgpa / 10) * 100,
      status: cgpa >= 8 ? 'good' : cgpa >= 6.5 ? 'warn' : 'bad',
      tip: 'Maintain a CGPA above 8.0 to pass initial screening filters.'
    });
    ```
    Recalculate `rawScore` weighting to incorporate this new factor.

#### Issue 3: Implement an Opportunity Fit Score Recalculator
*   **Goal:** Automatically update Kanban application fit-scores whenever a student uploads a new resume.
*   **Where to edit:** `server/src/controllers/resume.controller.js`
*   **Implementation:** In `analyzeResume()` after the new `Resume` document is successfully saved to the database, search for all Kanban opportunities belonging to the user (`Opportunity.find({ user: userId })`). Loop through them, recalculate their fit scores against the new resume, and save the updated documents.

---

This concludes your PathPilot AI architectural onboarding manual. You are now ready to write code, debug models, and build features. Good luck!

---

> Phase 8 below — Design System, Recent Fixes, and Gotchas.

---

## Phase 8 — Design System, Recent Bug Fixes & Gotchas

_Added 2026-07-24. This phase documents the front-end design language (which has strict rules), three critical backend bugs that were fixed, and known runtime gotchas that will trip you up if you're unaware of them._

---

### 8.1 — The PathPilot Design System (`client/src/index.css`)

PathPilot uses **Tailwind CSS v4** with a custom `@theme` block in `index.css`. The design token vocabulary is fixed — do **not** invent new colors, radii, or shadows. Always use the tokens below.

#### Color Tokens

| Token | Hex | Usage |
|---|---|---|
| `--color-brand` | `#2B4C3F` | Primary forest green — CTAs, active states, progress bars, score fill |
| `--color-brand-soft` | `#4A7A6A` | Brand gradient endpoint, hover accent |
| `--color-ink` | `#171717` | Default body text, headings |
| `--color-canvas` | `#FBFBFA` | Page background, input backgrounds |
| `--color-surface` | `#F5F5F3` | Card inner backgrounds, badges |
| `--color-surface-2` | `#EAEAE5` | Borders, dividers, pill backgrounds |
| `--color-muted` | `#525252` | Secondary text, subtitles |
| `--color-faint` | `#A3A3A3` | Placeholder text, disabled states, empty-state icons |
| `--color-line` | `#D0D0CA` | Dashed border color for empty states |
| `--color-warning` | `#92400E` | Amber warning text (amber pills, core-priority weeks) |
| `--color-danger` | `#B85A3C` | Error / destructive states, rejected stage color |

#### Typography

| Class | Font | Usage |
|---|---|---|
| `font-serif` | Merriweather | **All page titles** (`h1`, `h2`), score numbers, hero labels |
| `font-sans` | Inter | Everything else — body, labels, buttons, captions |
| `font-mono` | Fira Code / system mono | Flight-strip index badges (`01`, `02`), code snippets |

**Rule:** Every page-level `<h1>` and section `<h2>` must use `font-serif`. Sub-headings (`h3` and below), body copy, buttons, and badges use `font-sans`.

#### Core CSS Classes (from `index.css`)

These classes are defined globally and must be used instead of reinventing them with raw Tailwind:

| Class | What it applies | When to use |
|---|---|---|
| `.card` | `bg-white border border-[#EAEAE5] rounded-2xl shadow-sm` | Every card-like container. Default. |
| `.matte-card` | Slightly warmer card with `bg-[#FBFBFA]` | Feature cards, stat cards on dark sections. |
| `.card-hover` | `hover:shadow-md hover:border-[#D0D0CA] transition-shadow` | Add to `.card` when the card is clickable. |
| `.matte-card-hover` | Same hover animation tuned for `.matte-card` | Add to `.matte-card` when clickable. |
| `.btn-editorial` | Full design system button — dark background, rounded-xl, Inter 600 | All primary action buttons. |
| `.input` | Form input with brand focus ring, rounded-xl, correct padding | All `<input>`, `<select>`, `<textarea>`. |
| `.banner-premium` | Gradient banner band for section headers | Hero sub-banners, upgrade prompts. |
| `.nav-frosted` | Backdrop-blur nav background | TopNav bar. |
| `.text-gradient` | Gradient text from `--color-brand` to `--color-brand-soft` | Brand taglines, metric highlights. |
| `.section-divider` | Styled horizontal rule with fade edges | Between major page sections. |
| `.progress-ruler` | Thin track bar background for progress fills | Roadmap week progress bars. |
| `.metric-glow` | Subtle box-shadow glow around metric numbers | ScoreGauge central number. |

**Rules enforced by code review:**
1. Every card-like container → `.card` or `.matte-card` + hover modifier. Never `bg-white border border-gray-200` raw.
2. Every border-radius → `rounded-xl` (16px) or `rounded-2xl` (24px). Never `rounded-md` or `rounded-lg` scattered inconsistently.
3. Status badges → dot (4px circle, `--color-brand`) + label text on `--color-surface-2` pill with `rounded-xl`.
4. Empty states → outline icon in `--color-faint`, `font-sans medium` headline in `--color-ink`, `--color-muted` body, dashed `--color-line` border box with `rounded-2xl`.

#### Animation Utilities

| Class | Effect | Usage |
|---|---|---|
| `.animate-fade-up` | Fade in + translate up 12px, 0.4s ease | Applied to page sections, cards entering viewport |
| `.stagger-1` … `.stagger-5` | `animation-delay` from 0.05s to 0.25s | Add to list items alongside `.animate-fade-up` for cascading entrance |
| `.animate-count-up` | CSS counter animation for numeric values | Applied to `<span>` wrapping metric numbers (Path Score, task counts) |

---

### 8.2 — Component Patterns

#### ScoreGauge (`src/components/charts/ScoreGauge.jsx`)

This is **not a Recharts component**. It is a hand-crafted SVG gauge.

```jsx
<ScoreGauge score={78} size={160} />
```

Internals:
- **SVG arc:** Two overlaid `<circle>` elements using `strokeDashoffset` to draw a gradient arc from `--color-brand` to `--color-brand-soft`. The gradient is defined via a `<linearGradient>` in an `<defs>` block.
- **Tick marks:** 10 `<line>` elements rotated around the circumference.
- **Animation:** `framer-motion` animates `strokeDashoffset` from 0 to the target value over 1.2 seconds with a spring easing.
- **Central number:** `<motion.span>` inside an `absolute` div, styled with `font-serif text-4xl font-black` + `metric-glow`.
- **Usage locations:** `OverviewPage.jsx` (Dashboard), `PublicProfilePage.jsx` (Public career card).

#### Flight-Strip Roadmap Pattern (`ExecutionEnginePage.jsx` — `WeekCard`)

Each learning week is rendered as a "flight-strip" card:

```
[ 01 ]  Week Title                                  ──── 40% ▼
        AI-personalized from your resume gaps · ~6 hrs · 3/8 tasks
```

- **Index badge:** `font-mono text-sm font-bold` in a `bg-[#F5F5F3] border border-[#EAEAE5] rounded-lg px-2.5 py-1.5` box. Left-padded to 2 digits with `String.padStart(2, '0')`.
- **Left accent bar:** 4px `border-l` in one of three colors:
  - `border-l-[#2B4C3F]` (brand green) → gap-targeted weeks (tasks whose `key` starts with `gap-task-`)
  - `border-l-[#92400E]` (amber) → `priority: 'core'` or `'high'` weeks
  - `border-l-[#D0D0CA]` (line) → supporting / filler weeks
- **Entrance animation:** `.card.animate-fade-up.stagger-{1..5}` where stagger index = `weekIndex % 5 + 1`.

#### Dot+Label Status Pill Pattern

Used for skill badges (TalentAnalyzer), user status (AdminPage), and notification types.

```jsx
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-xs font-semibold border border-[#C8DDD6] text-[#2B4C3F] bg-[#F0F5F3]">
  <span className="h-1.5 w-1.5 rounded-full bg-[#2B4C3F]" />
  Matched
</span>
```

Color variants:
| State | Dot color | Text color | Border | Background |
|---|---|---|---|---|
| Matched / Active | `#2B4C3F` | `#2B4C3F` | `#C8DDD6` | `#F0F5F3` |
| Missing / Warning | `#92400E` | `#92400E` | `#E8D8A8` | `#FEFBF0` |
| Error / Rejected | `#B85A3C` | `#B85A3C` | `#E8C4B8` | `#FDF5F3` |
| Neutral / Muted | `#A3A3A3` | `#525252` | `#EAEAE5` | `#F5F5F3` |

#### Global Error Boundary (`src/components/ErrorBoundary.jsx`)

A React class component (`extends React.Component`) that wraps the full router tree inside `App.jsx`.

- **Catches:** Any uncaught JavaScript exception thrown during a component render, lifecycle method, or constructor of a descendant.
- **Shows:** A centered error card with `Icon.AlertTriangle`, the literal `error.message`, and a "Reload Page" button that calls `window.location.reload()`.
- **Also logs:** `console.error(error, errorInfo)` so the error still appears in DevTools.
- **Integration:** Placed inside `<BrowserRouter>` but outside `<Suspense>` in `App.jsx` so it catches both lazy-load errors and runtime render errors.

---

### 8.3 — Known Bug Fixes (What Was Broken & Why)

These three bugs caused user-visible problems and have been patched. Understanding them will prevent you from reintroducing them.

#### Known Bug Fix #1: Path Score Override in Insights

**File:** `server/src/controllers/insights.controller.js`

**Bug:** The `/api/insights` endpoint was calling `pathScore.service.js → buildPathScore()` internally to compute a "fresh" score for the insights panel. However, `buildPathScore()` returns a raw unweighted average across factors that differs from the composite weighted score shown on the dashboard (which goes through additional ML prediction weighting). This meant the score displayed in the Insights panel would often be 5–15 points higher or lower than the dashboard score, causing user confusion.

**Fix:** The insights controller now reads `resume.pathScore` (the stored composite value) directly from MongoDB instead of recomputing it. If no resume exists, it defaults to `0`. Never call `buildPathScore()` from the insights controller.

```js
// WRONG — recomputes a different value
const fresh = buildPathScore(user, resume);

// CORRECT — read the stored composite
const pathScore = resume?.pathScore ?? 0;
```

---

#### Known Bug Fix #2: Stale AI Narrative After Role Change

**Files:** `server/src/controllers/resume.controller.js` + `server/src/controllers/profile.controller.js`

**Bug:** The Gemini AI narrative (`resume.aiNarrative`) is pre-generated during resume upload against the user's `dreamRole` at that moment. If the user later changed their target role via the Profile or Skill Roadmap page, the `dreamRole` was updated in the `user.profile` but the old narrative (written for the previous role) remained on the `resume` document. The dashboard would then show a stale coaching paragraph that described the wrong role.

**Fix:** Any controller that updates `user.profile.dreamRole` must also clear `resume.aiNarrative`:

```js
// In profile.controller.js → updateProfile()
if (updates.dreamRole && updates.dreamRole !== user.profile.dreamRole) {
  // Invalidate stale narrative — will be regenerated on next /dashboard load
  await Resume.findOneAndUpdate(
    { user: userId },
    { $set: { aiNarrative: '' } },
    { sort: { createdAt: -1 } }
  );
}
```

The same invalidation is applied in `resume.controller.js → reanalyzeForRole()` when a role is re-analyzed without a new file upload.

---

#### Known Bug Fix #3: Blank Screen on ExecutionEnginePage After Data Load

**File:** `client/src/pages/ExecutionEnginePage.jsx`

**Root Cause (two layers):**

1. **Missing icon:** The Kanban column empty-state UI referenced `<Icon.Layers />`. The `Layers` SVG was not defined on the `Icon` export object in `icons.jsx`, so `Icon.Layers` evaluated to `undefined`. React threw `TypeError: Element type is invalid: expected a string ... but got undefined` during the render phase of the Kanban board.

2. **Truncated JSX string:** During an earlier edit, a string in the empty-state JSX was accidentally truncated (`text-[#17...`), producing an unterminated string literal that caused a Vite build error after the initial Suspense spinner was dismissed.

**Sequence:** The page loaded the spinner (Suspense). Once `loadOpportunities()` / `loadLiveJobs()` resolved and triggered a state update, React attempted to re-render the Kanban board. The invalid `Icon.Layers` reference caused a throw during render. Because there was no Error Boundary, React unmounted the entire component tree, leaving a white screen.

**Fix applied:**
1. Added `Layers` to `src/components/ui/icons.jsx`.
2. Fixed the truncated JSX string.
3. Added null/undefined guards to `KanbanCard`, `RadarJobRow`, `WeekCard`, and `RoadmapView` components.
4. Wrapped the full router tree in `<ErrorBoundary>` so future render crashes display a friendly error card instead of a blank screen.

**Guard pattern used throughout ExecutionEnginePage:**
```jsx
// Guard at component top — bail out if data is missing
function KanbanCard({ opp }) {
  if (!opp || typeof opp !== 'object') return null;
  const company = opp.company || opp.companyName || 'Company';
  // ...
}

// Guard in map calls — use index as fallback key
cards.map((opp, oIdx) => (
  <KanbanCard key={opp?._id || opp?.id || oIdx} opp={opp} />
))
```

---

### 8.4 — Golden Rules for Future Development

1. **Never add a raw icon to the UI without defining it in `icons.jsx` first.** The custom icon library has no tree-shaking fallback — an undefined reference will crash the renderer silently in production.

2. **Always clear `resume.aiNarrative` when changing `dreamRole`.** The narrative is role-specific. A stale one is worse than no narrative (it actively misleads the user).

3. **Never call `buildPathScore()` from the insights or reporting layers.** It returns a raw unweighted value. The stored `resume.pathScore` is the authoritative composite.

4. **All new card containers must use `.card` or `.matte-card`.** Raw `bg-white border border-gray-200` bypasses the design system and will be flagged in code review.

5. **All new form fields must use `.input`.** Never add inline border/focus styles to `<input>` elements.

6. **Guard every async-populated array before rendering.** If a `map()` runs over data fetched from an API, add `if (!item || typeof item !== 'object') return null;` at the top of the child component. API data is never guaranteed to be well-formed.

7. **Test the Error Boundary works.** After deploying any new page, temporarily throw an error inside a `useEffect` and confirm the boundary card appears instead of a blank screen.

---

This concludes your PathPilot AI architectural onboarding manual. You are now ready to write code, debug models, and build features. Good luck!
