# PathPilot AI — 1-Day Learning Guide

> Goal: after one focused day using this guide (not reading raw code first), you should be able to explain any part of the system. Read [`pathpilot_documentation.md`](../pathpilot_documentation.md) alongside this — this guide tells you *what order* to absorb it in and *what to actually open* in the editor for each area.

Suggested pace: ~45–60 min per area below, in order. Total ≈ 8 hours.

---

## 0. Before you start (15 min)

Read [§1 Project Summary](../pathpilot_documentation.md#1-project-summary) and [§2 System Architecture](../pathpilot_documentation.md#2-system-architecture). Get the one-sentence pitch fixed in your head:

> "A React app talks to a Node API that owns the database; the Node API is the only thing that talks to a locked-down Django service that runs the ML models."

If you can redraw the 3-box diagram from memory, move on.

---

## 1. Frontend fundamentals (60 min)

**Read first**: [§5 Client — Folder & File Reference](../pathpilot_documentation.md#5-client--folder--file-reference).

**Then open in your editor, in this order**:
1. `client/src/App.jsx` — the route tree. Find every guard (`ProtectedRoute`, `RequireOnboarding`, etc.) and match it to a route.
2. `client/src/routes/guards.jsx` — read all 5 guards top to bottom, they're short.
3. `client/src/context/AuthContext.jsx` — this is the single most important file to understand for "how does the app know who's logged in."
4. `client/src/lib/api.js` — the token-refresh interceptor. This is a favorite interview question (see interview-prep.md Q on JWT refresh).

**Key concept to internalize**: the access token lives in memory + localStorage; the refresh token lives in an HttpOnly cookie the JS can never read. That split is *why* the two-token system is secure against XSS.

---

## 2. Backend fundamentals (60 min)

**Read first**: [§6 Server — Folder & File Reference](../pathpilot_documentation.md#6-server--folder--file-reference).

**Then open**:
1. `server/src/app.js` — the middleware pipeline, in order. Say the order out loud.
2. `server/src/middleware/auth.middleware.js` — the `protect` function. This is what every 🔒 route in the API reference depends on.
3. `server/src/utils/ApiError.js`, `ApiResponse.js`, `asyncHandler.js` — the three conventions used everywhere. Small files, high leverage.
4. `server/src/services/token.service.js` — purpose-scoped JWT secrets. Know *why* reset-password tokens can't be replayed as access tokens.

**Key concept**: every controller is wrapped in `asyncHandler` so a thrown error becomes a clean JSON response instead of crashing the Node process.

---

## 3. Database (45 min)

**Read first**: [§10 Database Schema & ER Diagram](../pathpilot_documentation.md#10-database-schema--er-diagram).

**Then open**: `server/src/models/User.js`, `Resume.js`, `Opportunity.js` (note the exported `OPPORTUNITY_STAGES` constant — that's the whole "kanban board" feature reduced to one enum field).

**Key concept**: `LiveJobCache` has a TTL index (auto-expires after 6 hours) — this is MongoDB doing cache invalidation for you, no cron job needed for cleanup.

---

## 4. AI / ML pipeline (75 min — the densest area)

**Read first**: [§7 AI Service](../pathpilot_documentation.md#7-ai-service--folder--file-reference) and [§12 AI Pipeline End to End](../pathpilot_documentation.md#12-ai-pipeline--end-to-end).

**Then open**:
1. `ai-service/ml/views.py` — find `require_internal_key` and read the decorator itself.
2. `ai-service/ml/services/predictor.py` — the 7-model loader/inference engine. Don't memorize every line — understand the *pattern*: load a `.pkl`, transform input features, call `.predict()`.
3. `ai-service/ml/services/explainer.py` — SHAP, only skim, know it explains *why* the resume_score prediction came out the way it did.
4. `server/src/services/ai.service.js` — the Node-side gateway that calls all of the above.

**Key concept, and a genuinely interesting one for interviews**: several ML modules' docstrings claim "CatBoost" but the model that actually won training was something else (Logistic Regression for `ats`, Random Forest for `role`, XGBoost for `interview`) — see the table in [§7.3](../pathpilot_documentation.md#73-the-7-trained-ml-models). Being able to explain *why* this happens (each training script compares 2-3 candidates and keeps whichever scores best on validation data — the docstring was just never updated after a later retrain changed the winner) is a great "I actually understand this, not just copied it" signal.

---

## 5. Authentication, end to end (45 min)

**Read first**: [§8 Full Project Flow](../pathpilot_documentation.md#8-full-project-flow-walkthrough) steps 1-2, and the Auth dependency map in [§13](../pathpilot_documentation.md#13-file-dependency-maps).

**Then trace it live**: open browser devtools on the deployed app, log in, and watch: the `/auth/login` request, the `Set-Cookie` response header (HttpOnly refresh cookie), and the access token appearing in localStorage.

**Key concept**: Google OAuth login doesn't create a password at all — Firebase verifies the identity, Node's Firebase Admin SDK verifies the ID token server-side, and a `User` document is created/matched by email with no `passwordHash`.

---

## 6. Resume pipeline (45 min)

**Read**: [§9.2 Resume Scoring & Red Flags](../pathpilot_documentation.md#92-resume-scoring--red-flags) and the Resume dependency map in §13.

**Then open**: `server/src/services/resumeText.service.js`, `ai-service/ml/services/resume_parser.py`, `server/src/services/resumeRedFlags.js`.

**Key concept**: three independent scoring passes happen on one resume — deterministic parsing (Django), rule-based red flags (Node), and qualitative LLM feedback (Gemini) — and they're combined, not replacing each other.

---

## 7. Growth Plan / Roadmap (30 min)

**Read**: [§9.3](../pathpilot_documentation.md#93-growth-plan-roadmap). Open `ai-service/ml/services/growth_planner.py` — it's a greedy bin-packing algorithm, short enough to read in full.

---

## 8. Interview & AI Coach (30 min)

**Read**: [§9.5](../pathpilot_documentation.md#95-mock-interviews) and [§9.6](../pathpilot_documentation.md#96-ai-coach-chat). Open `server/src/services/gemini.service.js` and find the model-fallback logic — know why it exists (a single Gemini model outage/quota error shouldn't take down the whole feature).

---

## 9. Resume Builder (20 min)

**Read**: [§9.7](../pathpilot_documentation.md#97-resume-builder). The one thing worth remembering: it's a **separate** MongoDB model from the uploaded resume — don't conflate them in an explanation.

---

## 10. Deployment (30 min)

**Read**: [§2 System Architecture](../pathpilot_documentation.md#2-system-architecture) "Deployed URLs" note. Know the 3 platforms (Vercel/Render/Render) and *why* each was chosen (static hosting for the SPA, managed Node/Python runtimes for the two backends). Know that `client/vercel.json` is what makes the SPA and API look same-origin in the browser even though they're on different domains (path rewrites), and that the refresh cookie needs `sameSite:'none'; secure:true` specifically because of that cross-domain setup.

---

## If you only have 1 hour, not 1 day

Read, in order: §1, §2, §8 (Full Project Flow), and the 3 dependency maps in §13. That's the 20% that explains 80% of "how does this app work" questions.
