# PathPilot AI — Live Demo Script

> Total runtime: ~10-15 minutes. Have a test account already registered as a fallback in case live registration hits an edge case (email delivery delay, etc.) — register a **fresh** account live if time/reliability allows, since watching an empty account fill up is more convincing than a pre-loaded one.

**Before you start**: load the app once, 5 minutes before presenting, so a sleeping Render free-tier instance is already awake (see `presentation-guide.md`).

---

## 1. Landing page (30s)

**Click**: open the deployed URL (`/`).
**Say**: "This is PathPilot AI — a career-readiness platform for students. Let's create an account and go through the actual student journey."
**Expected**: light-theme marketing landing page loads, hero section visible.
**Click**: "Get Started" / "Sign Up" button.

## 2. Register (45s)

**Click**: navigate to `/register`.
**Type**: a fresh test email, a password.
**Say**: "Password/email registration goes through our own auth system — bcrypt-hashed passwords, JWT-based sessions. We also support Google OAuth via Firebase, but I'll stick to email for reliability on this network."
**Click**: Submit.
**Expected**: redirected to `/onboarding` (the `RequireOnboarding` guard sends any new user here automatically since their profile isn't complete yet).

## 3. Onboarding (1 min)

**Say**: "Before anything else, we need to know what the student is aiming for — that's what makes every score afterward role-relative instead of generic."
**Click through**: select branch, year (pick a mid-level year, e.g. 3rd year, so both experience and semester-cap logic show something meaningful later), target role (e.g. "Backend Developer"), and a short list of current skills.
**Click**: Finish/Submit.
**Expected**: redirected to `/dashboard`. Dashboard shows an empty/low state since no resume is uploaded yet — this is expected, don't apologize for it, use it as the segue.
**Say**: "Right now the dashboard has almost nothing to show — because we haven't given it a resume yet. Let's fix that."

## 4. Resume upload (1.5 min — the highlight moment)

**Click**: navigate to `/resume`.
**Click**: upload a real (or realistic sample) PDF resume.
**Say while it processes**: "Behind this one upload, three things are happening: our Django service parses the resume with rule-based extraction for a structural health score, a set of trained ML models predict readiness across several dimensions, and Gemini generates qualitative feedback in plain language — all combined into one result."
**Expected**: resume score breakdown appears (structural score, red flags list if any, ATS-related feedback).
**Click**: navigate back to `/dashboard`.
**Expected**: the Path Score gauge is now populated with a real number.
**Say**: "That's the Path Score — one number, but it's built from five weighted factors: resume quality, skill match to the target role, experience, activity/consistency, and a semester-adjusted expectation cap so a first-year and a final-year student aren't held to the same bar."

## 5. Gap Analysis (1 min)

**Click**: navigate to `/gap-analysis`.
**Say**: "This breaks the same target-role comparison down by individual skill — showing specifically what's missing, not just a single score."
**Expected**: a list/chart of skills the student has vs. what the target role typically requires.

## 6. Growth Plan (1.5 min)

**Click**: navigate to `/growth-plan`.
**Say**: "This is the roadmap — a weekly task list generated to close exactly the gaps we just saw, assuming about 8 hours of study time a week."
**Click**: check off one task as complete.
**Expected**: task shows as completed; mention (don't necessarily demo live, it's not visually obvious) that this feeds back into the "consistency" factor of the Path Score on next recompute.

## 7. Jobs (1.5 min)

**Click**: navigate to `/jobs`.
**Say**: "This pulls live job/internship listings from a public job market API, cached for a few hours so we're not hammering the external API on every page load."
**Click**: save/track one listing.
**Expected**: it appears in a "tracked" section with a status field (Applied/Interviewing/Offer/etc.) — mention this replaced an earlier kanban-board design that was more complex than the feature needed.
**Click**: change the status on the tracked listing.
**Expected**: status updates immediately.

## 8. Mock Interview (1.5 min — keep short, one round only)

**Click**: navigate to `/interview`, start a session.
**Say**: "Questions here are generated per session by Gemini, tailored to the target role — not pulled from a static bank."
**Click**: answer one question (type a short real answer).
**Expected**: AI-generated feedback appears on the answer.
**Say**: "I'll stop after one question in the interest of time, but a full session runs several rounds with a summary at the end."

## 9. AI Coach (30s, optional if time allows)

**Click**: navigate to `/ai-coach`.
**Type**: a short freeform question (e.g. "what should I focus on this month?").
**Expected**: a conversational response referencing the student's actual profile/score context.

## 10. Resume Builder & Reports (30s, quick pass — don't demo deeply)

**Click**: briefly open `/resume-builder`, mention it's a from-scratch resume editor with live ATS scoring as you type, separate from the uploaded-resume flow.
**Click**: briefly open `/reports`, mention it's an exportable snapshot of overall progress.
**Say**: "I won't go deep on these two in the interest of time, but they're both fully functional — happy to show either in Q&A."

## 11. Logout (15s, only if closing the loop matters for your talk)

**Click**: logout.
**Expected**: redirected cleanly to the landing page.
**Say (optional, only if a professor asks about session handling)**: "Logging out clears the refresh cookie server-side and the access token client-side, and we specifically navigate to the landing page before clearing local auth state — clearing it first was actually a bug we found, since it triggers our route guard to redirect to `/login` mid-navigation instead of landing cleanly on the homepage."

---

## If something breaks live

- **Server appears to hang / spinner never resolves**: likely a sleeping Render free-tier instance waking up — say so plainly ("this is a cold start on our free hosting tier") rather than going silent, and wait 15-20s.
- **Gemini/AI Coach gives an odd response**: don't panic-narrate; move on, LLM output variance is expected and not a sign of a broken system.
- **A feature genuinely errors**: say "that's a known area we're still hardening" if it matches something in `professor-mode-review.md`, or "let me note that and check it after" if it's new — never pretend it didn't happen.
- **Total fallback**: switch to the pre-recorded screen capture and narrate over it.
