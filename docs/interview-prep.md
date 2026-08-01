# PathPilot AI — Interview & Viva Preparation (130 Q&A)

> All answers are grounded in the verified codebase (see [`pathpilot_documentation.md`](../pathpilot_documentation.md)). Answer in your own words in the actual interview — these are the *facts* to build your answer from, not a script to recite verbatim.

- [A. Viva Questions (50)](#a-viva-questions-50) — general CS/software-engineering fundamentals, answered via this project
- [B. Technical Questions (50)](#b-technical-questions-50) — deep implementation detail
- [C. Project Questions (30)](#c-project-questions-30) — design decisions, tradeoffs, "why"

---

## A. Viva Questions (50)

1. **What is the architecture pattern used in this project?**
   A 3-tier service architecture: a React SPA (presentation), a Node/Express API (business logic + data), and a Django microservice (ML inference), communicating over HTTPS.

2. **Why did you split the backend into two services instead of one?**
   Node handles I/O-heavy web-app concerns well; Python has the mature ML ecosystem (scikit-learn, XGBoost, CatBoost, SHAP) Node lacks. Splitting also means the ML service can be redeployed/retrained independently.

3. **What database did you use and why?**
   MongoDB (Atlas M0 free tier) via Mongoose. Chosen because resume data, growth plans, and AI outputs are variable-shape JSON documents that don't map cleanly to a fixed relational schema.

4. **What is REST and how does your API follow REST principles?**
   REST is an architectural style using HTTP verbs (GET/POST/PATCH) on resource-shaped URLs. Our API follows this: `GET /resume` reads, `POST /resume/upload` creates, `PATCH /growth/task/:id` partially updates.

5. **What is JWT and why did you use it?**
   JSON Web Token — a signed, stateless token proving identity without a server-side session store. Used for the access token so the server doesn't need to look up a session on every request.

6. **Explain your authentication flow end to end.**
   Login verifies credentials, issues a short-lived access token (returned in the response body) and a long-lived refresh token (set as an HttpOnly cookie). The client attaches the access token as a Bearer header on every request; when it expires, an Axios interceptor silently calls `/auth/refresh` using the cookie and retries.

7. **Why two tokens instead of one?**
   A short-lived access token limits the damage window if it's ever leaked (e.g. via XSS reading memory/localStorage). The refresh token is HttpOnly so JavaScript can never read it, protecting it from XSS even though it lives longer.

8. **What is bcrypt and why cost factor 12?**
   A slow, salted password-hashing algorithm designed to resist brute-force. Cost factor 12 means 2^12 hash rounds — high enough to be expensive for an attacker, low enough to not noticeably slow down a real login.

9. **What is CORS and how did you handle it?**
   Cross-Origin Resource Sharing — a browser security rule blocking a page from calling a different-origin API unless the server opts in. The Node server's CORS middleware allows the deployed client's origin; the Django service allows only the Node server's origin.

10. **What is middleware in Express?**
    A function that runs between the incoming request and the final route handler, can inspect/modify the request, and either calls `next()` to continue or ends the response. Our `protect` middleware is a canonical example — it verifies the JWT before the controller ever runs.

11. **What does `asyncHandler` do and why is it needed?**
    Wraps an async Express route handler so a thrown/rejected error is passed to `next(err)` automatically. Without it, an unhandled promise rejection in a route would crash the process instead of returning a clean error response.

12. **What is a Mongoose schema?**
    A JavaScript definition of a MongoDB document's shape, types, and validation rules, compiled into a Model used for queries. It's how we get schema validation on top of MongoDB's normally schema-less documents.

13. **What is an ORM/ODM and does this project use one?**
    Object-(Document) Mapper — translates between application objects and database records/documents. Mongoose is our ODM, mapping JS objects to MongoDB documents.

14. **What is a TTL index and where did you use one?**
    A MongoDB index that auto-deletes documents after a set number of seconds past a timestamp field. Used on `LiveJobCache` (21600s / 6h) so cached job search results expire automatically without a cleanup cron job.

15. **What is SHAP and why use it?**
    SHapley Additive exPlanations — a game-theory-based method for attributing a model's prediction to its input features. Used to explain *why* the resume-score model gave the score it did, for transparency to the student.

16. **Name three machine learning algorithms used in this project and what each is for.**
    CatBoost (career-readiness category, salary band, learning track), Logistic Regression (ATS pass-likelihood), Random Forest (best-fit role), XGBoost (interview-readiness).

17. **What's the difference between classification and regression, and which does this project use?**
    Classification predicts a discrete category; regression predicts a continuous number. This project uses classification for role/career-category predictions and effectively regression-like scoring for numeric scores like resume quality.

18. **What is overfitting and how would you check for it here?**
    When a model learns the training data's noise instead of the general pattern, performing well on training data but poorly on new data. The training scripts compare multiple candidate algorithms on held-out validation data and keep the best-generalizing one, which is the standard mitigation.

19. **What is a REST API gateway, and does this project have one?**
    A single entry point that routes/authenticates requests to backend services. The Node server functions as one for the AI service — the browser never calls Django directly; Node proxies and adds the internal auth header.

20. **How do you protect an internal-only service that's still publicly reachable on the network?**
    A shared-secret header (`X-Internal-Key`) checked on every request via a decorator; requests without the correct key are rejected regardless of the URL being technically public.

21. **What is XSS and how does this project defend against it?**
    Cross-Site Scripting — injecting malicious JS that runs in another user's browser. The refresh token being HttpOnly (unreadable by JS) limits what an XSS exploit could steal; React's default JSX escaping also prevents injected HTML from rendering as markup.

22. **What is CSRF and is this project vulnerable?**
    Cross-Site Request Forgery — tricking a logged-in user's browser into making an unwanted request. The refresh cookie uses `sameSite:'none'` for cross-domain deploy, which is the setting most permissive to CSRF; this is a real, acknowledged tradeoff (see `docs/professor-mode-review.md`).

23. **What's the difference between authentication and authorization?**
    Authentication proves *who* you are (login); authorization decides *what* you're allowed to do. `protect` middleware handles authentication; `RequireAdmin`/role checks handle authorization.

24. **What is rate limiting and where is it applied here?**
    Restricting how many requests a client can make in a time window, to prevent abuse. `authLimiter` applies it specifically to login/register/forgot-password to blunt brute-force attempts; there is no app-wide rate limiter.

25. **What is a cron job and what does this project use it for?**
    A scheduled recurring task. `node-cron` runs a weekly job-market data refresh and daily notification jobs (e.g. stale-profile nudges).

26. **What's the difference between SQL and NoSQL, and why NoSQL here?**
    SQL databases use fixed relational schemas and joins; NoSQL (MongoDB) stores flexible documents. Chosen because resume/AI-output data varies in shape per student and doesn't need complex joins.

27. **What is a single-page application (SPA)?**
    A web app that loads once and updates the DOM via JavaScript instead of full page reloads, with client-side routing. React Router handles that routing here.

28. **What problem does client-side routing solve, and what problem does it create?**
    It gives instant, app-like navigation without full reloads. It creates a deployment problem — a direct URL like `/dashboard` isn't a real file on the server, so hosting needs an SPA catch-all rewrite (handled in `vercel.json`).

29. **What is HMR (Hot Module Replacement)?**
    A dev-server feature that swaps changed code into a running app without a full reload, preserving state. Provided by Vite in this project's dev workflow.

30. **What is a design system / component library and did you build one?**
    A consistent set of reusable UI tokens and components. This project has a hand-rolled one: a ~9-color token palette, 3 button variants, and reused card/input primitives, deliberately kept small rather than pulling in a full external library.

31. **Why avoid a large icon library and hand-roll icons instead?**
    Reduces bundle size and dependency surface for a project that only needs ~50 specific icons; a full icon library would ship far more than used.

32. **What is state management and how is it done here?**
    Handling and sharing application data across components. This app uses React Context (`AuthContext`, `ThemeContext`, `ToastContext`) rather than an external state library like Redux, since global state needs here are modest.

33. **Why Context API instead of Redux/Zustand?**
    The app's shared state is small (auth user, theme, toasts) — Context avoids the extra dependency and boilerplate a full state-management library would add for that scope.

34. **What is a controlled component in React?**
    An input whose value is driven by React state rather than the DOM's own internal state, with `onChange` updating that state. Used throughout the onboarding and resume-builder forms.

35. **What is prop drilling and how does this project avoid it where relevant?**
    Passing data through many intermediate component layers that don't use it themselves. Context avoids this for cross-cutting state like the logged-in user, which would otherwise have to be threaded through every route.

36. **What is a race condition, and where might one occur in the token-refresh logic?**
    When multiple operations access shared state in an unpredictable order. If two requests 401 at the same instant, both might try to refresh simultaneously; this project uses a single-flight `refreshing` promise so only one refresh call fires and both requests await the same result.

37. **What is idempotency and which of your endpoints are idempotent?**
    An idempotent operation produces the same result no matter how many times it's repeated. `GET` and `PATCH ... /read` (marking notification read) are idempotent; `POST /resume/upload` is not (each call can create a new resume record).

38. **What HTTP status codes does your API use and for what?**
    200/201 for success, 400 for validation errors, 401 for missing/invalid auth, 403 for authorization failures, 404 for missing resources, 500 for server errors — all funneled through the central `error.middleware.js`.

39. **What is input validation and how is it implemented?**
    Checking incoming data matches expected shape/type/constraints before processing. Zod schemas validate request bodies before controllers run.

40. **Why validate on the server if the client already validates the form?**
    Client-side validation is a UX convenience, not security — anyone can bypass it by calling the API directly (curl/Postman), so the server must independently enforce the same rules.

41. **What is environment-based configuration and why use it?**
    Storing settings (secrets, URLs, feature toggles) outside the codebase, injected via environment variables, so the same code runs correctly in dev/prod without code changes. `env.js` (Node) and `.env`/`python-dotenv` (Django) implement this.

42. **What does `DEBUG=False` do in Django and why does it matter for security?**
    Disables detailed error tracebacks and Django's debug pages, which would otherwise leak source code, settings, and stack traces to any visitor who triggers an error in production.

43. **What is a fail-closed default and where did you apply one?**
    A default that denies/restricts access when configuration is missing, rather than silently allowing it. `DJANGO_DEBUG` now defaults to `False` if unset, rather than the previous `True` default which would have shipped debug mode to production by accident if the env var was ever missed.

44. **What is dependency injection, and does this project use it?**
    Supplying a component's dependencies from outside rather than it constructing them itself. Not used formally via a DI framework here; services import what they need directly, which is reasonable at this project's scale.

45. **What testing exists in this project, and what's missing?**
    Manual/functional verification was performed throughout development (browser testing of each feature); there is no automated test suite (unit/integration tests) — a known gap, discussed candidly in `docs/professor-mode-review.md`.

46. **What is technical debt, and can you name an example here?**
    Shortcuts taken for speed that create future cost. Example: several ML module docstrings still claim "CatBoost" after a retrain changed the actual winning algorithm — harmless functionally, but misleading if left uncorrected.

47. **What is a monorepo, and is this project one?**
    A single repository containing multiple independently-deployable projects/packages. Yes — `client/`, `server/`, and `ai-service/` all live in one repo but deploy as three separate services.

48. **What deployment platforms did you use and why?**
    Vercel for the static React build (optimized for SPA hosting + edge CDN), Render for both backends (supports long-running Node/Python processes, unlike Vercel's serverless-first model), MongoDB Atlas for the database (managed, free tier available).

49. **What is WhiteNoise and why does the Django service use it?**
    A library that serves Django's static files directly from the app process, without needing a separate CDN/static file host — convenient for a small service on a platform like Render.

50. **What would you improve if you had another month?**
    Add automated tests, app-wide rate limiting and `helmet` security headers on the Node server, reconcile the ML docstrings with actual trained algorithms, and add real outcome data to move the Path Score from a hand-tuned formula toward a learned model.

---

## B. Technical Questions (50)

1. **Walk me through what happens when a student uploads a resume, in file-level detail.**
   `ResumePage.jsx` posts multipart form data to `POST /resume/upload` → `upload.middleware.js` (Multer) parses the file → `resume.controller.js` calls `resumeText.service.js` to extract raw text (pdf-parse/pdfjs-dist/mammoth depending on file type) → sends text to Django's `/api/parse-resume` via `ai.service.js` → runs `resumeRedFlags.js` locally → calls Gemini for narrative feedback → saves a `Resume` document → returns the combined result.

2. **How does the access-token refresh interceptor avoid an infinite loop?**
   It checks `!isAuthRoute` (skips retry logic for `/auth/*` calls) and sets `original._retry = true` before retrying, so a request is only ever retried once — if the retried request still 401s, it falls through to the final rejection instead of looping.

3. **Why is the refresh call itself excluded from the interceptor's retry logic?**
   If `/auth/refresh` returned 401 and the interceptor tried to "refresh" again in response, it would recurse forever; excluding auth routes breaks that cycle.

4. **What is the single-flight pattern in `api.js` and why is it needed?**
   The `refreshing` variable holds the in-flight refresh promise; if several requests 401 simultaneously, they all await the *same* promise instead of each firing its own `/auth/refresh` call, preventing redundant refresh requests and potential token race conditions.

5. **Explain `getSanitizedBaseURL()` in `api.js`.**
   Reads `VITE_API_BASE_URL` or `VITE_API_URL`, strips accidental wrapping quotes, and if it's a full URL uses it directly; otherwise falls back to `${window.location.origin}/api`, and finally to `/api`. This lets the same build work via Vite's dev proxy locally and via a real cross-domain URL in production.

6. **Why does the refresh cookie need `sameSite:'none'; secure:true` in production?**
   Because client (Vercel) and server (Render) are different domains in production, the browser will not send a `sameSite:'lax'`/`'strict'` cookie cross-site; `'none'` is required for cross-domain, and `secure:true` is mandatory whenever `sameSite:'none'` is used.

7. **What are purpose-scoped JWT secrets and why does `token.service.js` use them?**
   Different token types (access/refresh vs. email-verify vs. password-reset) are signed with different secrets, so a token issued for one purpose can never be verified as valid for another — a leaked password-reset link can't be replayed as a login session, for example.

8. **How does `normalizePrivateKey()` in `firebase.js` fix the production Firebase error?**
   It strips wrapping single/double quotes and converts literal `\n` escape sequences to real newlines before the key is passed to `cert()`. The bug happened because dotenv strips quotes locally but Render's raw env-var UI field doesn't, leaving literal `"..."` around the key that broke PEM parsing.

9. **Why was `/api/ml/predict` missing auth middleware, and how was it found?**
   It was the only router in the app that didn't apply `protect`, found during a full route-by-route audit; its controller dereferences `req.user` unconditionally, meaning an unauthenticated call would have thrown rather than silently succeeding, but the endpoint itself was still improperly reachable without a valid session.

10. **What does the fail-loud guard in `settings.py` actually check, and when does it fire?**
    When `DEBUG` is `False`, it checks whether `SECRET_KEY`/`INTERNAL_API_KEY` still equal their source-visible placeholder defaults; if so, it raises `ImproperlyConfigured` at startup, refusing to boot rather than running insecurely.

11. **Why raise at startup instead of just logging a warning?**
    A warning can be missed in logs; a startup crash is impossible to miss and guarantees a misconfigured production deploy never silently serves traffic with known-weak secrets.

12. **What does `require_internal_key` protect against, precisely?**
    Anyone who discovers the Django service's public Render URL from calling any ML endpoint directly — DRF's own permission classes are `AllowAny`, so this decorator is the *entire* access control for the service.

13. **Why leave DRF's permission classes as `AllowAny` instead of using DRF auth?**
    The service has no concept of individual users or sessions — it's stateless ML inference for one trusted caller (the Node server) — so a single shared-secret header is simpler and sufficient; DRF's user-based auth machinery would be unused complexity.

14. **Explain the Path Score formula's 5 factors.**
    Resume quality (from the AI-service health score), skill match to target role, an experience factor (projects/internships), activity/consistency (growth-plan task completion rate), and a semester-adjusted expectation cap that scales what's "normal" by year.

15. **Why is the Path Score a hand-tuned formula rather than a trained model?**
    There's no ground-truth label (e.g., "did this student get hired") to train against, so a transparent weighted formula is both honest about its basis and lets the growth plan point at the specific weak factor — a black-box model couldn't do that explanation.

16. **What does the "semester cap" do and why does it exist?**
    It scales expected experience by academic year, so a first-semester student isn't penalized for lacking internships a final-year student would be expected to have, and a senior with a thin profile isn't artificially inflated either.

17. **How does `predictor.py` load and use the 7 trained models?**
    It hardcodes a path to `ml/models/<name>/` (independent of `settings.MODELS_DIR`, which is unused/dead), loads each `.pkl` via `joblib`, transforms the input request into the feature vector each model expects, and calls `.predict()`/`.predict_proba()`.

18. **What library actually won training for the `ats` model, despite its docstring?**
    Logistic Regression — the docstring claims CatBoost, but the training script's comparison found Logistic Regression scored better on that particular target.

19. **Why are all models saved as `.pkl` via joblib instead of each library's native format?**
    Consistency — `predictor.py` can load every model the same way regardless of which library trained it, rather than branching load logic per algorithm.

20. **What's the difference between `TreeExplainer` and `KernelExplainer` in `explainer.py`, and when is each used?**
    `TreeExplainer` is fast and exact for tree-based models (CatBoost/XGBoost/RandomForest); `KernelExplainer` is a slower, model-agnostic fallback used for non-tree models like Logistic Regression.

21. **Why is SHAP only applied to the resume_score model and not all 7?**
    It's invoked specifically in the combined `predict_all` path for that one model — a deliberate scope decision to keep response latency down rather than explaining every prediction on every request.

22. **What does `growth_planner.py`'s greedy algorithm actually do?**
    It packs weekly tasks into an assumed 8-hour/week budget, prioritizing tasks that close the largest skill gaps first, until the week's time budget is used up.

23. **What's a limitation of the 8-hour/week assumption?**
    It's fixed and not configurable per student — a student with more or less real available time gets the same weekly task load regardless.

24. **How does `career_analysis.py` actually compute its score, versus what its docstring claims?**
    It's a deterministic weighted-sum formula — the docstring's "Random Forest" claim is inaccurate; no trained model is involved at all in that module.

25. **What is the TTL index on `LiveJobCache` set to, and why that duration?**
    21600 seconds (6 hours) — long enough to meaningfully reduce calls to the external Adzuna API, short enough that job listings don't go too stale.

26. **Why is `LiveJobCache` keyed by query hash rather than by user?**
    Different students searching the same/similar terms can share one cached result set, rather than each student re-fetching identical external data.

27. **What replaced the kanban application tracker, and how?**
    A single `status` field on the `Opportunity` model, using the exported `OPPORTUNITY_STAGES` constant, rendered as a simple dropdown/badge in the Jobs page instead of a drag-and-drop board — the underlying data model was simplified, not just the UI.

28. **What is `gemini.service.js`'s model-fallback logic?**
    It attempts a call against a primary Gemini model, and if that call errors or is rate-limited, retries against a secondary model, so a single model's outage/quota exhaustion doesn't fully break AI Coach/interview features.

29. **What are the two cron files and what does each schedule?**
    `jobMarketCron.js` runs a weekly Adzuna data refresh; `notificationCron.js` runs 4 scheduled jobs (e.g. stale-profile nudges, job-alert digests).

30. **Why is `Resume` a separate Mongoose model from `ResumeBuilder`?**
    They represent genuinely different data — `Resume` is parsed/scored content from an uploaded file, `ResumeBuilder` is structured content the student authored inside the app — a student can have both simultaneously and independently.

31. **How does the resume builder's export feature generate PDF vs DOCX?**
    `resumeBuilderExport.service.js` uses `@react-pdf/renderer` for PDF generation and the `docx` package for Word document generation, both driven from the same structured `ResumeBuilder` document.

32. **What's the middleware order in `app.js`, and why does order matter?**
    CORS → body parsers → cookie-parser → morgan (dev only) → static avatar serving → protected resume-file route → API routers → 404 handler → error handler. Order matters because, e.g., body parsing must happen before any handler reads `req.body`, and the error handler must be registered last to catch errors from everything before it.

33. **Why is `morgan` (request logging) dev-only?**
    Verbose per-request logging isn't needed (and adds noise/cost) in production; it's primarily a local-development debugging aid.

34. **What does `db.js`'s "public DNS resolver workaround" solve?**
    Some hosting/network environments can't complete MongoDB Atlas's SRV DNS record lookups with their default resolver; explicitly using a public DNS resolver (e.g. Google's/Cloudflare's) works around that failure.

35. **Why does the Vite config proxy `/api` and `/uploads` in dev?**
    So the client's fetches to `/api/...` transparently reach the local Node server on a different port without the browser treating it as a cross-origin request during development, avoiding needing to configure CORS for local dev.

36. **What does `vercel.json`'s rewrite configuration do in production?**
    Rewrites `/api/:path*` and `/uploads/:path*` to the deployed Render server URL, making the cross-domain API calls look same-path from the client's routing perspective, plus an SPA catch-all so client-side routes don't 404 on a hard refresh.

37. **Why does Tailwind v4 not need a `tailwind.config.js` here?**
    Tailwind v4 supports CSS-first configuration via the `@theme` directive directly in the stylesheet, replacing the old JS config file for defining design tokens.

38. **Describe the Tailwind cascade-layer bug that was fixed.**
    Custom component classes (like `.card`) defined outside any `@layer` block rank *above* all of Tailwind's own layered utilities regardless of specificity or source order, so a utility class like `w-24` couldn't override them. Fixing it meant wrapping the custom classes in `@layer components { ... }` so they participate in the same cascade layer ordering as Tailwind's own utilities.

39. **Describe the Framer Motion stacking-context bug that was fixed.**
    A `motion.span` using `-z-10` only stayed visually behind sibling text while Framer Motion's active `transform` created a temporary local stacking context; once the animation settled and the transform reset, the negative z-index escaped to a real ancestor stacking context and rendered behind the entire page. Fixed by giving the foreground element a positive z-index instead of relying on the animated element's negative one.

40. **Why use Zod for validation instead of manual `if` checks?**
    Declarative schema definitions are easier to read, reuse, and keep in sync with the data shape than scattered manual checks, and Zod produces structured error messages automatically.

41. **What does `oxlint` do differently from ESLint, and why was it chosen?**
    It's a Rust-based linter aiming for much faster execution than ESLint's JS-based engine, chosen for faster feedback in the dev loop at some cost of ESLint's larger plugin ecosystem.

42. **Why does the client use a hand-rolled `cn.js` instead of the `clsx` package?**
    It's a one-function utility; adding a dependency for something implementable in a few lines wasn't worth the extra package.

43. **What causes the `toast.warn is not a function` bug that was fixed?**
    `ToastContext` only exposes `success`/`error`/`info`/`warning` — `ProfilePage.jsx` called the nonexistent `toast.warn`, which threw uncaught inside an event handler (invisible to the React ErrorBoundary, since it wasn't a render-phase error). Fixed by correcting the call to `toast.warning`.

44. **Why did clearing auth state before navigating on logout cause a bug, and how was it fixed?**
    Clearing the auth state first made `ProtectedRoute` immediately re-evaluate and redirect to `/login` mid-navigation, before the intended landing-page navigation completed. The fix reorders it: navigate to the landing page first, then clear the auth session.

45. **How does `insights.controller.js`/`insights.service.js` assemble the dashboard payload?**
    It reads the student's `User`/`Resume`/`GrowthPlan` documents from MongoDB, calls the Django service's `/api/predict-readiness` for ML-derived sub-scores, and calls `pathScore.service.js` to compute the final combined score, returning one combined JSON payload the dashboard renders from.

46. **Why call Gemini after the Django ML scoring, not before or in parallel?**
    Deterministic/statistical scoring is cheap and has no external network dependency, so it runs first; Gemini (an external LLM API with latency/cost) is only invoked once the numeric picture is already known, so its role is narrative explanation of an already-computed result, not the scoring itself.

47. **What is `ApiResponse`'s standard shape and why standardize it?**
    `{ success, message, data }` on every successful response — standardizing it means the frontend can write one generic response-handling pattern instead of parsing a different shape per endpoint.

48. **How would you add a new ML-scored feature to this system, file by file?**
    Add a training script under `ai-service/ml/training/`, save the winning model under `ai-service/ml/models/<name>/`, add inference logic to `predictor.py`, expose it via a new/extended view in `views.py`, add a corresponding call in `server/src/services/ai.service.js`, and wire a controller/route on the Node side to expose it to the frontend.

49. **What would break first under real production load, based on what you know of this codebase?**
    The MongoDB Atlas M0 free tier's connection/storage limits, and the lack of app-wide rate limiting on the Node server, are the two most likely first failure points under real traffic.

50. **If MongoDB Atlas connection fails on server startup, what happens?**
    `index.js` connects to MongoDB before starting the HTTP server and cron jobs — a failed connection there prevents the server from ever starting, rather than starting in a broken partial state.

---

## C. Project Questions (30)

1. **Why did you build this project?**
   To give students one place that turns "am I ready for my target job" from a vague feeling into a concrete, explainable score with a specific weekly action plan.

2. **Who is the target user?**
   College students preparing for placements/internships, particularly those unsure how their resume and skills stack up against a specific target role.

3. **What makes this different from a generic resume-scoring tool?**
   It combines resume scoring with skill-gap analysis, a generated weekly roadmap, live job market data, and mock interview practice — one connected loop rather than a single isolated score.

4. **What was the hardest technical problem you solved?**
   Reasonable answers: the cross-domain auth cookie setup for production deployment (sameSite/secure config across two different domains), or diagnosing the Tailwind v4 cascade-layer bug that silently broke utility overrides.

5. **What was the most significant bug you found and fixed?**
   The missing `protect` middleware on `/api/ml/predict` — the only unauthenticated route in the entire API, found via a systematic route-by-route security audit.

6. **How did you decide on the Path Score's weighting?**
   Manually, based on judgment about what most affects real readiness (resume quality, skill match, experience, consistency) — explicitly not learned from data, since no ground-truth "got hired" signal exists to train against.

7. **Why Gemini specifically, and not another LLM?**
   Google's Gemini API was available with a usable free/low-cost tier and an official Node SDK (`@google/genai`), fitting a capstone project's budget and integration-time constraints.

8. **Why did you remove/hide references to "Gemini" from the UI?**
   A product decision to keep the AI branding generic/product-owned in the interface rather than exposing the specific underlying vendor to end users, while the backend integration itself is unchanged.

9. **Why redesign the landing/login pages multiple times?**
   Early iterations didn't match the visual production quality of reference products (Linear/Vercel/Raycast-tier polish) and used inconsistent theming (a dark "flight-deck" auth panel next to other pages); iterating against direct visual feedback converged on a single consistent light theme.

10. **Why remove the kanban application tracker?**
    It duplicated information also shown in the Jobs page and added UI complexity (drag-and-drop) without a proportional benefit over a simple status field — simplifying to one field improved consistency without losing functionality.

11. **How did you approach the security audit?**
    Systematically, service by service: read every route file to check auth middleware coverage, checked default configuration values (like Django's `DEBUG` default), and reviewed how secrets/tokens are generated, stored, and scoped.

12. **What security weaknesses does the project still have?**
    No app-wide rate limiting or `helmet` security headers on the Node server, `sameSite:'none'` cookies (a CSRF-exposure tradeoff required by the cross-domain deployment), and no automated security testing — all discussed candidly in `docs/professor-mode-review.md`.

13. **Why MongoDB over PostgreSQL/MySQL for this project?**
    The data (resumes, AI outputs, growth plans) is naturally document-shaped and varies per student; a relational schema would require more upfront rigidity for data that doesn't need complex relational joins.

14. **Why deploy client, server, and AI service on three different platforms?**
    Each platform fits its workload best: Vercel is optimized for static SPA hosting with a global CDN; Render supports long-running Node/Python processes (which Vercel's serverless model doesn't, especially for the always-on Django ML service); MongoDB Atlas is a managed database service, not something you'd self-host on either.

15. **What would you do differently if starting over?**
    Write automated tests from the start rather than relying on manual verification, and settle on the final design system/theme earlier instead of iterating through multiple visual directions mid-project.

16. **How do you know the Path Score is actually meaningful, not arbitrary?**
    It isn't validated against real hiring outcomes (a real, acknowledged limitation) — its meaningfulness currently rests on the individual factors being sensible proxies (resume quality, skill match, experience, consistency), not on statistical validation.

17. **What happens if the Django AI service is down when a student loads the dashboard?**
    The Node server's call to it would fail/timeout; depending on the specific controller's error handling this either degrades gracefully with partial data or surfaces an error — this is a real dependency the dashboard has on the AI service's uptime.

18. **How would this scale to 10,000 concurrent students?**
    The MongoDB Atlas free tier and single-instance Render deployments would need upgrading first; the stateless JWT auth design and cache layer (`LiveJobCache`) already help by avoiding server-side session storage and reducing redundant external API calls.

19. **Why build a custom resume builder instead of just scoring uploaded resumes?**
    Some students don't have an existing resume to upload, or want to build one that's already optimized against the app's own ATS scoring as they write it, rather than writing blind and scoring after the fact.

20. **How does the interview feature avoid feeling like a static question bank?**
    Questions are generated per-session via Gemini rather than pulled from a fixed stored list, so sessions vary and can be tailored to the student's target role.

21. **What's the role of the growth plan in the overall product loop?**
    It's the "what to do about it" companion to the Path Score — instead of just showing a number, it converts the weakest factors into a concrete, time-boxed weekly task list.

22. **Why cap resume/skill analysis to a target role instead of scoring generally?**
    Readiness is role-relative — the skills and resume content that matter for a backend role differ from a design role, so scoring without a target role would be far less actionable.

23. **What tradeoff did you make choosing MongoDB Atlas's free tier?**
    Zero infrastructure cost during development, at the cost of limited storage/connections that would need upgrading before real production scale.

24. **How did you validate the ML models were reasonable, given no real hiring outcome data?**
    Each training script compares 2-3 candidate algorithms against each other on held-out validation data and keeps the best-by-metric — a relative comparison, not an absolute real-world validation, which is an honest limitation to state.

25. **What was the reasoning behind purpose-scoped JWT secrets?**
    Limiting blast radius: if one token type's secret were ever compromised, purpose-scoping means it still couldn't be used to forge a different type of token (e.g. a reset-token secret leak can't mint a valid access token).

26. **Why does the AI service refuse to start in an insecure configuration rather than just warning?**
    A capstone/small-team project doesn't have dedicated ops monitoring watching logs for warnings constantly — a hard startup failure is the only guarantee a misconfigured deploy never silently serves traffic with default/weak secrets.

27. **What's a design decision you're not fully happy with, and why?**
    The Path Score formula's weights are hand-tuned rather than data-validated — defensible given no labeled outcome data exists, but it's the project's weakest empirical claim and worth stating honestly rather than overselling it as "AI-driven."

28. **How does the notification system decide what to notify about?**
    Two scheduled cron jobs generate notifications on rules like profile staleness and new job matches — the JobAlertState model tracks what's already been sent to avoid duplicate alerts.

29. **What's the significance of the `OPPORTUNITY_STAGES` export in `Opportunity.js`?**
    It's the single source of truth for valid status values (Applied/Interviewing/Offer/Rejected etc.), keeping the frontend status dropdown and backend validation in sync from one place instead of two.

30. **If a professor asks "is this AI or just if-statements," how do you answer honestly?**
    Both, depending on the feature: resume/skill-gap red-flag detection and career_analysis scoring are deterministic rule/formula-based logic (not ML); the 7 predictor models are genuinely trained ML (CatBoost/XGBoost/RandomForest/LogisticRegression, chosen by comparison during training); the qualitative narrative feedback and interview questions are LLM-generated via Gemini. Being able to say precisely which parts are which is a stronger answer than claiming everything is "AI."
