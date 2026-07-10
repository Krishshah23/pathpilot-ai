"""
Resume parsing & health analysis.

Given the raw text of a resume, this extracts structured information (skills,
education, projects, experience, certifications, contact details) and computes
an EXPLAINABLE resume-health score with a per-factor breakdown and actionable
suggestions.

This is a deterministic, rule-based implementation (regex + curated
dictionaries + section detection). It is intentionally transparent so the score
can always be explained to the student. ML enhancements can layer on later
without changing this contract.
"""

import re

from ml.data.skills import SKILL_ALIASES

# ── Section headers we recognize (normalized, lowercase) ──────────────
SECTION_HEADERS = {
    'summary': ['summary', 'objective', 'about', 'profile'],
    'skills': ['skills', 'technical skills', 'technologies', 'tech stack'],
    'education': ['education', 'academic', 'qualification', 'qualifications'],
    'experience': ['experience', 'work experience', 'employment', 'internship', 'internships'],
    'projects': ['projects', 'personal projects', 'academic projects'],
    'certifications': ['certifications', 'certificates', 'courses', 'certification'],
    'achievements': ['achievements', 'awards', 'honors', 'accomplishments'],
}

EMAIL_RE = re.compile(r'[\w.+-]+@[\w-]+\.[\w.-]+')
PHONE_RE = re.compile(r'(?:\+?\d[\s-]?){10,13}')
LINKEDIN_RE = re.compile(r'linkedin\.com/[\w/-]+', re.I)
GITHUB_RE = re.compile(r'github\.com/[\w/-]+', re.I)

DEGREE_KEYWORDS = [
    'b.tech', 'btech', 'b.e', 'bachelor', 'b.sc', 'bsc', 'bca', 'b.com',
    'm.tech', 'mtech', 'master', 'm.sc', 'msc', 'mca', 'mba', 'ph.d', 'phd',
    'diploma', 'high school', 'secondary', 'intermediate', 'class 12', 'class 10',
]

ACTION_VERBS = [
    'developed', 'built', 'designed', 'implemented', 'created', 'led', 'managed',
    'improved', 'optimized', 'automated', 'launched', 'deployed', 'engineered',
    'architected', 'delivered', 'reduced', 'increased', 'analyzed', 'integrated',
]


def _find_skills(text):
    """Return canonical skills whose name or any alias appears in the text."""
    lowered = text.lower()
    found = []
    for canonical, aliases in SKILL_ALIASES.items():
        patterns = [re.escape(canonical.lower())] + [
            a if a.startswith('\\b') or '\\' in a else re.escape(a) for a in aliases
        ]
        for pat in patterns:
            # Word-boundary match. The '.' in the look-behind stops aliases like
            # 'js' from matching inside 'node.js' (which is Node, not JavaScript).
            if re.search(rf'(?<![a-z0-9.]){pat}(?![a-z0-9+#.])', lowered):
                found.append(canonical)
                break
    return sorted(set(found))


def _split_sections(text):
    """
    Split resume text into sections keyed by our normalized section names.
    A line is treated as a header if, stripped, it matches a known header
    (optionally followed by a colon) and is short.
    """
    lines = text.split('\n')
    sections = {}
    current = 'header'  # text before the first recognized section
    sections[current] = []

    # Build lookup: header phrase -> normalized key
    phrase_to_key = {}
    for key, phrases in SECTION_HEADERS.items():
        for p in phrases:
            phrase_to_key[p] = key

    for raw in lines:
        line = raw.strip()
        norm = re.sub(r'[^a-z ]', '', line.lower()).strip()
        if line and len(line) <= 40 and norm in phrase_to_key:
            current = phrase_to_key[norm]
            sections.setdefault(current, [])
        else:
            sections.setdefault(current, []).append(raw)

    return {k: '\n'.join(v).strip() for k, v in sections.items()}


def _bullet_items(section_text, limit=8):
    """Extract discrete items (bullets or non-empty lines) from a section."""
    if not section_text:
        return []
    items = []
    for raw in section_text.split('\n'):
        line = re.sub(r'^[\s•\-\*•●\d.)]+', '', raw).strip()
        if len(line) >= 4:
            items.append(line)
    return items[:limit]


def _extract_education(sections):
    text = sections.get('education', '')
    items = []
    for line in _bullet_items(text, limit=6):
        if any(k in line.lower() for k in DEGREE_KEYWORDS) or re.search(r'\b(19|20)\d{2}\b', line):
            items.append(line)
    # Fallback: keep first couple of lines if nothing matched but a section exists
    if not items and text:
        items = _bullet_items(text, limit=3)
    return items


def _extract_projects(sections):
    # More robust segmentation: detect a title line followed by a tech-stack
    # line (contains separators like '·' or '|') and then bullets. This avoids
    # splitting wrapped description lines into separate project entries.
    raw = sections.get('projects', '') or ''
    # Tokenize non-empty lines first
    raw_lines = [l.rstrip() for l in raw.split('\n') if l.strip()]

    # Merge wrapped lines conservatively: when a line does not end with a
    # sentence terminator and the next line starts lowercase (likely a
    # continuation), stitch them together. This reduces fragmented project
    # entries caused by PDF line-wrapping.
    merged_lines = []
    i = 0
    SENT_END_RE = re.compile(r'[\.|:|;|!|\?|—|–]$')
    while i < len(raw_lines):
        cur = raw_lines[i].strip()
        # Lookahead merge loop
        while i + 1 < len(raw_lines):
            nxt = raw_lines[i + 1].lstrip()
            # Do not merge if next line starts like a bullet or a numbered list
            if re.match(r'^[\-\*•\d\.)]', nxt):
                break
            # Do not merge if next line looks like a tech-stack separator (e.g. contains '·' or '|')
            if re.search(r'[·|,]', nxt) and len(nxt.split()) <= 8:
                break
            # Merge when current line does not end with sentence terminator
            # and next line starts with a lowercase letter (wrapped continuation)
            if not SENT_END_RE.search(cur) and nxt and nxt[0].islower():
                cur = cur + ' ' + nxt
                i += 1
                continue
            break
        merged_lines.append(cur)
        i += 1

    raw_lines = merged_lines
    if not raw_lines:
        return []

    BULLET_RE = re.compile(r'^[•\-\*]\s+')
    TECH_STACK_RE = re.compile(r'.+[·|,].+')

    projects = []
    current = None
    i = 0
    while i < len(raw_lines):
        line = raw_lines[i].strip()
        next_line = raw_lines[i + 1].strip() if i + 1 < len(raw_lines) else ''

        is_title_candidate = (
            not BULLET_RE.match(line)
            and not TECH_STACK_RE.match(line)
            and TECH_STACK_RE.match(next_line)
        )

        if is_title_candidate:
            if current:
                projects.append(current)
            current = {'title': line[:80], 'tech_stack': next_line, 'bullets': []}
            i += 2
            continue

        if BULLET_RE.match(line) and current:
            current['bullets'].append(BULLET_RE.sub('', line))
        elif current and current['bullets']:
            # continuation of previous bullet (wrapped line already merged earlier)
            current['bullets'][-1] += ' ' + line
        else:
            # Fallback: treat an isolated non-bullet as a short description/title
            if current is None:
                current = {'title': line[:80], 'tech_stack': '', 'bullets': []}
            else:
                # attach to last bullet or as a loose description
                if current['bullets']:
                    current['bullets'][-1] += ' ' + line
                else:
                    # keep as a short description in bullets
                    current['bullets'].append(line)
        i += 1

    if current:
        projects.append(current)

    # Normalize into the previous simple shape: title + description
    items = []
    for p in projects[:8]:
        desc = ''
        if p.get('tech_stack'):
            desc = p['tech_stack']
        if p.get('bullets'):
            if desc:
                desc += ' — ' + ' '.join(p['bullets'])
            else:
                desc = ' '.join(p['bullets'])
        items.append({'title': p.get('title', '')[:80], 'description': desc[:400]})
    return items


def _extract_experience(sections):
    return _bullet_items(sections.get('experience', ''), limit=8)


def _extract_certifications(sections):
    text = sections.get('certifications', '')
    items = _bullet_items(text, limit=8)
    if not items:
        # Also scan whole doc for lines mentioning certification
        pass
    return items


def _contact(text, links=None):
    links = links or []
    combined = text + '\n' + '\n'.join(links)
    return {
        'email': bool(EMAIL_RE.search(text)),
        'phone': bool(PHONE_RE.search(text)),
        'linkedin': bool(LINKEDIN_RE.search(text) or any('linkedin.com' in (l or '').lower() for l in links)),
        'github': bool(GITHUB_RE.search(text) or any('github.com' in (l or '').lower() for l in links)),
    }


def _score_health(text, skills, education, projects, experience, certs, contact):
    """
    Explainable health score. Each factor contributes points up to a max; the
    breakdown lists what was earned and a tip when points were missed.
    """
    word_count = len(text.split())
    action_verb_hits = sum(1 for v in ACTION_VERBS if v in text.lower())

    factors = []

    def add(label, earned, maximum, tip=''):
        factors.append(
            {
                'label': label,
                'score': round(earned),
                'max': maximum,
                'status': 'good' if earned >= maximum * 0.75 else ('warn' if earned > 0 else 'bad'),
                'tip': '' if earned >= maximum * 0.75 else tip,
            }
        )

    # Contact info (email + phone + at least one professional link)
    contact_pts = (5 if contact['email'] else 0) + (5 if contact['phone'] else 0) + (
        5 if (contact['linkedin'] or contact['github']) else 0
    )
    add('Contact & links', contact_pts, 15,
        'Add your email, phone, and a LinkedIn/GitHub link.')

    # Skills breadth
    skill_pts = min(len(skills), 12) / 12 * 20
    add('Skills coverage', skill_pts, 20,
        'List more relevant technical skills (aim for 8+).')

    # Education present
    add('Education', 15 if education else 0, 15,
        'Add an Education section with your degree and year.')

    # Experience / internships
    add('Experience', 15 if experience else 0, 15,
        'Include internships or work experience, even if brief.')

    # Projects
    proj_pts = min(len(projects), 3) / 3 * 15
    add('Projects', proj_pts, 15,
        'Showcase 2–3 projects with a short impact-focused description.')

    # Certifications
    add('Certifications', 5 if certs else 0, 5,
        'Add relevant certifications or online courses.')

    # Action verbs / impact language
    verb_pts = min(action_verb_hits, 6) / 6 * 10
    add('Impact language', verb_pts, 10,
        'Start bullet points with action verbs (built, led, improved…).')

    # Length / density
    if 250 <= word_count <= 900:
        len_pts = 5
    elif word_count < 250:
        len_pts = word_count / 250 * 5
    else:
        len_pts = 3  # too long
    add('Length & density', len_pts, 5,
        'Keep it concise (roughly 350–800 words for a student resume).')

    total = round(sum(f['score'] for f in factors))
    return total, factors, word_count


def _suggestions(factors, skills, contact):
    """Actionable suggestions derived from missed factors + general best practices."""
    tips = [f['tip'] for f in factors if f['tip']]
    if len(skills) < 5:
        tips.append('Your skill list looks thin — add tools/frameworks you have used in projects.')
    if not contact['github']:
        tips.append('Add a GitHub link so recruiters can see your code.')
    # De-duplicate, keep order
    seen, out = set(), []
    for t in tips:
        if t not in seen:
            seen.add(t)
            out.append(t)
    return out[:6]


def parse_resume(text, links=None):
    """Main entry point. Returns the full structured analysis payload."""
    text = text or ''
    clean = text.strip()

    # Guard: too little extractable text (e.g. scanned/image PDF)
    if len(clean.split()) < 30:
        return {
            'lowText': True,
            'message': 'We could not read enough text from this resume. '
                       'Please upload a text-based PDF (not a scanned image).',
            'skills': [],
            'education': [],
            'projects': [],
            'experience': [],
            'certifications': [],
            'contact': _contact(clean, links),
            'health': {'score': 0, 'breakdown': []},
            'suggestions': ['Upload a text-based PDF or DOCX so we can analyze it.'],
            'wordCount': len(clean.split()),
        }

    sections = _split_sections(clean)
    skills = _find_skills(clean)
    education = _extract_education(sections)
    projects = _extract_projects(sections)
    experience = _extract_experience(sections)
    certifications = _extract_certifications(sections)
    contact = _contact(clean, links)

    score, breakdown, word_count = _score_health(
        clean, skills, education, projects, experience, certifications, contact
    )
    suggestions = _suggestions(breakdown, skills, contact)

    return {
        'lowText': False,
        'skills': skills,
        'education': education,
        'projects': projects,
        'experience': experience,
        'certifications': certifications,
        'contact': contact,
        'health': {'score': score, 'breakdown': breakdown},
        'suggestions': suggestions,
        'wordCount': word_count,
    }
