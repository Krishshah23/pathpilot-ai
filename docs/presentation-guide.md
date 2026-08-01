# PathPilot AI — Presentation Guide

> A minute-by-minute plan for a ~15-minute college project presentation (adjust timings proportionally if your slot is shorter/longer). Pairs with [`ppt-guide.md`](ppt-guide.md) for slide content and [`demo-script.md`](demo-script.md) for the live demo portion.

## Before you start

- Confirm the live demo environment works **on the presentation room's network** beforehand — Render free-tier services sleep after inactivity and take 30-60s to wake on first request. Load the app and click through once, 5 minutes before you present, so the first real click in front of the professor isn't the one that wakes a sleeping server.
- Have a backup: screen-recorded video of the demo, in case live internet fails.
- Know your weakest area cold — see [`professor-mode-review.md`](professor-mode-review.md) before you present, not after a professor asks about it.

---

## Timeline (15 minutes)

### 0:00–1:30 — Opening (90s)
State the problem in one sentence, then the solution in one sentence. Don't open with "so basically what we did was..." — open with the problem.

> *"Students preparing for placements don't have one place that tells them, concretely, how ready they are for a specific role and what to do about it this week. PathPilot AI is that place — it scores your resume, finds your skill gaps against a target role, and builds you a weekly plan to close them."*

### 1:30–3:00 — Architecture overview (90s)
Show the 3-box architecture diagram (from `ppt-guide.md` slide 3 / `pathpilot_documentation.md` §2). Say the one-sentence architecture pitch: *"A React frontend talks to a Node API that owns the data; the Node API is the only thing that talks to a locked-down Django service that runs our machine learning models."* Name the 3 platforms only briefly (Vercel/Render/Atlas) — don't dwell on deployment yet, that's a likely Q&A topic, not a headline.

### 3:00–4:00 — Tech stack (60s)
One slide, spoken fast: React 19 + Vite + Tailwind v4 on the frontend, Node/Express/MongoDB on the backend, Django + scikit-learn/XGBoost/CatBoost + SHAP for ML, Google Gemini for the language-model features. Don't read the slide line by line — say it as one connected sentence per layer.

### 4:00–11:00 — Live demo (7 min)
Follow [`demo-script.md`](demo-script.md) exactly. This is the heart of the presentation — everything else is framing for this. Suggested beats:
- Register/login (30s) — don't dwell, mention Google OAuth exists but don't demo the popup live (flaky on shared wifi/projectors).
- Onboarding → resume upload → Path Score appears (2 min) — this is the "wow" moment, give it the most time.
- Growth plan + gap analysis (1.5 min).
- Jobs page (1 min).
- Mock interview, one question round only (1.5 min) — don't run a full session live, it's slow.
- Quick pass over resume builder and reports (30s, don't demo deeply, just show it exists).

### 11:00–13:00 — What makes this technically interesting (2 min)
Pick 2, not all, of these — going deep on two is stronger than skimming five:
- The two-token JWT auth pattern and why it's secure against XSS.
- The 7-model ML ensemble with SHAP explainability.
- The purpose-scoped secret architecture protecting the internal ML service.
- The security audit and what was found/fixed (shows engineering maturity, not just feature-building).

### 13:00–14:00 — Honest limitations (60s)
Say 1-2 real limitations yourself, before a professor finds them. This is the single highest-leverage thing you can do — see `professor-mode-review.md` for the full list, but the two strongest to volunteer are: no automated test suite yet, and the Path Score formula is hand-tuned rather than validated against real hiring outcomes (since no labeled outcome data exists to train against). Volunteering this proactively reads as maturity, not weakness.

### 14:00–15:00 — Close (60s)
One sentence on what you'd build next (pick from `professor-mode-review.md`'s improvement list), then stop talking and open the floor.

> *"If we had another month, the two things we'd prioritize are automated testing and app-wide rate limiting — both are real gaps we found in our own audit, not hypothetical ones. Happy to take questions."*

---

## Speaker notes — things to actually say vs. avoid

**Say:**
- "We found and fixed X" (shows you audit your own work — very strong signal).
- Specific numbers: "7 trained models", "5-factor weighted score", "6-hour cache TTL" — specificity reads as real understanding.
- "We chose X over Y because Z" whenever explaining a decision — always give the reason, not just the choice.

**Avoid:**
- "It's basically AI-powered" as a catch-all — a professor will immediately ask "which part is actually machine learning and which part is a formula?" Know the answer before you're asked (see interview-prep.md C.30).
- Reading slide text verbatim.
- Claiming the Path Score is "accurate" or "validated" — it isn't validated against real outcomes; say "a transparent weighted score based on measurable factors" instead.
- Over-crediting Gemini/LLM features as the core innovation — the ML ensemble, scoring algorithm, and system architecture are the more defensible technical contributions to lead with.

---

## Anticipated professor questions (see interview-prep.md for full answers)

Have instant, confident answers ready for these — they are the most likely to come up given the project's actual design:

1. "Which parts are real machine learning and which are just formulas/rules?" → interview-prep.md C.30.
2. "How did you validate the Path Score is meaningful?" → interview-prep.md C.16, C.24 (answer honestly: it isn't validated against real outcomes).
3. "Why three separate services instead of one?" → interview-prep.md A.2.
4. "What security testing did you do?" → interview-prep.md A.45 + the security-audit findings; mention the missing-auth-middleware bug you found and fixed.
5. "What's the biggest weakness of this project?" → have ONE honest answer ready, not "we don't really have any" — see `professor-mode-review.md`.

## Things to avoid during Q&A

- Don't guess at a code-level detail you're not sure of — say "let me check that in the code" rather than inventing an answer, especially about the ML training pipeline where several docstrings are known to be inaccurate (you don't want to accidentally repeat a wrong docstring claim as fact).
- Don't get defensive if a weakness is pointed out — the strongest response is "yes, that's a real gap, here's what we'd do about it," which is exactly what `professor-mode-review.md` prepares you to say.
