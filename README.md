# PathPilot AI

> Navigate Your Career. Powered by Intelligence.

An AI-powered **Career Intelligence Platform** for students. PathPilot doesn't find
jobs for you — it helps you understand your current career readiness, identify skill gaps,
build and refine your resume, follow a personalized learning roadmap, practice interviews,
track applications, and become job-ready.

Think of it as your personal **career operating system**.

---

## Architecture

```
React Frontend  ──►  Node.js / Express API  ──►  MongoDB (Atlas)
                              │
                              ├──►  Django AI Service (7 trained ML models + SHAP)
                              ├──►  Google Gemini (LLM career coaching, interview AI, resume writing)
                              ├──►  Firebase Admin (verifies Google Sign-In tokens)
                              ├──►  Adzuna API (weekly job-market skill/salary data)
                              └──►  TheirStack API (live job openings, cached)
```

- The **React** frontend talks **only** to the Node backend.
- **Node** owns business logic, authentication, MongoDB, file uploads, and all third-party API calls.
- When AI is needed, Node calls the **Django** service over REST (internal-key gated) and/or invokes the **Gemini SDK** directly.
- The frontend **never** talks to Django directly, and no request from the browser can reach Django without going through Node first.

For a full architectural deep-dive (folder maps, sequence diagrams, DB schema, complete API reference), see [`pathpilot_documentation.md`](./pathpilot_documentation.md).

---

## Tech Stack

| Layer      | Technology                                                                 |
| ---------- | --------------------------------------------------------------------------- |
| Frontend   | React 19, Vite 8, React Router 7, Tailwind CSS v4, Framer Motion, Recharts, Axios |
| Backend    | Node.js (ESM), Express 4, MongoDB (Mongoose 8), JWT (access + refresh)     |
| Auth       | Email/password (bcrypt) + Google Sign-In (Firebase Auth + firebase-admin) |
| AI Engine  | Google Gemini (resume intelligence, mock interviews, coaching chat, resume-builder writing assistance) |
| ML Service | Django REST Framework, Python, CatBoost / XGBoost / LightGBM / Random Forest / KNN, SHAP |
| Export     | `@react-pdf/renderer` (PDF), `docx` (Word) — resume builder & career report |
| Charts     | Recharts + hand-rolled SVG (`ScoreGauge`, radar/histogram/trendline components) |

---

## Monorepo Layout

```
pathpilot-ai/
├── client/       React + Vite frontend
├── server/       Node.js / Express API (MongoDB + Gemini + Firebase + Django bridge)
├── ai-service/   Django + DRF machine-learning service
└── README.md
```

---

## Core Features

### 1 · Overview Dashboard (`/dashboard`)
- **Path Score** — A composite 0–100 career readiness score calculated from resume quality, skills, projects, and profile completeness.
- **Score Breakdown** — Factor bars showing the contribution of each dimension.
- **PathPilot AI Analysis** — Gemini-powered narrative career audit personalized to the user's target role.
- **Peer Benchmarking** — Anonymous percentile comparison against other students targeting the same role, with a score-distribution histogram and per-factor breakdown.
- **Live Market Alignment & Salary** — Real-time skill match rate and salary range vs. current job listings (Adzuna).
- **Live Opportunities Widget** — Preview of live job openings for the user's target role.
- **Smart CTA Engine** — Dynamically surfaces the highest-impact next action (build resume → analyze → build roadmap → practice interview).
- **Product Tour** — First-login guided walkthrough (driver.js).

### 2 · Resume Builder (`/resume-builder`)
- **Three entry modes** — Start from scratch, import your already-analyzed resume, or migrate an uploaded PDF/DOCX into a clean template.
- **Section-by-section editor** — Contact, summary, experience, skills, projects, education, with autosave.
- **Live ATS Score** — Deterministic heuristic score (keyword match, readability, bullet strength) that updates as you type.
- **AI writing assistance** — Rewrite a bullet, generate a summary, run a full-resume optimization scan, match against a pasted job description, and auto-insert missing keywords — all via Gemini.
- **Export** — PDF (3 templates: Minimal, Modern, Classic), DOCX, or plain text.

### 3 · Resume Strategy (`/talent-analyzer`)
- **Resume Upload & Parsing** — Coordinate-aware PDF/DOCX text extraction, Django rule-based parsing, and a Gemini fallback/sanity-check pass for complex layouts.
- **AI Role Analysis** — Role-fit score, key gaps, strengths, and missing ATS keywords from Gemini.
- **Recruiter First Impression** — Rule-based red-flag detection (missing links, generic objectives, unquantified bullets, inconsistent dates, unexplained gaps) plus a "Fix Helper" drawer with copy-paste AI suggestions.
- **Market Alignment** — Skill demand percentages sourced from live Adzuna job postings.
- **Live Jobs** — Real-time listings with save/match-tier scoring, powered by TheirStack.

### 4 · Skill Roadmap & Opportunities (`/execution-engine`)
- **AI-Generated Weekly Plan** — A deterministic roadmap builder packs missing skills into ~8h/week blocks; Gemini injects extra weeks targeting the user's exact resume gaps.
- **Progress Preservation** — Completed tasks carry over automatically when the roadmap is regenerated.
- **Job Application Kanban** — 7-stage pipeline (Wishlist → Applied → OA → Interview → HR → Offer/Rejected) with drag-and-drop, a full stage-change timeline, and an ML-derived fit score per opportunity.
- **Active Market Radar** — Live job openings feed alongside the pipeline.

### 5 · AI Mock Interview Coach (`/interview-prep`)
- **Gap-Targeted Questions** — Gemini generates role-specific questions targeting the user's actual resume gaps.
- **Voice Dictation** — Web Speech API integration (Chrome/Edge) with a live waveform visualizer.
- **Live Session Timer & Speech Fluency Metrics** — Words-per-minute pace and filler-word detection.
- **Rubric Evaluation** — Gemini scores relevance, depth, and communication with strengths, improvements, and a model answer.
- **Interview Analytics** — Score-over-time trend, topic-category breakdown radar, improvement highlights, and full session history with per-question review.

### 6 · Career Report (`/report`)
- Print-optimized, exportable summary of Path Score, factors, skills, resume insights, and roadmap progress.

### 7 · Public Career Profile (`/profile/:publicCardId`)
- Shareable, no-auth-required profile card with Path Score ring, skills, and factor breakdown.
- Dynamic Open Graph / Twitter meta tags for rich link previews.

### 8 · Smart Notifications
- In-app notification drawer (bell icon) with unread badges.
- Scheduled triggers: new live jobs for your role, stale-resume reminders, trending-skill alerts, and a weekly digest — plus inline milestones (first resume, first gap analysis, interview session streaks) and score-change alerts.

### 9 · Admin Panel (`/admin`)
- Platform-wide stats, paginated/searchable user directory, role management, and user deletion (admin accounts only).

### 10 · Cross-Cutting
- **Light / Dark Theme** — Site-wide toggle (persisted, Tailwind v4 CSS-variable driven).
- **AI Career Coach** — Floating chat drawer available on every authenticated page, with full context of the user's profile, resume, and roadmap injected into every message.
- **Google Sign-In** — "Continue with Google" on login/register, backed by Firebase Auth + firebase-admin token verification.

---

## Hybrid ML + LLM Pipeline

PathPilot uses a dual-engine architecture:

1. **Python ML Layer** (`ai-service/`)
   7 models trained on 50,000 synthetic student profiles (CatBoost, XGBoost, LightGBM, Random Forest, Logistic Regression, and KNN — see [`pathpilot_documentation.md`](./pathpilot_documentation.md) for the exact algorithm and metrics per model) produce quantitative scores:
   - Resume quality score, ATS pass probability, career readiness class
   - Role recommendation, salary projection, interview success probability
   - A learning-path recommendation (KNN similarity search)
   - SHAP feature-attribution explanations for the resume-score prediction

2. **Gemini LLM Layer** (`server/src/services/gemini.service.js`)
   Takes raw resume text and ML output to generate:
   - Deep, context-aware career audits and role-fit analysis
   - Role-targeted mock interview questions and rubric-based answer evaluations
   - Personalized weekly learning-path gap weeks
   - Resume Builder writing assistance (bullet rewrites, summaries, JD matching)
   - Context-aware AI coaching chat with full profile/resume/roadmap injection

Every Gemini call site has a deterministic local fallback, so the app degrades gracefully rather than breaking if the LLM is rate-limited or unavailable.

---

## Role Consistency

All hubs respect the user's **dream role**, including custom roles not in the standard list.

- The user's `profile.dreamRole` is the source of truth.
- Every role dropdown pre-injects the current dream role so it is always selectable, even if it doesn't appear in the standard list (e.g. "Flutter Developer").
- Changing the role triggers a live re-fetch/re-analysis (Path Score, Gemini role-fit, roadmap) without a full page reload, and invalidates the cached AI narrative so it's never shown against a stale role.

---

## Getting Started

Each service runs independently. Open three terminals.

### 1. Django AI Service (`ai-service/`)

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
cp .env.example .env           # fill DJANGO_SECRET_KEY + INTERNAL_API_KEY

# First time only — trains all 7 models, writes ml/models/*/model.pkl
python -m ml.training.train_all

python manage.py runserver 8000  # http://localhost:8000
```

### 2. Node API (`server/`)

```bash
cd server
cp .env.example .env      # fill MONGODB_URI, JWT secrets, INTERNAL_API_KEY (must match ai-service), GEMINI_API_KEY
npm install
npm run dev               # http://localhost:5000
```

### 3. React Frontend (`client/`)

```bash
cd client
npm install
npm run dev               # http://localhost:5173
```

**Startup order:** Django first → Node second → Client last.
**Health check:** `GET http://localhost:5000/api/health/ai` — pings Django and returns combined status.



`student` · `admin`

---

## Environment Variables

### `server/.env`

| Variable          | Description                              |
| ----------------- | ----------------------------------------- |
| `PORT`            | Node server port (default 5000)           |
| `NODE_ENV`        | `development` / `production`              |
| `CLIENT_URL`      | Frontend origin for CORS                  |
| `MONGODB_URI`     | MongoDB Atlas connection string           |
| `JWT_ACCESS_SECRET` / `JWT_ACCESS_EXPIRES` | Access token secret + lifetime (default 15m) |
| `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES` | Refresh token secret + lifetime (default 7d) |
| `TOKEN_SECRET`    | Signs email-verify / password-reset tokens |
| `AI_SERVICE_URL`  | Base URL of the Django AI service         |
| `INTERNAL_API_KEY`| Shared secret sent as `X-Internal-Key` to Django — must match `ai-service/.env` |
| `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM` | Nodemailer config (blank = emails logged to console in dev) |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Job-market API (omit to fall back to seeded mock data) |
| `THEIRSTACK_API_KEY` | Live-jobs API (omit to disable live listings) |
| `GEMINI_API_KEY`  | Google Gemini API key                     |
| `GEMINI_MODEL`    | Model name (default `gemini-3.5-flash`, auto-fallback to `gemini-3.5-flash-lite` / `gemini-3.6-flash` on quota/404 errors) |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firebase Admin credentials for verifying Google Sign-In tokens (omit to disable Google OAuth only) |

### `ai-service/.env`

| Variable | Purpose |
| --- | --- |
| `DJANGO_SECRET_KEY` | Django secret |
| `DJANGO_DEBUG` | dev/prod flag |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated allowed hosts |
| `CORS_ALLOWED_ORIGINS` | Must include the Node server's origin |
| `INTERNAL_API_KEY` | Must match Node's `INTERNAL_API_KEY` |

### `client/.env`

Only Firebase client config is required (`VITE_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID`) — used for "Continue with Google". No backend URL variable is needed; `vite.config.js` proxies `/api` and `/uploads` to `http://localhost:5000` in dev.

---

## Further Reading

See [`pathpilot_documentation.md`](./pathpilot_documentation.md) for the complete architecture reference — folder-by-folder file map, feature sequence diagrams, full database ERD, complete API reference, state-management patterns, and a glossary of project-specific terms.
