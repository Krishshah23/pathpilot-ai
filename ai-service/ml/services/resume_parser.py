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
PHONE_RE = re.compile(r'(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}|(?:\+?\d[\s-]?){10,14}')
LINKEDIN_RE = re.compile(r'linkedin\.com/[\w/-]+', re.I)
GITHUB_RE = re.compile(r'github\.com/[\w/-]+', re.I)

# Matches a truncated URL fragment at the END of a text run — e.g.
# "github.com/bhattyashwi/S" where "S" is only the first char of the repo name.
# We look for github.com or linkedin.com paths whose last path segment is 1-3 chars
# (suspiciously short) OR whose last non-slash character is a single uppercase letter.
PARTIAL_URL_RE = re.compile(
    r'https?://(?:www\.)?(?P<rest>(?:github|linkedin)\.com/[\w./-]+?)(?:/$|(?<=/)[A-Z]\b|/[\w]{1,2}$)',
    re.I
)
# Also match bare domain form (without scheme)
PARTIAL_URL_BARE_RE = re.compile(
    r'(?P<rest>(?:github|linkedin)\.com/[\w./-]+?)(?:/$|(?<=/)[A-Z]\b|/[\w]{1,2}$)',
    re.I
)

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


def _detect_section_header(line):
    """
    Detects if a line is a section header, returning the normalized key or None.
    A line is a candidate if it is short (<= 40 chars), doesn't start with a bullet,
    and matches one of our defined section header phrases exactly.
    """
    cleaned = line.strip()
    if not cleaned or len(cleaned) > 40:
        return None

    # Bullets or list items are never section headers
    if re.match(r'^[\-\*•●■▪◦□◇◆✓✔]|^\d+[\.\)]\s+', cleaned):
        return None

    # Normalize: strip out non-alphanumeric chars and collapse whitespace
    norm = re.sub(r'[^a-z0-9 ]', '', cleaned.lower()).strip()
    norm = re.sub(r'\s+', ' ', norm)
    if not norm:
        return None

    SECTION_MAP = {
        'summary': {
            'summary', 'objective', 'about', 'about me', 'profile', 
            'professional summary', 'career objective', 'summary of qualifications',
            'executive summary', 'career profile', 'professional profile'
        },
        'skills': {
            'skills', 'technical skills', 'technologies', 'tech stack', 
            'skills abilities', 'skills and tools', 'core competencies', 
            'key skills', 'expertise', 'tools', 'areas of expertise',
            'technical expertise', 'technical skills and tools'
        },
        'education': {
            'education', 'academic', 'academics', 'academic profile', 
            'qualification', 'qualifications', 'academic background', 
            'education history', 'educational qualification', 'educational qualifications'
        },
        'experience': {
            'experience', 'work experience', 'employment', 'internship', 
            'internships', 'employment history', 'work history', 
            'professional experience', 'professional history', 'relevant experience',
            'work experience history', 'career history', 'professional background'
        },
        'projects': {
            'projects', 'personal projects', 'academic projects', 
            'key projects', 'selected projects', 'technical projects', 
            'portfolio', 'recent projects', 'academic and personal projects',
            'featured projects', 'major projects'
        },
        'certifications': {
            'certifications', 'certificates', 'courses', 'certification', 
            'licenses certifications', 'licenses and certifications',
            'certifications and courses', 'online courses'
        },
        'achievements': {
            'achievements', 'awards', 'honors', 'accomplishments', 
            'awards and achievements', 'extra curricular activities', 
            'extracurriculars', 'co curricular activities', 'achievements and awards'
        }
    }

    for key, val_set in SECTION_MAP.items():
        if norm in val_set:
            return key

    return None


def _looks_like_project_title(line, prev_line, idx, current_project):
    # 0. Can't have two project titles in a row without any content
    if current_project and not current_project['tech_stack'] and not current_project['bullets']:
        return False

    cleaned = line.strip()
    # 1. Bullets or numbered lists are never project titles
    if re.match(r'^[\-\*•●■▪◦□◇◆✓✔]|^\d+[\.\)]\s+', cleaned):
        return False

    lower_line = cleaned.lower()
    starts_with_verb = any(lower_line.startswith(v) for v in ACTION_VERBS)
    starts_with_continuation = any(lower_line.startswith(w) for w in [
        'showcased', 'presented', 'featured', 'won', 'awarded', 'using', 'utilized', 
        'technologies', 'tools', 'database', 'backend', 'frontend', 'under', 'by', 'at'
    ])
    if starts_with_verb or starts_with_continuation:
        return False

    # 2. First line of the section is always a title
    if idx == 0:
        return True

    # Check if the line has title-like content
    has_separator = any(sep in cleaned for sep in ['|', '·', ' - ', ' – ', '—', ':', 'github.com', 'gitlab.com'])
    has_date = bool(re.search(r'\b(19|20)\d{2}\b|present|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec', lower_line))
    starts_with_proj = any(lower_line.startswith(p) for p in ['project ', 'project:', 'personal project', 'academic project', 'github:', 'github link:'])
    starts_with_num = bool(re.match(r'^\[?\d+\]?[\.\-:\s]', cleaned))
    
    is_short_title = len(cleaned) < 55 and cleaned and cleaned[0].isupper() and not cleaned.endswith('.')

    has_title_indicators = has_separator or has_date or starts_with_proj or starts_with_num or is_short_title

    # 3. If previous line was a bullet or a list item, and current line has title indicators
    if prev_line and re.match(r'^[\-\*•●■▪◦□◇◆✓✔]|^\d+[\.\)]\s+', prev_line.strip()):
        if has_title_indicators:
            return True
        return False

    # 4. Fallback matches based on explicit indicators
    if starts_with_proj or starts_with_num:
        return True

    # 5. Short capitalized line after a long description line or an action verb
    if is_short_title:
        if prev_line:
            prev_lower = prev_line.lower()
            prev_starts_with_verb = any(prev_lower.startswith(v) for v in ACTION_VERBS)
            if prev_starts_with_verb or len(prev_line.strip()) > 80:
                return True

    # 6. Separator/date matches
    if len(cleaned) < 100:
        if has_date or has_separator:
            return True

    return False


def _split_sections(text):
    """
    Split resume text into sections keyed by our normalized section names.
    A line is treated as a header if it is recognized by _detect_section_header.
    """
    lines = text.split('\n')
    sections = {}
    current = 'header'  # text before the first recognized section
    sections[current] = []

    for raw in lines:
        line = raw.strip()
        detected = _detect_section_header(line)
        if detected:
            current = detected
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


def _extract_projects(sections, links=None):
    # More robust segmentation using title-detection heuristic.
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
            if re.match(r'^[\-\*•●■▪◦□◇◆✓✔]|^\d+[\.\)]\s+', nxt):
                break
            # Do not merge if next line looks like a tech-stack separator (e.g. contains '·' or '|')
            if re.search(r'[·|]', nxt) and len(nxt.split()) <= 8:
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

    projects = []
    current = None

    for idx, line in enumerate(raw_lines):
        prev_line = raw_lines[idx - 1] if idx > 0 else None

        if _looks_like_project_title(line, prev_line, idx, current):
            if current:
                projects.append(current)
            current = {'title': line[:150], 'tech_stack': '', 'bullets': []}
            continue

        if current is None:
            current = {'title': line[:150], 'tech_stack': '', 'bullets': []}
            continue

        is_bullet = bool(re.match(r'^[\-\*•●■▪◦□◇◆✓✔]|^\d+[\.\)]\s+', line))
        if is_bullet:
            clean_bullet = re.sub(r'^[\s\-\*•●■▪◦□◇◆✓✔\d.)]+', '', line).strip()
            if clean_bullet:
                current['bullets'].append(clean_bullet)
        else:
            # Check if this line looks like a tech stack or simple subtitle
            has_separator = any(sep in line for sep in ['|', '·', ',', ' - ', ' – '])
            starts_with_verb = any(line.lower().startswith(v) for v in ACTION_VERBS)
            is_tech_stack_like = (has_separator or len(line) < 50) and not starts_with_verb
            if not current['tech_stack'] and not current['bullets'] and is_tech_stack_like:
                current['tech_stack'] = line
            else:
                current['bullets'].append(line)

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
        items.append({'title': p.get('title', '')[:150], 'description': desc[:400]})

    # ── URL truncation repair ─────────────────────────────────────────────────
    # pdf-parse sometimes drops glyph groups inside hyperlink annotation rects,
    # leaving only a 1-3 char stub at the end of a URL. We match each partial URL
    # in description text against the annotation list and substitute full form.
    if links:
        # Build a set of full URLs for fast prefix lookups
        full_urls = [u for u in links if u and ('github.com' in u.lower() or 'linkedin.com' in u.lower())]
        PARTIAL_RE = re.compile(
            r'(https?://)?((github|linkedin)\.com/[\w./-]+?/[\w]{1,3})(?=[^\w/-]|$)',
            re.I
        )
        for item in items:
            def _replace_partial(m):
                fragment = m.group(2)
                scheme   = m.group(1) or 'https://'
                for full in full_urls:
                    # Normalize full URL to bare form for comparison
                    full_bare = re.sub(r'^https?://', '', full).rstrip('/')
                    fragment_norm = fragment.lower().rstrip('/')
                    full_norm = full_bare.lower()
                    # Check if full URL starts with fragment
                    if full_norm.startswith(fragment_norm) and len(full_bare) > len(fragment):
                        return scheme + full_bare
                return m.group(0)

            item['description'] = PARTIAL_RE.sub(_replace_partial, item['description'])
            item['title'] = PARTIAL_RE.sub(_replace_partial, item['title'])

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
    # Prefer explicit embedded URIs from the PDF extraction, then fall back
    # to regex matches in text, and finally to label-detection if nothing
    # else is present.
    linkedin_url = None
    github_url = None
    for l in links:
        if not l:
            continue
        low = l.lower()
        if 'linkedin.com' in low and linkedin_url is None:
            linkedin_url = l
        if 'github.com' in low and github_url is None:
            github_url = l

    if linkedin_url is None:
        m = LINKEDIN_RE.search(text)
        if m:
            linkedin_url = m.group(0)

    if github_url is None:
        m = GITHUB_RE.search(text)
        if m:
            github_url = m.group(0)

    # Label fallback: the words "LinkedIn" or "GitHub" appear but no URL
    if linkedin_url is None and re.search(r'\bLinkedIn\b', text, re.I):
        linkedin_url = 'present (label detected, no URL extracted)'
    if github_url is None and re.search(r'\bGitHub\b', text, re.I):
        github_url = 'present (label detected, no URL extracted)'

    email_match = EMAIL_RE.search(text)
    phone_match = PHONE_RE.search(text)

    return {
        'email': email_match.group(0) if email_match else None,
        'phone': phone_match.group(0) if phone_match else None,
        'linkedin': linkedin_url,
        'github': github_url,
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
    projects = _extract_projects(sections, links=links)  # pass annotation links for URL repair
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
