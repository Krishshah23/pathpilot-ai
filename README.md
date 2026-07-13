# PathPilot AI

> Navigate Your Career. Powered by Intelligence.

An AI-powered **Career Intelligence Platform** for students. PathPilot doesn't find
jobs for you — it helps you understand your current career readiness, find skill gaps,
improve your resume, follow a personalized learning roadmap, and become job-ready.

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
- When AI is needed, Node calls the **Django** service over REST.
- The frontend **never** talks to Django directly.

## Tech Stack

| Layer      | Technology                                             |
| ---------- | ------------------------------------------------------ |
| Frontend   | React, React Router, Tailwind CSS v4, Recharts         |
| Backend    | Node.js, Express, MongoDB (Mongoose), JWT             |
| AI Engine  | Gemini 2.5 Flash SDK (Real Career Intelligence)        |
| ML Demo    | Django REST Framework, Python, CatBoost, XGBoost       |
| Parsing    | Python PDF Parsing & Custom Feature Engineering        |
| Charts     | Recharts                                               |

## Monorepo Layout

```
pathpilot-ai/
├── client/       React + Vite frontend
├── server/       Node.js / Express API (talks to Mongo + Django)
├── ai-service/   Django + DRF machine-learning service
└── README.md
```

## Getting Started

Each service runs independently. Open three terminals.

### 1. Node API (`server/`)

```bash
cd server
cp .env.example .env      # then fill in MONGODB_URI (Atlas) + secrets
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
source venv/Scripts/activate     # Windows (Git Bash)
pip install -r requirements.txt
python manage.py runserver 8000  # http://localhost:8000
```

### 4. Seed Demo Users

```bash
cd server
npm run seed
```

This creates three demo accounts:

| Role    | Email                 | Password       | State                   |
| ------- | --------------------- | -------------- | ----------------------- |
| Admin   | admin@pathpilot.ai    | Admin@1234     | Verified, onboarded     |
| Student | student@pathpilot.ai  | Student@1234   | Verified, onboarded     |
| Student | new@pathpilot.ai      | NewUser@1234   | Verified, not onboarded |

The script is idempotent — running it again skips already-existing users.

- [x] **Phase 9** — Machine Learning Integration (7 Data-Driven Models + SHAP Explainable AI)

### Blended ML + LLM Hybrid Pipeline

PathPilot uses a dual-engine architecture:
1. **Python ML Layer (Academic Demo)**: CatBoost models trained on 50,000+ student profiles provide the quantitative scores (`ATS probability`, `Peer benchmark`, `Career readiness class`).
2. **Gemini LLM Layer (Production Diagnostics)**: Takes the resume text and the feature-engineered output from the ML models to generate:
   - Deep context-aware career audits.
   - Interactive mock interviews target-built from the user's resume gaps.
   - Tailored learning path weeks injected dynamically into the roadmap.
   - Context-aware chatbot coaching sessions that persist history.

This architecture showcases the best of both worlds: robust machine learning inference combined with state-of-the-art LLM personalization.

### How to Run the ML Service
To start the Django ML service inside the virtual environment:
```bash
cd ai-service
# Activate the virtual environment
venv\Scripts\activate
# Start the Django service
python manage.py runserver 8000
```

## User Roles

`student` · `admin`

