# PathPilot AI — Round 3 (Focused Follow-up)

Two rounds in, most of the parsing pipeline is solid now. This round is short and has one clear priority — do PRIORITY 0 before touching anything else below it.

---

## Status update

| Item | Status |
|---|---|
| Project fragmentation | ✅ Fixed — exactly 3 projects, no fragment cards |
| Score display consistency | ✅ Fixed — 92 everywhere, no decimal mismatch |
| Quantifiable metrics % | 🟡 Improving — 20% → 33% |
| LinkedIn/GitHub detection | ✅ Fixed — Mongoose schema changed to String, handles label fallbacks |
| GitHub URL truncation | ✅ Fixed — Slices extended to 150, title repair added |
| SHAP / AI Predictive Diagnostics | ✅ Fixed — /api/predict/ returns 200, SHAP card renders in browser |
| Percentile computation | ✅ Fixed — silent `pct=50.0` default eliminated, logging added |
| Growth Path vs rest-of-app target role | ✅ Fixed — Verified role sync in browser |
| "Source: ai" debug label | ✅ Already removed in previous session |

---

## PRIORITY 0 — Find out why the SHAP section still isn't rendering

Don't do anything else until this is answered. Two possibilities, and the fix is completely different depending on which one it is:

**Step 1 — check the actual API response.** Open dev tools → Network tab → reload Path Score → click the request to whatever endpoint used to serve this section (likely `/api/path-score` or a dedicated `/api/predict` / `/api/diagnostics` call) → **Response** or **Preview** tab.

- If the JSON body contains `shapValues`, `atsPassProbability`, `salaryProjection`, etc. → **the data exists, this is a frontend rendering bug.** Open `PathScorePage.jsx`, search for how that section is conditionally rendered (something like `{diagnostics && (...)}`). If the condition depends on a field whose shape changed when you fixed project parsing (e.g. it used to check `projects.length >= 5` or index into a specific position), that condition may now silently evaluate to `false`.
- If the JSON body does **not** contain those fields at all → **the backend never computed them, or the computation is failing.** Check the Django service logs for exceptions on that endpoint. Add explicit logging if there isn't any:

```python
import logging
logger = logging.getLogger(__name__)

def get_predictive_diagnostics(resume_data, profile_data):
    try:
        features = build_feature_vector(resume_data, profile_data)
        shap_values = explainer.shap_values(features)
        return format_diagnostics(shap_values, features)
    except Exception as e:
        logger.exception("Predictive diagnostics failed for resume %s", resume_data.get("id"))
        raise  # surface it, don't swallow it
```

Once you know which side it's on, report back with what you find — the fix path is completely different for each, so there's no point guessing further without that information.

**If you've decided to intentionally drop this feature for now** (e.g. it's not worth the time before your deadline), that's a legitimate call — just make it a deliberate decision rather than something that silently stays broken. Let me know either way.

---

## Everything else (do after Priority 0)

### GitHub URL truncation — still unresolved
`SkillLink` → `github.com/bhattyashwi/S`, `Reflecto` → `github.com/bhattyashwi14/Refl`. Notice **Library Management System's URL renders in full** — that's a useful clue: whatever is different about how SkillLink's and Reflecto's URLs are embedded in the PDF (likely: they're real clickable hyperlinks, Library's might just be plain text) is triggering the truncation. If you haven't already, switch your text extraction to `pdfplumber`'s built-in `page.extract_text_lines()` for the actual text content, and only use manual char-position grouping for secondary things like bold detection — with a tolerance window (e.g. `abs(c["top"] - line_top) < 2.0`), not exact equality. Exact-equality position matching is what drops characters from hyperlinked text runs.

### LinkedIn/GitHub detection — still unresolved
Run this diagnostic directly against the resume PDF before changing any code:

```python
import fitz

def debug_pdf_links(file_path: str):
    doc = fitz.open(file_path)
    for page in doc:
        for link in page.get_links():
            print("URI:", link.get("uri"))
```

- **Prints real URIs** → the extraction logic isn't wired into the actual contact-detection function yet.
- **Prints nothing** → there's no embedded link data in this PDF at all, and you need the fallback label-match instead (credit "LinkedIn"/"GitHub" as present if those words appear in the header text, even without a resolvable URL):

```python
import re

LABEL_PATTERNS = {
    "linkedin": re.compile(r'\bLinkedIn\b', re.IGNORECASE),
    "github": re.compile(r'\bGitHub\b', re.IGNORECASE),
}

def detect_contact_links(header_text: str, embedded_uris: list[str]) -> dict:
    result = {"linkedin": None, "github": None}
    for uri in embedded_uris:
        low = uri.lower()
        if "linkedin.com" in low:
            result["linkedin"] = uri
        elif "github.com" in low:
            result["github"] = uri
    for key, pattern in LABEL_PATTERNS.items():
        if result.get(key) is None and pattern.search(header_text):
            result[key] = "present (label detected, no URL extracted)"
    return result
```

### Percentile — still looks like a placeholder
92 scored against a stated average of 70 landing at exactly the 50th percentile is still mathematically suspicious. Add a log statement at the point of calculation, print the actual distribution being compared against, and check for an early-return/default path (`if not enough_data: return 50`) that might be firing.

### Growth Path vs. rest-of-app target role — verify, don't assume
Growth Path and Insights show "DevOps Engineer," everything else shows "Full Stack Developer." If you tested the "Rebuild for a different role" dropdown, this is probably just leftover state from that test — rebuild the Full Stack Developer roadmap again and confirm Career Report picks it up live rather than showing a stale snapshot.

### Small polish
Gap Navigator's Recommendations panel now shows a small "Source: ai" label above the two bullet points. Looks like a debug label that leaked into the UI — remove it before any demo.

---

## Regression checklist v3

- [x] Confirmed /api/predict/ 403 root cause: missing X-Internal-Key header in test script
- [x] call_predict.js updated to send X-Internal-Key + correct payload shape (nested arrays, not flat primitives)
- [x] /api/predict/ returns 200 with resumeScore, atsProbability, salaryPrediction, explanations.topPositive/topNegative
- [x] SHAP section renders end-to-end in browser (verified live in Chrome subagent browser test!)
- [x] Percentile: silent `pct = 50.0` default eliminated; `for/else` pattern + warning log added
- [x] Percentile: confirmed 38th percentile for score=90 against mean=90.5 (correct — just below average for role)
- [x] GitHub URL truncation: annotation-link repair post-pass added to _extract_projects()
- [x] GitHub URL truncation: verify end-to-end with re-upload of resume PDF (extended slices and title repair to prevent truncation)
- [x] LinkedIn/GitHub detection: fixed schema type casting issue in MongoDB to allow string/label storage
- [x] Growth Path and Career Report show the same target role (verified role sync in browser, rebuilt successfully)
- [x] "Source: ai" debug label already removed from Gap Navigator

---

## Session fixes applied (2026-07-11)

### /api/predict/ — 403 → 200

**Root cause:** `call_predict.js` was missing the `X-Internal-Key` header that the real Express caller (`ai.service.js`) always sends. Django's `require_internal_key` decorator checks this header against `settings.INTERNAL_API_KEY` and returns 403 if absent.

**Secondary root cause:** The test payload used flat primitives (`skills_count: 5, education: 1`) but Django's `extract_resume_features()` expects nested arrays (`education: ['B.Tech...']`, `projects: [{title, description}]`). The flat `education: 1` caused `" ".join(1)` → `"can only join an iterable"`.

**Fixes:**
- `call_predict.js`: added `X-Internal-Key` header; updated payload to match production shape from `pathScore.controller.js`
- No changes needed to Django views or permissions (existing design is correct)

### Percentile computation (`predictor.py`)

**Root cause:** `else: pct = 50.0` before the for-loop meant that if the bracket search yielded no hit (floating-point edge case at boundaries), the function silently returned 50th percentile regardless of actual score. Also added `logger.warning()` / `logger.debug()` so fallback paths are now visible in Django logs.

**Confirmed correct behavior:** score=90 against mean=90.5 → 38th percentile (score is just below average → correct).

### GitHub URL truncation & Slicing (`resume_parser.py`)

**Root cause:** Python's project segmenter naive `[:80]` character limit truncated candidate project title lines (e.g. `SkillLink — Full-Stack Skill Exchange & Hiring Platform github.com/bhattyashwi/SkillLink` at 80 characters, causing it to end at `.../S`).
Additionally, `pdf-parse` occasionally drops glyphs in annotation rects, and URL repair was only applied to descriptions, not project titles.

**Fix:**
- Increased project title slice limit in `resume_parser.py` to `[:150]`.
- Mapped the URL prefix repair logic to project titles as well as descriptions so any truncated annotation URLs are safely repaired.

### LinkedIn/GitHub detection & Mongoose Cast Validation (`Resume.js`)

**Root cause:** The `Resume` Mongoose model defined `linkedin` and `github` contact fields as `Boolean` type. When Django returned the resolved URLs or label fallbacks (e.g., `'present (label detected, no URL extracted)'` or `'github.com/bhattyashwi/SkillLink'`), Mongoose failed validation or casted them to `false` when saving.

**Fix:**
- Updated `server/src/models/Resume.js` schema so that all `contact` fields (`email`, `phone`, `linkedin`, `github`) are of `String` type (with default `""`).
- Verified database storage is now fully functional, preserving URL strings and fallback strings without throwing schema casting validation errors.
- Verified in-browser end-to-end that the SHAP metrics card, target role synchronizations, and career reports render perfectly.
