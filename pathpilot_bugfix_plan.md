# PathPilot AI — Bug Fix Implementation Plan

**How to use this doc:** Paste this whole file into your code editor's AI chat (Claude Code, Cursor, etc.) or work through it manually. Fix tickets in order — Bug 1 and Bug 3 are quick wins, Bug 2 is the most visually embarrassing, Bug 4 and Bug 5 are the ones that actually make the "AI" feel real. After each ticket, re-run the acceptance test at the bottom of that ticket using `Yashwi_Bhatt_Resume.pdf` (or whichever resume you're using as your demo/test fixture) before moving to the next one.

**Architecture context (for the coding agent):** Node.js + Express API (port 5000) handles auth/CRUD/MongoDB. Django ML service (port 8000) handles resume parsing, feature extraction, and the trained models + SHAP explainer. React frontend (port 5173) renders Command Center, Resume Intelligence, Path Score, Gap Navigator, Growth Path. Bugs 1–3 live in the Django resume-parsing pipeline. Bug 4 spans Path Score's roadmap logic and Gap Navigator/Growth Path's skill-gap logic (need to check both Node and Django depending on where each currently lives). Bug 5 lives in whatever script generates your synthetic training dataset for the 7 ML models.

---

## Priority order

| # | Bug | Effort | Impact |
|---|-----|--------|--------|
| 1 | Link detection misses embedded PDF hyperlinks | Low | High — fixes 3 downstream wrong outputs at once |
| 3 | Quantifiable-metrics scan ignores `projects` array | Low | Medium |
| 2 | Project parser fragments one project into many | Medium | High — most visually broken thing in the demo |
| 4 | Path Score roadmap vs Gap Navigator disagree | Medium | High — kills trust instantly in a live demo |
| 5 | Synthetic training data produces sign-flipped SHAP drivers | High | High — root cause of "feels fake" |
| 6 | Rounding/percentile polish | Low | Low |

---

## TICKET 1 — Contact link detection fails on embedded PDF hyperlinks

**Symptom:** Resume header contains `LinkedIn | GitHub | LeetCode | Portfolio site` as live hyperlinks, but Resume Intelligence flags "Missing LinkedIn Link" (WARNING) and the roadmap recommends "Create a LinkedIn profile."

**Root cause hypothesis:** The extractor is likely pulling plain text only (e.g. `PyPDF2`/`pdfminer` text mode) and regex-matching for visible URL strings like `linkedin.com/in/...`. When the resume uses anchor text ("LinkedIn") with the actual URL stored as a PDF link annotation, there's no visible URL substring to match against — so the field never gets populated even though the link exists.

**Fix approach:** Extract link annotations directly from the PDF, not just visible text. `PyMuPDF` (`fitz`) exposes these cleanly.

```python
import fitz  # PyMuPDF

def extract_hyperlinks(file_path: str) -> list[str]:
    """Returns every URI embedded as a link annotation anywhere in the PDF,
    regardless of what the visible anchor text says."""
    doc = fitz.open(file_path)
    uris = []
    for page in doc:
        for link in page.get_links():
            uri = link.get("uri")
            if uri:
                uris.append(uri)
    doc.close()
    return uris

def classify_contact_links(uris: list[str], plain_text: str) -> dict:
    """Combine embedded link annotations with any plain-text URL fallback."""
    combined = uris + extract_plain_text_urls(plain_text)  # keep your existing regex as a fallback
    result = {"linkedin": None, "github": None, "portfolio": None, "other": []}
    for url in combined:
        low = url.lower()
        if "linkedin.com" in low:
            result["linkedin"] = url
        elif "github.com" in low:
            result["github"] = url
        elif "leetcode.com" in low:
            result["other"].append(url)
        else:
            result["portfolio"] = result["portfolio"] or url
    return result
```

**Where to look:** Whatever function currently populates `contactLinks` / feeds the "Contact & links" health factor in the Django resume-parsing service. Replace or supplement its input source with `extract_hyperlinks()`.

**Acceptance test:** Re-upload the demo resume. "Contact & links" health factor should read close to 15/15 (or explain what's still genuinely missing — e.g. phone number). The "Missing LinkedIn Link" red flag should disappear. The roadmap should no longer suggest creating a LinkedIn.

---

## TICKET 3 — Quantifiable-metrics detector ignores the `projects` array

**Symptom:** Red flag says "Only 0% of your experience/project descriptions contain numbers or percentages," despite bullets like *"Architected a 2,470-line modular Java application"* and *"60+ LeetCode problems solved."*

**Root cause hypothesis:** The number/percentage scan is likely only iterating over `workExperience` entries (which are legitimately empty for this resume) and never touching `projects[].description` or `projects[].bullets`.

**Fix approach:**

```python
import re

NUMBER_PATTERN = re.compile(r'\d+%|\d+\+|\d[\d,]*\.?\d*\s*(?:line|LOC|users|contributions|problems)?', re.IGNORECASE)

def get_all_bullet_texts(resume_data: dict) -> list[str]:
    texts = []
    for exp in resume_data.get("workExperience", []):
        if exp.get("description"):
            texts.append(exp["description"])
    for proj in resume_data.get("projects", []):
        if proj.get("description"):
            texts.append(proj["description"])
        for bullet in proj.get("bullets", []):
            texts.append(bullet)
    return texts

def calculate_quantifiable_metrics_pct(resume_data: dict) -> int:
    bullets = get_all_bullet_texts(resume_data)
    if not bullets:
        return 0
    matched = sum(1 for b in bullets if NUMBER_PATTERN.search(b))
    return round((matched / len(bullets)) * 100)
```

**Where to look:** The function feeding the "Recruiter Red Flags" section, specifically the "Lack of Quantifiable Metrics" check.

**Acceptance test:** Red flag should report a nonzero, realistic percentage, or disappear entirely if the ratio clears your threshold.

---

## TICKET 2 — Project parser fragments one project into multiple fake "projects"

**Symptom:** Resume Intelligence shows "Projects: 8" and "Path Score: 8 projects detected," but there are only 3 real projects (SkillLink, Reflecto, Library Management System). Screenshots show broken fragments as standalone cards: *"SkillLink — Full"*, *"Based Access Control"*, *"Built a multi"* — these are all pieces of the same SkillLink entry, split apart at line wraps.

**Root cause hypothesis:** The parser is almost certainly splitting on raw newlines/paragraph breaks from the PDF text extraction rather than detecting actual project boundaries (title line → tech-stack line → bullet points).

**Fix approach:** Use structural cues instead of naive line-splitting. Two options, in order of reliability:

**Option A (more robust): use font metadata to detect titles.** `pdfplumber` exposes per-character font info, and project titles are typically bold/larger than body bullets.

```python
import pdfplumber

def extract_lines_with_style(pdf_path: str) -> list[dict]:
    lines = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for line_group in page.extract_text_lines():
                chars = [c for c in page.chars if c["top"] == line_group.get("top")]
                is_bold = any("Bold" in c.get("fontname", "") for c in chars) if chars else False
                lines.append({"text": line_group["text"].strip(), "bold": is_bold})
    return lines
```

**Option B (fallback if font metadata is unreliable in your PDFs): pattern-based grouping.** A project title line is one that is NOT a bullet and is immediately followed by a "tech stack" line (contains 2+ `·` or `|` separators), followed by one or more bullet lines (start with `•` or `-`). Keep absorbing bullets until you hit the next title-like line.

```python
import re

BULLET_RE = re.compile(r'^[•\-]\s+')
TECH_STACK_RE = re.compile(r'(.+[·|].+){2,}')  # 2+ separator chars = likely a tech-stack line

def segment_projects(raw_lines: list[str]) -> list[dict]:
    projects = []
    current = None
    i = 0
    while i < len(raw_lines):
        line = raw_lines[i].strip()
        if not line:
            i += 1
            continue
        next_line = raw_lines[i + 1].strip() if i + 1 < len(raw_lines) else ""
        is_title_candidate = (
            not BULLET_RE.match(line)
            and not TECH_STACK_RE.match(line)
            and TECH_STACK_RE.match(next_line)  # title is followed by a tech-stack line
        )
        if is_title_candidate:
            if current:
                projects.append(current)
            current = {"title": line, "tech_stack": next_line, "bullets": []}
            i += 2
            continue
        if BULLET_RE.match(line) and current:
            current["bullets"].append(BULLET_RE.sub("", line))
        elif current and current["bullets"]:
            # continuation of the previous bullet line (wrapped text, no bullet char)
            current["bullets"][-1] += " " + line
        i += 1
    if current:
        projects.append(current)
    return projects
```

Adapt whichever option fits what your current extraction library already gives you access to (font data vs. plain text only).

**Where to look:** The project-segmentation function in the Django resume parser — likely wherever `projects[]` gets populated before being saved to the `Resume` model.

**Acceptance test:** Re-upload the demo resume. Projects detected should be exactly **3**: SkillLink, Reflecto, Library Management System — each with clean, complete descriptions, no orphan fragments like "Based Access Control" as their own card.

---

## TICKET 4 — Path Score roadmap and Gap Navigator disagree on what to learn next

**Symptom:** Same user, same dream role (Full Stack Developer). Path Score's "AI-Driven Career Improvement Roadmap" says *"Focus on learning: Flask, NLP, Data Analysis."* Gap Navigator / Growth Path says the actual gap is *"SQL + Docker, 24 hrs."* These are contradictory outputs from what should be one underlying skill-gap engine.

**Root cause hypothesis:** These are almost certainly two independently-implemented recommendation code paths — one simple/generic (maybe a static heuristic or a separate lightweight call) feeding Path Score's roadmap card, and one that's properly wired to live market data + skill matching feeding Gap Navigator/Growth Path. They were built at different times and never unified.

**Fix approach — make it architecturally impossible for them to disagree:**

1. Find both places recommendations get generated:
   - Path Score's "AI-Driven Career Improvement Roadmap" section
   - Gap Navigator's "Missing skills" + Growth Path's roadmap generator
2. Identify which one is actually correct/more sophisticated (Gap Navigator's — it uses live market data per Image 10/11).
3. Delete or deprecate the independent logic behind Path Score's roadmap card.
4. Have Path Score's roadmap card call the **same** service/function Gap Navigator uses, e.g.:

```python
# single source of truth, e.g. in a shared service module
def get_skill_gap_recommendations(user_profile: dict, target_role: str) -> dict:
    """The ONLY function that should ever generate skill-gap recommendations.
    Called by both Path Score and Gap Navigator/Growth Path."""
    matched, missing = compare_skills_to_role(user_profile["skills"], target_role)
    missing_with_demand = attach_market_demand(missing)  # live market data
    return {
        "matched": matched,
        "missing": missing_with_demand,
        "recommended_next": rank_by_demand_and_effort(missing_with_demand),
    }
```

Both the Path Score page and Gap Navigator page render from this one call — no separate roadmap-generation logic anywhere else.

**Acceptance test:** Load Path Score and Gap Navigator back to back for the same user/role. The "what to learn next" recommendation must be identical on both pages. Write a quick integration test that asserts this programmatically so it can't silently regress.

---

## TICKET 5 — Synthetic training data produces sign-flipped SHAP drivers (root cause of "feels fake")

**Symptom:** SHAP explanation shows CGPA (9.42/10), Notable Achievements, and Resume Action Verbs as **negative** score drivers — despite these being genuinely strong, positive attributes on this resume. Meanwhile "Impact language" scored 8/10 (good) on the Resume Intelligence page but "Resume Action Verbs" is a negative SHAP driver on the Path Score page — same underlying property, contradictory verdicts.

**Root cause hypothesis:** The synthetic dataset used to train the 7 ML models was likely generated with randomized labels that don't encode real-world monotonic relationships (e.g., "higher CGPA should never, on average, correlate with a lower predicted outcome"). With enough noise and no enforced direction, the model can learn spurious/inverted correlations purely from sampling artifacts.

**Fix approach:** Rebuild the synthetic data generator so labels are constructed from a formula with correctly-signed weights, not fully random targets.

```python
import numpy as np

# Explicitly document expected direction for every feature — this becomes your spec AND your test.
FEATURE_DIRECTIONS = {
    "cgpa": "positive",
    "certifications_count": "positive",
    "achievements_count": "positive",
    "action_verb_density": "positive",
    "projects_count": "positive",
    "work_experience_months": "positive",
}

def generate_synthetic_resume_dataset(n: int = 50_000, seed: int = 42) -> list[dict]:
    rng = np.random.default_rng(seed)
    rows = []
    for _ in range(n):
        cgpa = rng.uniform(5.0, 10.0)
        certifications_count = rng.integers(0, 10)
        achievements_count = rng.integers(0, 5)
        action_verb_density = rng.uniform(0, 1)
        projects_count = rng.integers(0, 10)
        work_experience_months = rng.integers(0, 36)

        # Weights are all positive by construction -> guarantees correct SHAP sign
        # after training, assuming the model fits this signal reasonably well.
        target_score = (
            cgpa * 3.5
            + certifications_count * 2.0
            + achievements_count * 2.5
            + action_verb_density * 15
            + projects_count * 4.0
            + work_experience_months * 0.8
            + rng.normal(0, 4)  # noise kept small relative to signal
        )

        rows.append({
            "cgpa": cgpa,
            "certifications_count": certifications_count,
            "achievements_count": achievements_count,
            "action_verb_density": action_verb_density,
            "projects_count": projects_count,
            "work_experience_months": work_experience_months,
            "target_score": target_score,
        })
    return rows
```

**Add a regression test that fails CI if a sign flips again** — this is what actually protects you going forward:

```python
def test_shap_feature_directions(shap_values: dict[str, float]):
    """Run this after every retrain. If it fails, don't ship the new model."""
    for feature, expected_direction in FEATURE_DIRECTIONS.items():
        value = shap_values.get(feature)
        if value is None:
            continue
        if expected_direction == "positive":
            assert value >= -0.5, (
                f"{feature} expected to be a positive-or-neutral driver, "
                f"got {value}. Check synthetic data generation."
            )
```

**Where to look:** Whatever script generates the training data for your 7 models (probably a `generate_synthetic_data.py` or similar in the Django ML service). Retrain all 7 models after regenerating the dataset.

**Acceptance test:** Re-run SHAP on the demo resume. CGPA, Certifications, Achievements, and Action Verbs should all show as positive or neutral drivers, never negative. Confirm "Resume Action Verbs" (Path Score) and "Impact language" (Resume Intelligence) no longer contradict each other — consider having them read from the same underlying computed value if they're meant to represent the same thing.

**Secondary check while you're in here:** ATS Pass 97% / Interview Success 90% / ₹15.28 LPA for a semester-4 student with zero formal work experience will read as overconfident to anyone familiar with the Indian job market. Once the sign-flip issue is fixed, sanity-check these outputs against realistic ranges for students with similar profiles — a well-calibrated 60-70% reads as more credible than an inflated 90%+.

---

## TICKET 6 — Polish (do last, low effort)

- **Rounding inconsistency:** Path Score shows `96.6` in some places (Command Center, Insights) and `97` in others (Path Score page itself). Pick one rounding rule (e.g., always 1 decimal, computed server-side once) and use it everywhere — don't let the frontend recompute/round independently in different components.
- **Percentile sanity check:** Image 6 shows the user at the 39th percentile while scoring *above* the stated peer average (97 vs 93.5 average) — mathematically that combination is possible but unusual enough to warrant a trace. Add a log statement where the percentile is computed and confirm it's comparing against the same score field that's displayed to the user, not a different internal metric.

---

## Full regression checklist (run after all tickets are done)

Re-upload the demo resume and confirm:

- [ ] Contact & links health factor reflects LinkedIn/GitHub/Portfolio as detected (no false "missing" flag)
- [ ] Roadmap no longer suggests creating a LinkedIn profile
- [ ] Quantifiable metrics % is nonzero and reflects real numbers in the bullets
- [ ] Exactly 3 projects detected, each with a clean, non-fragmented description
- [ ] Path Score's roadmap and Gap Navigator's missing-skills list match exactly
- [ ] CGPA, Certifications, Achievements, Action Verbs all show as positive/neutral SHAP drivers
- [ ] "Impact language" and "Resume Action Verbs" agree with each other
- [ ] Path Score displays the same number, same rounding, on Command Center / Path Score / Career Report
