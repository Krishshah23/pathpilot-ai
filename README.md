# PathPilot AI

> Navigate Your Career. Powered by Intelligence.

An AI-powered **Career Intelligence Platform** for students. PathPilot doesn't find
jobs for you — it helps you understand your current career readiness, identify skill gaps,
refine your resume, follow a personalized learning roadmap, practice interviews, and become job-ready.

Think of it as your personal **career operating system**.

---

## Architecture

```
React Frontend  ──►  Node.js / Express API  ──►  MongoDB (Atlas)
                              │
                              └──►  Django AI Service (ML models)
```

- The **React** frontend talks **only** to the Node backend.
- **Node** owns business logic, authentication, MongoDB, and file uploads.
- When AI is needed, Node calls the **Django** service over REST and/or invokes the **Gemini SDK** directly.
- The frontend **never** talks to Django directly.

---

## Tech Stack

| Layer      | Technology                                                      |
| ---------- | --------------------------------------------------------------- |
| Frontend   | React 18, React Router v6, Vite, Vanilla CSS (custom design system) |
| Backend    | Node.js, Express, MongoDB (Mongoose), JWT                      |
| AI Engine  | Gemini 2.5 Flash SDK (career audits, mock interviews, coaching) |
| ML Demo    | Django REST Framework, Python, CatBoost, XGBoost               |
| Parsing    | Python PDF parsing & custom feature engineering                 |
| Charts     | Recharts (SkillRadar, ScoreGauge, TrendLine, FactorBars)       |

---

## Monorepo Layout

```
pathpilot-ai/
├── client/       React + Vite frontend
├── server/       Node.js / Express API (MongoDB + Gemini + Django bridge)
├── ai-service/   Django + DRF machine-learning service
└── README.md
```

---

## Core Features

### 1 · Overview Dashboard (`/dashboard`)
- **Path Score** — A composite 0–100 career readiness score calculated from resume signals, profile completeness, skills, and ML predictions.
- **Score Breakdown** — Factor bars showing contribution of each dimension (skills, projects, education, resume quality, etc.).
- **PathPilot AI Analysis** — Gemini-powered narrative career audit personalized to the user's target role.
- **Live Market Alignment** — Real-time skill match rate vs. current job listing requirements.
- **Smart CTA Engine** — Dynamically surfaces the highest-impact next action (upload resume → build roadmap → practice interview).
- **Role Switcher** — Inline editable target role selector; changing role triggers a fresh Gemini audit and data refresh without a page reload.
- **Profile Completion Tracker** — Checklist of incomplete profile signals that drag down the Path Score.

### 2 · Resume Strategy (`/talent-analyzer`)
- **Resume Upload & PDF Parsing** — Django AI service extracts 30+ structured features from the uploaded PDF.
- **ML Scoring** — CatBoost models output ATS probability, peer benchmark percentile, and career readiness class.
- **Gap Navigator** — Compares extracted resume skills against role-specific requirements to surface prioritized skill gaps.
- **Fix Helper** — Notion-style drawer panel that provides Gemini-generated, line-level resume fix suggestions for each identified gap.
- **Key Gaps Array** — Persisted on the resume document and consumed by the Interview Coach and Skill Roadmap for cross-hub continuity.

### 3 · Skill Roadmap (`/execution-engine`)
- **AI-Generated Weekly Plan** — Gemini builds a multi-week learning roadmap targeting the user's exact resume gaps and dream role.
- **Live Job Listings** — Pulls real-time job openings from external APIs, filtered by target role and location.
- **Progress Tracking** — Week-by-week completion state persisted to MongoDB.

### 4 · AI Mock Interview Coach (`/interview-prep`)
- **Gap-Targeted Questions** — Gemini generates role-specific interview questions targeting the user's actual resume gaps.
- **Custom Role Selector** — Dropdown pre-seeded with the user's current dream role (including custom/non-standard roles) and all standard roles.
- **Voice Dictation** — Web Speech API integration for hands-free answer recording (Chrome/Edge).
- **Live Session Timer** — Color-coded countdown that signals optimal, slow, or fast speaking pace.
- **Gemini Evaluation Report** — Per-question scoring across depth, relevance, and communication with rubric table, strengths, improvements, and model answer.
- **Speech Fluency Metrics** — Words-per-minute pace analysis and filler word detection.
- **Session Persistence** — Full Q&A history saved to MongoDB; past sessions displayed on the setup screen.
- **Session Summary** — Avg score, questions answered, and gaps covered shown on completion.

### 5 · Career Report (`/report`)
- **Exportable PDF Audit** — Generates a shareable PDF summarizing the user's path score, factors, skills, and AI narrative.

### 6 · Public Career Profile (`/profile/:publicCardId`)
- **Shareable Profile Card** — Public-facing page showing name, target role, path score ring, skill list, and factor breakdown.
- **SEO & Social Meta** — Dynamically sets `<title>`, `og:title`, `og:description`, and Twitter meta tags for rich link previews.
- **Get-Started CTA** — Encourages visitors to create their own PathPilot account.

### 7 · Admin Panel (`/admin`)
- User management, role assignment, and platform analytics (admin accounts only).

---

## Hybrid ML + LLM Pipeline

PathPilot uses a dual-engine architecture:

1. **Python ML Layer (Academic Demo)**
   CatBoost models trained on 50,000+ synthetic student profiles produce quantitative scores:
   - ATS probability
   - Peer benchmark percentile
   - Career readiness class (Low / Medium / High)

2. **Gemini LLM Layer (Production Intelligence)**
   Takes the raw resume text and feature-engineered ML output to generate:
   - Deep, context-aware career audits (Overview page)
   - Role-targeted mock interview questions (Interview Coach)
   - Personalized rubric-based answer evaluations
   - Tailored weekly learning path injected into the roadmap
   - Context-aware AI coaching sessions with persistent chat history

This architecture showcases the best of both worlds: robust ML inference for structured scoring combined with state-of-the-art LLM personalization for actionable guidance.

---

## Role Consistency

All four hubs respect the user's **dream role**, including custom roles not in the standard list.

- The user's `profile.dreamRole` is the source of truth.
- Every role dropdown pre-injects the current dream role so it is always selectable, even if it doesn't appear in the standard `DREAM_ROLES` list (e.g. "Flutter Developer").
- Changing the role on the Overview page triggers a live re-fetch of Path Score, Growth Plan, and Gemini analysis without a full page reload.
- The Interview Coach and Skill Roadmap both read `user.profile.dreamRole` and pass it explicitly to backend API calls.

---

## Getting Started

Each service runs independently. Open three terminals.

### 1. Node API (`server/`)

```bash
cd server
cp .env.example .env      # fill in MONGODB_URI, GEMINI_API_KEY, JWT_SECRET
npm install
npm run dev               # http://localhost:5000
```

### 2. React Frontend (`client/`)

```bash
cd client
npm install
npm run dev               # http://localhost:5173
```

### 3. Django AI Service (`ai-service/`)

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
python manage.py runserver 8000  # http://localhost:8000
```

### 4. Seed Demo Users

```bash
cd server
npm run seed
```

Creates three demo accounts:

| Role    | Email                | Password     | State                   |
| ------- | -------------------- | ------------ | ----------------------- |
| Admin   | admin@pathpilot.ai   | Admin@1234   | Verified, onboarded     |
| Student | student@pathpilot.ai | Student@1234 | Verified, onboarded     |
| Student | new@pathpilot.ai     | NewUser@1234 | Verified, not onboarded |

The seed script is idempotent — re-running it skips existing users.

---

## User Roles

`student` · `admin`

---

## Environment Variables

| Variable          | Service | Description                              |
| ----------------- | ------- | ---------------------------------------- |
| `MONGODB_URI`     | Node    | MongoDB Atlas connection string          |
| `JWT_SECRET`      | Node    | Secret for signing JWTs                  |
| `GEMINI_API_KEY`  | Node    | Google Gemini API key                    |
| `DJANGO_URL`      | Node    | Base URL of the Django AI service        |
| `CLIENT_URL`      | Node    | Frontend origin for CORS                 |
| `PORT`            | Node    | Node server port (default 5000)          |
