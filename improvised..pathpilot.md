# PathPilot AI — Master Feature Implementation Prompt (Phase-Wise)

> Use this as a working brief for each build session (with Claude Code, or as your own task tracker). Each phase is scoped to be buildable and testable independently, but ordered so later phases can reuse earlier ones. Authentication (Google Sign-In) is intentionally excluded — tracked separately as an independent feature.

---

## Guiding Principles for All Phases
- Keep new features **organized by module** — don't scatter logic across unrelated files. Each feature lives in its natural home (Resume Intelligence, Gap Navigator, Opportunity Tracker, etc.) unless explicitly marked "Global."
- Every new prediction/score shown to the user should be **explainable and honest** about its data source (synthetic vs. real market data).
- Prefer **reusing existing models/services** over building parallel systems (e.g., reuse SHAP outputs, reuse KNN distances, reuse Nodemailer).
- No feature should silently fail — always design a fallback/empty state (e.g., "market data unavailable this week").

---

## PHASE 1 — Real Job-Market Grounding (Foundation Layer)
**Module:** Global data layer (feeds Gap Navigator, Salary Projector, Roadmap Planner)

**Goal:** Replace/augment synthetic-data-only outputs with real, current job-market signal.

**Tasks:**
1. Integrate a legitimate job-listings data source (Adzuna API recommended for India coverage; SerpAPI Google Jobs as alternative). Avoid direct scraping of Naukri/LinkedIn.
2. Build a scheduled job (node-cron or agenda.js) that:
   - Fetches postings for each tracked target role.
   - Extracts skill mentions (start with keyword/NER matching; can upgrade to LLM extraction later).
   - Computes skill frequency % per role and aggregate salary ranges.
3. New MongoDB collection:
   ```js
   JobMarketSnapshot {
     role: String,
     skill: String,
     frequency: Number,       // % of postings mentioning this skill
     avgSalaryRange: { min: Number, max: Number },
     sampleSize: Number,
     weekOf: Date,
     createdAt: Date
   }
   ```
4. Expose an internal service/endpoint the rest of the app can query: `getMarketDataForRole(role)`.
5. Wire into:
   - **Gap Navigator** — replace static Core/Recommended/Supporting tags with live frequency-based prioritization.
   - **Salary Projector** — show model projection alongside real market range for comparison.
6. Add a "last updated" timestamp wherever market data is shown, so it never looks stale/silent.

**Done when:** Gap Navigator and Salary Projector both show at least one real-data-backed number per profile, refreshed on a schedule.

---

## PHASE 2 — Confidence & Provenance Tags
**Module:** Dashboard, Path Score/Diagnostics, Resume Intelligence (cross-cutting UI layer)

**Goal:** Every prediction shown to the user is labeled with how much to trust it.

**Tasks:**
1. For each of the 7 models, compute a confidence signal:
   - Classifiers: use `predict_proba` spread (higher confidence = more decisive probability distribution).
   - KNN-based (Roadmap Planner): use neighbor distance — closer neighbors = higher confidence.
   - Regressors: use residual/variance estimate if available, or bucket by sample density in that feature-space region.
2. Standardize into 3 tiers: 🟢 High / 🟡 Moderate / 🔴 Low confidence.
3. Add a small reusable `<ConfidenceTag />` component (React) — shows tier + short reason ("based on 1,200 similar profiles" / "limited data for this role").
4. Once Phase 1 exists, boost confidence display when a prediction is cross-validated against real market data — label it distinctly ("🟢 High confidence — backed by live market data").
5. Apply this component across: Path Score cards, Resume Health Score, Salary Projector, Career Readiness Classifier output.

**Done when:** Every score/prediction on the Dashboard and Path Score page has a visible, honest confidence tag.

---

## PHASE 3 — Peer Benchmarking
**Module:** Path Score / Diagnostics

**Goal:** Contextualize a student's score against others, not just show a raw number.

**Tasks:**
1. Compute percentile of student's Path Score against the synthetic training distribution, bucketed by target role.
2. Display as a percentile badge or Recharts radial/bar chart with a marker ("You're in the top 30% for Backend Developer aspirants").
3. Once Phase 1 (market data) exists, add a secondary benchmark line: "skill match rate vs. current market demand" — blend synthetic peer comparison with real demand signal.
4. Clearly label which benchmark is synthetic-based vs. market-based (ties into Phase 2's honesty principle).

**Done when:** Path Score page shows at least one percentile-style comparison, computed server-side and cached per profile (recompute on profile/resume update, not on every page load).

---

## PHASE 4 — Resume Red-Flag Detector
**Module:** Resume Intelligence (separated cleanly from scoring logic)

**Goal:** Give recruiter-style, concrete feedback beyond the health score.

**Tasks:**
1. Build a dedicated `resumeRedFlags.js` (or Django service function) — kept separate from the scoring model, since this is rule/heuristic-based, not ML.
2. Detect and flag:
   - Unexplained date gaps between education/experience entries.
   - Inconsistent or missing date formatting.
   - Bullet points with no quantifiable metric (no numbers/%/scale words).
   - Generic/templated objective statements (keyword-match against common filler phrases).
   - Missing contact info / GitHub / LinkedIn link.
3. Display as a distinct "Recruiter Red Flags" panel on the Resume Intelligence page — visually separated from the Health Score and Actionable Feedback sections (this satisfies your "features should be separated" concern).
4. Each flag should have a one-line fix suggestion attached.

**Done when:** Resume Intelligence page has three clearly separated panels: Health Score, Actionable Feedback, Red Flags.

---

## PHASE 5 — Application Success Predictor
**Module:** Opportunity Tracker

**Goal:** Turn the static kanban board into a predictive tool using models you already have.

**Tasks:**
1. When a student adds/edits an opportunity (company + role), call existing models:
   - Role Recommendation Engine → fit score for this specific role.
   - ATS Pass Predictor → likelihood of clearing automated screening.
   - Interview Success Regressor → readiness for this role's interview.
2. Combine into a single per-card "Fit Score" badge (e.g., "72% match") shown on each Kanban/List card.
3. Add a small expandable detail view per card showing the 3 sub-scores individually.
4. Apply Phase 2's confidence tagging to this combined score too.

**Done when:** Every opportunity card shows a fit score badge, computed at creation/update time and cached (not recomputed on every render).

---

## PHASE 6 — Shareable Career Card
**Module:** Career Report (new public-facing sub-feature)

**Goal:** A shareable, read-only public profile card students can put in a portfolio or share as a link.

**Tasks:**
1. New public route: `/profile/:publicId` (generate a random public ID per user, not the Mongo `_id`, for privacy).
2. Design a clean single-page card: name, target role, Path Score, top verified skills, readiness tier. No sensitive data (no email, no raw resume).
3. Add a toggle in user settings: "Make my Career Card public" (off by default).
4. Optional stretch: generate a downloadable PNG/image version (via a library like `html-to-image` on the frontend, or server-side with Puppeteer) for easy social sharing.

**Done when:** A user can toggle visibility and get a shareable link that renders a clean public card with no auth required to view.

---

## PHASE 7 — Notifications System
**Module:** Global (feeds Dashboard bell icon)

**Goal:** Make the platform proactive, not just reactive.

**Tasks:**
1. New MongoDB collection:
   ```js
   Notification {
     user: ObjectId,
     type: String,        // 'market_shift' | 'task_reminder' | 'stage_change' | 'system'
     message: String,
     isRead: Boolean,
     relatedEntity: ObjectId,
     createdAt: Date
   }
   ```
2. Two trigger types:
   - **Internal/reactive** — hook into existing routes (opportunity stage change, roadmap task completed, growth plan milestone) to auto-generate notifications.
   - **Market-driven** — once Phase 1's cron job runs weekly, diff this week's `JobMarketSnapshot` against last week's per role/skill; generate a notification on significant shifts (e.g., >10% frequency change).
3. Frontend: bell icon in navbar with unread count badge, dropdown/slide-over panel, mark-as-read on open.
4. Use polling (on page load + interval, e.g., every few minutes) — no need for WebSockets/Socket.io for this scope.

**Done when:** A student sees both activity-based and market-based notifications in a single unified feed.

---

## PHASE 8 — AI Career Coach + "Ask Why" Explainability Chat
**Module:** Global (persistent chat drawer) + Path Score/Gap Navigator (scoped "Ask Why" buttons)

**Goal:** The most "wow"-heavy phase — do this last since it benefits from everything built in Phases 1–7.

**Tasks — Full Coach:**
1. New Express route: `/api/coach/chat`.
2. Server-side context assembly (don't dump raw DB documents into the prompt):
   - Summarize profile, resume highlights, gap analysis, roadmap progress, opportunity stats, and (once available) recent market notifications into a compact JSON context block.
3. Call the LLM API (Claude/OpenAI) with this context as system prompt + user's message as the turn.
4. Frontend: persistent chat drawer/panel accessible from every page (not a separate standalone page) — implement as a global layout component.
5. Maintain short conversation history per session (don't need long-term memory storage for v1).

**Tasks — "Ask Why" (scoped, lighter-weight sibling):**
1. Add an "Ask why" button next to every SHAP chart (Path Score, Gap Navigator, Salary Projector).
2. On click, send that specific prediction's SHAP values + a fixed template question to the LLM, return a short conversational explanation.
3. This can reuse the same backend route as the full coach with a different context-assembly path (scoped to one prediction instead of the whole profile).

**Done when:** A persistent coach chat exists globally, and every SHAP-backed prediction has a working scoped "Ask Why" explainer.

---

## Suggested Build Order Recap
1. Phase 1 — Job-Market Grounding *(foundation — do first)*
2. Phase 2 — Confidence & Provenance Tags *(quick win, layers onto existing models)*
3. Phase 3 — Peer Benchmarking
4. Phase 4 — Resume Red-Flag Detector
5. Phase 5 — Application Success Predictor
6. Phase 6 — Shareable Career Card
7. Phase 7 — Notifications System
8. Phase 8 — AI Career Coach + Ask Why *(most complex, benefits from everything above)*

---

## Explicitly Out of Scope for This Prompt
- Google Sign-In / OAuth (tracked as a separate, independent feature — auth hardening, refresh tokens, rate limiting to be scoped separately when ready).
