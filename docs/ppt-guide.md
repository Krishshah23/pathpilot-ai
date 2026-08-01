# PathPilot AI — PPT Slide-by-Slide Guide

> **Note**: no reference presentation file/template was provided for this project, so this guide is built on general best-practice slide design for a technical capstone presentation (clear hierarchy, one idea per slide, diagrams over paragraphs, consistent visual system) rather than adapted from an existing deck. Adjust to match your college's required template/branding if one exists.

Pairs with [`presentation-guide.md`](presentation-guide.md) (speaker timing) and [`demo-script.md`](demo-script.md) (live demo). Target: 14 slides for a 15-minute talk (~1 min/slide, with slide 8 — the demo — taking the bulk of actual floor time as a live switch-away rather than a timed slide).

---

## Visual system (apply to every slide)
- One accent color only (match the app's own single accent from the design system), neutral background, dark text — consistency signals design maturity to a professor.
- Max ~25 words of on-slide text per slide; the rest goes in speaker notes, not on screen.
- Use the actual Mermaid diagrams from `pathpilot_documentation.md` (architecture, ER diagram, sequence diagrams) rather than redrawing new ones — they're already verified accurate.
- Screenshot the real app for every feature slide — don't use mockups/placeholders once the real UI exists.

---

## Slide 1 — Title
**Content**: Project name "PathPilot AI", one-line subtitle ("AI-assisted career readiness for students"), team names, course/capstone name, date.
**Speaker notes**: state the one-sentence pitch here, not written on the slide.
**Timing**: 20s.

## Slide 2 — The Problem
**Content**: 2-3 bullet points on the gap PathPilot solves (students don't know their real readiness for a target role; resume feedback is generic; no single place ties resume + skills + job market + interview prep together).
**Diagram/screenshot**: none — text only, kept short.
**Speaker notes**: make it concrete — a specific relatable scenario ("a 3rd-year student with 4 different 'career advice' tabs open and still no clear answer").
**Timing**: 40s.

## Slide 3 — System Architecture
**Content**: the 3-box architecture diagram (client / Node server / Django AI service) from `pathpilot_documentation.md` §2, redrawn cleanly or exported from Mermaid.
**Speaker notes**: "React talks only to Node; Node is the only thing that talks to Django" — say this exact sentence, it's the single most important architectural fact to land.
**Animation**: build the 3 boxes in one at a time (client → server → AI service) rather than all at once, so the flow reads left-to-right.
**Timing**: 60s.

## Slide 4 — Tech Stack
**Content**: 3 columns (Frontend / Backend / AI Service) with 4-5 key technologies each, logos if available.
**Speaker notes**: don't read the list — group it: "modern React tooling, a standard Node/Mongo API layer, and a Python ML stack most web teams don't normally need."
**Timing**: 40s.

## Slide 5 — Core Feature: Path Score
**Content**: screenshot of the dashboard's ScoreGauge, plus a simple 5-bar breakdown of the weighting factors (resume quality / skill match / experience / consistency / semester cap).
**Speaker notes**: explain it's a transparent weighted formula, not a black-box prediction — this honesty lands well and preempts a "how is this validated" question.
**Timing**: 60s.

## Slide 6 — AI/ML Pipeline
**Content**: the sequence diagram from `pathpilot_documentation.md` §12 (resume upload → Django parse → predictor.py → SHAP → Gemini narrative → combined score).
**Speaker notes**: name the actual model types used (CatBoost, XGBoost, Random Forest, Logistic Regression) — specificity is credible, "AI" alone is not.
**Timing**: 60s.

## Slide 7 — Feature Overview
**Content**: a 2x3 grid of small screenshots — Resume Scoring, Growth Plan, Gap Analysis, Live Jobs, Mock Interview, AI Coach — one line each.
**Speaker notes**: this is a map for what's about to happen live, not a place to explain each in depth.
**Timing**: 40s.

## Slide 8 — Live Demo
**Content**: just "Live Demo" and the app URL, nothing else — this is a placeholder slide you switch away from into the actual browser.
**Speaker notes**: follow `demo-script.md` exactly here; this slide itself gets no real floor time.
**Timing**: ~7 min live (see `presentation-guide.md` for the beat-by-beat demo plan).

## Slide 9 — Security & Engineering Practices
**Content**: 3-4 bullets: JWT two-token auth, purpose-scoped secrets, internal-service key gating, "we ran a full security audit and fixed what we found."
**Speaker notes**: mention the specific bug you found and fixed (missing auth middleware on `/api/ml/predict`) — a concrete example beats a generic claim.
**Timing**: 45s.

## Slide 10 — Database Design
**Content**: the ER diagram from `pathpilot_documentation.md` §10, simplified to show just the entity names and relationships if the full field list is too dense for a slide.
**Speaker notes**: mention why MongoDB (document-shaped data, no rigid relational schema needed).
**Timing**: 45s.

## Slide 11 — Deployment
**Content**: 3 platform logos (Vercel / Render / MongoDB Atlas) with a one-line role for each.
**Speaker notes**: brief — this is infrastructure trivia, not the headline.
**Timing**: 30s.

## Slide 12 — What We Learned / Challenges
**Content**: 2-3 real challenges (cross-domain cookie auth for production, the Tailwind cascade-layer bug, or the Firebase private-key parsing issue) — pick ones you can explain confidently if asked to go deeper.
**Speaker notes**: this slide exists specifically to show engineering maturity — problems encountered and solved, not just features shipped.
**Timing**: 45s.

## Slide 13 — Honest Limitations & Future Work
**Content**: 2-3 bullets — no automated test suite yet, Path Score formula isn't validated against real outcomes, no app-wide rate limiting yet.
**Speaker notes**: say these yourself, confidently, before being asked — see `presentation-guide.md`'s note on why this is the highest-leverage slide in the deck.
**Timing**: 45s.

## Slide 14 — Thank You / Questions
**Content**: "Thank you — Questions?", team names again, maybe a QR code to the live deployed app if you want the audience to try it themselves.
**Speaker notes**: stop talking once this slide is up — don't fill silence, let the question happen.
**Timing**: remainder of the slot.

---

## Assembly checklist
- [ ] Every screenshot is from the actual deployed/running app, not a mockup.
- [ ] All 3 diagrams (architecture, ER, AI pipeline sequence) are pulled from the verified `pathpilot_documentation.md`, not redrawn from memory.
- [ ] Slide 13 (limitations) is rehearsed out loud at least once — it's the easiest slide to accidentally rush or skip nervously.
- [ ] Total on-slide word count is low enough that you could present with the slides muted and still be understood from your own speech.
