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
| Frontend   | React, React Router, Tailwind CSS, Axios, Context API  |
| Backend    | Node.js, Express, JWT, Multer, Nodemailer              |
| Database   | MongoDB, Mongoose                                      |
| AI Service | Python, Django, Django REST Framework                  |
| ML         | Pandas, scikit-learn (Random Forest, Decision Tree, Linear Regression) |
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

## Build Roadmap

- [x] **Phase 1** — Foundation + Authentication
- [x] **Phase 2** — Onboarding + Profile
- [x] **Phase 3** — Resume Intelligence
- [x] **Phase 4** — Path Score + Gap Navigator
- [ ] Phase 5 — Growth Path + Insights
- [ ] Phase 6 — Opportunity Tracker + Career Report
- [ ] Phase 7 — Admin Dashboard
- [ ] Phase 8 — ML models (Random Forest / Decision Tree / Linear Regression)

## User Roles

`student` · `admin`
