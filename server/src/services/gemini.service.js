/**
 * services/gemini.service.js — Google Gemini LLM Integration Layer
 *
 * ARCHITECTURAL ROLE & HYBRID AI PATTERN:
 * PathPilot AI uses a hybrid intelligence model:
 *   - Local rules & Django ML models handle scale, speed, feature vectors, and deterministic rules.
 *   - Google Gemini LLM handles qualitative, conversational, and context-rich AI coaching.
 *
 * GEMINI FEATURES IMPLEMENTED:
 * 1. `geminiChat()` — Context-aware career coach chat (injects resume + roadmap + profile context).
 * 2. `geminiAnalyzeResume()` — Role-fit intelligence comparing resume structure to target role.
 * 3. `geminiGenerateQuestion()` — Targeted mock interview question generation for a specific gap.
 * 4. `geminiEvaluateAnswer()` — Multi-dimensional rubric scoring of candidate interview answers.
 * 5. `geminiExplainScore()` — Pre-generated coaching narrative for the Path Score card.
 * 6. `geminiGenerateGapRoadmap()` — Custom week-by-week learning tasks for identified resume gaps.
 * 7. `geminiParseFallback()` — High-fidelity extraction parser for noisy or low-text PDF scans.
 *
 * AUTOMATIC MODEL FALLBACK & QUOTA PROTECTION:
 * - `safeGenerateContent()` catches 429 quota errors on `gemini-3.5-flash` and automatically retries
 *   using `gemini-3.1-flash-lite`.
 * - `geminiAnalyzeResume()` includes a local heuristic fallback (`getLocalResumeFallback()`)
 *   that guarantees onboarding completes cleanly even during total API outages.
 */

import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Initialize Gemini API client
const ai = new GoogleGenAI({ apiKey: env.gemini.apiKey });

// Default Gemini model specified in environment config
const MODEL = env.gemini.model; // default: gemini-3.5-flash

/**
 * Invokes Gemini content generation with automatic quota fallback (`gemini-3.1-flash-lite`).
 * @param {object} params - Model call options
 * @returns {Promise<object>} Gemini response object
 */
async function safeGenerateContent({ model, contents, config }) {
  try {
    return await ai.models.generateContent({ model, contents, config });
  } catch (err) {
    const msg = err?.message || String(err);
    const isQuota =
      msg.includes('429') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('quota') ||
      msg.includes('limit');

    if (isQuota && model !== 'gemini-1.5-flash') {
      // eslint-disable-next-line no-console
      console.warn(
        `[Gemini Fallback] Quota exceeded on model '${model}'. Retrying with 'gemini-1.5-flash'...`
      );
      try {
        return await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents,
          config,
        });
      } catch (fallbackErr) {
        // eslint-disable-next-line no-console
        console.error('[Gemini Fallback] Fallback model also failed:', fallbackErr.message);
        throw fallbackErr;
      }
    }
    throw err;
  }
}

/**
 * Translates Google SDK errors into clean Express ApiErrors.
 * Prevents raw Google API error keys from leaking to client responses.
 */
function geminiErrorHandler(err) {
  const msg = err?.message || String(err);

  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
    throw new ApiError(
      429,
      'AI quota limit reached. Please wait a minute and try again, or check your Gemini API plan at ai.google.dev/rate-limit.'
    );
  }
  if (msg.includes('403') || msg.includes('API_KEY_INVALID') || msg.includes('invalid')) {
    throw new ApiError(
      503,
      'Gemini API key is invalid or not enabled. Visit console.cloud.google.com to enable the Generative Language API.'
    );
  }
  if (msg.includes('404') || msg.includes('not found')) {
    throw new ApiError(
      503,
      `Model not available. Check that ${MODEL} is supported for your API key region.`
    );
  }
  throw new ApiError(503, `AI service error: ${msg.slice(0, 120)}`);
}

/**
 * Constructs a comprehensive system instruction string injecting the candidate's name,
 * target role, skills, resume health, red flags, and roadmap status.
 */
function buildUserContext(user, resume, roadmap = null) {
  const profile = user?.profile || {};
  const dreamRole = profile.dreamRole || 'Software Engineer';
  const skills = [...(profile.skills || []), ...(resume?.skills || [])]
    .filter((s) => s && s.toLowerCase() !== 'none')
    .map((s) => s.trim());
  const uniqueSkills = [...new Set(skills.map((s) => s.toLowerCase()))].map((s) =>
    skills.find((sk) => sk.toLowerCase() === s)
  );

  const resumeSection = resume
    ? `
RESUME ANALYSIS:
- File: ${resume.originalName}
- Health Score: ${resume.healthScore}/100
- Skills Found: ${(resume.skills || []).join(', ') || 'None detected'}
- Projects: ${(resume.projects || []).length} detected
- Experience: ${(resume.experience || []).length} entries
- Red Flags: ${(resume.redFlags || []).map((f) => f.label).join(', ') || 'None'}
- Key AI Gaps: ${(resume.keyGaps || []).join('; ') || 'Not yet analyzed'}
- Role Fit Score: ${resume.roleFitScore ?? 'Not yet analyzed'}/100`
    : `
RESUME: Not yet uploaded. Encourage them to upload on the Resume Strategy page first.`;

  const roadmapSection = roadmap
    ? `
ROADMAP STATUS:
- Target Role: ${roadmap.targetRole}
- Progress: ${roadmap.progress?.completedTasks || 0}/${roadmap.progress?.totalTasks || 0} tasks completed
- Current Week Focus: ${roadmap.weeks?.find((w) => !w.isCompleted)?.topic || 'All caught up'}`
    : `
ROADMAP: No active learning roadmap generated yet.`;

  return `You are PathPilot AI, a sharp and direct career coach.

USER PROFILE:
- Name: ${user.name}
- Target Role: ${dreamRole}
- Skills: ${uniqueSkills.length > 0 ? uniqueSkills.join(', ') : 'None added yet'}
${resumeSection}
${roadmapSection}

COACHING RULES:
1. Always reference their specific role (${dreamRole}) and current progress.
2. Never give generic advice — be role-specific and personal.
3. If they have no resume, always encourage uploading it first.
4. If they have a resume but no roadmap, encourage them to generate their roadmap.
5. Keep answers concise, actionable, and encouraging.
6. Use their name (${user.name.split(' ')[0]}) occasionally to feel personal.`;
}

/** Utility to generate plain text using system instructions and temperature 0.7. */
async function generateText(systemInstruction, userPrompt) {
  try {
    const response = await safeGenerateContent({
      model: MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });
    return response.text;
  } catch (err) {
    geminiErrorHandler(err);
  }
}

/** Utility to generate JSON objects with structured application/json MIME configuration. */
async function generateJson(prompt) {
  try {
    const response = await safeGenerateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    });

    let text = response.text.trim();
    const firstBrace = Math.min(
      text.indexOf('{') === -1 ? Infinity : text.indexOf('{'),
      text.indexOf('[') === -1 ? Infinity : text.indexOf('[')
    );
    const lastBrace = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));

    if (firstBrace !== Infinity && lastBrace !== -1 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(text);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    geminiErrorHandler(err);
  }
}

// ── Exported Gemini Service Methods ──────────────────────────────────────────

/**
 * Conducts context-aware career coaching chat.
 */
export async function geminiChat({ user, resume, roadmap, history = [], message }) {
  try {
    const systemInstruction = buildUserContext(user, resume, roadmap);
    const contents = [];

    for (const msg of history.slice(-8)) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await safeGenerateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });
    return response.text;
  } catch (err) {
    geminiErrorHandler(err);
  }
}

/**
 * Compares parsed resume structure against candidate target role requirements.
 * Falls back to local heuristic analysis if Gemini API is overloaded.
 */
export async function geminiAnalyzeResume({ resumeText, parsedData, targetRole, skills = [] }) {
  try {
    const prompt = `You are an expert career coach and recruiter specializing in ${targetRole} roles.

Analyze this resume for a candidate targeting: ${targetRole}

PARSED RESUME DATA:
- Skills found: ${(parsedData.skills || []).join(', ') || 'None'}
- Projects: ${JSON.stringify((parsedData.projects || []).slice(0, 3))}
- Experience: ${JSON.stringify((parsedData.experience || []).slice(0, 3))}
- Education: ${JSON.stringify(parsedData.education || [])}
- Certifications: ${(parsedData.certifications || []).join(', ') || 'None'}

RESUME TEXT (first 2000 chars):
${resumeText.slice(0, 2000)}

Return ONLY a JSON object with this exact structure:
{
  "roleFitScore": <0-100 integer, how well this resume fits ${targetRole}>,
  "roleFitReason": "<one sentence explaining the score>",
  "keyGaps": ["<specific gap 1>", "<specific gap 2>", "<specific gap 3>"],
  "strengthAreas": ["<genuine strength 1>", "<genuine strength 2>"],
  "atsKeywordsPresent": ["<keyword found>"],
  "atsKeywordsMissing": ["<critical keyword missing for ${targetRole}>"],
  "recommendations": [
    "<specific actionable recommendation 1>",
    "<specific actionable recommendation 2>",
    "<specific actionable recommendation 3>"
  ],
  "nextStepPriority": "<single most important thing to do right now>"
}`;

    return await generateJson(prompt);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      '[Gemini] Analyze resume failed or overloaded. Falling back to local heuristic analysis.',
      err.message || err
    );
    return getLocalResumeFallback(parsedData, targetRole);
  }
}

/** Generates one targeted interview question for a specific skill gap. */
export async function geminiGenerateQuestion({
  targetRole,
  gap,
  previousQuestions = [],
  difficulty = 'mid',
}) {
  const prompt = `You are a senior interviewer at a top tech company interviewing for: ${targetRole}

Generate ONE interview question that specifically tests this weakness/gap:
"${gap}"

Difficulty: ${difficulty} level
Previously asked questions (don't repeat): ${previousQuestions.join(' | ') || 'None yet'}

Return ONLY a JSON object:
{
  "question": "<the interview question>",
  "questionType": "<behavioral|technical|situational>",
  "whatWereTesting": "<what skill/gap this tests>",
  "goodAnswerShouldContain": ["<element 1>", "<element 2>", "<element 3>"],
  "rubric": {
    "relevance": 30,
    "depth": 40,
    "communication": 30
  },
  "hint": "<brief hint for the candidate if they're stuck>"
}`;

  return generateJson(prompt);
}

/** Evaluates candidate interview answer using a multi-dimensional rubric. */
export async function geminiEvaluateAnswer({ question, answer, targetRole, rubric, questionType }) {
  const prompt = `You are a senior interviewer evaluating a ${targetRole} interview response.

QUESTION: ${question}
QUESTION TYPE: ${questionType || 'behavioral'}
SCORING RUBRIC: ${JSON.stringify(rubric || { relevance: 30, depth: 40, communication: 30 })}

CANDIDATE'S ANSWER:
"${answer}"

Evaluate fairly but critically. Return ONLY a JSON object:
{
  "scores": {
    "relevance": <0 to ${rubric?.relevance || 30}>,
    "depth": <0 to ${rubric?.depth || 40}>,
    "communication": <0 to ${rubric?.communication || 30}>
  },
  "totalScore": <sum of above scores>,
  "grade": "<Excellent|Good|Average|Needs Work>",
  "strengths": ["<what they did well>"],
  "improvements": ["<specific thing to improve>"],
  "modelAnswer": "<a brief example of what a strong answer would include>",
  "encouragement": "<one encouraging sentence personalizing feedback>"
}`;

  return generateJson(prompt);
}

/** Pre-generates the long-form coaching narrative explaining the Path Score. */
export async function geminiExplainScore({ user, resume, pathScore }) {
  const dreamRole = user?.profile?.dreamRole || 'Software Engineer';
  const systemInstruction = `You are PathPilot AI, a career coach for ${user.name}. Be direct, personal, and encouraging.`;

  const userPrompt = `Explain this career readiness score to ${user.name}:

Target Role: ${dreamRole}
Path Score: ${pathScore.displayScore}/100
Readiness Level: ${pathScore.readiness?.label}

Score breakdown:
${(pathScore.factors || []).map((f) => `- ${f.label}: ${f.score}/${f.max} (${f.status})`).join('\n')}

${resume ? `Resume: ${resume.healthScore}/100 health, ${(resume.skills || []).length} skills` : 'No resume uploaded yet'}
${resume?.keyGaps?.length ? `Key gaps: ${resume.keyGaps.join(', ')}` : ''}

Write 3-4 short paragraphs:
1. What this score means for them specifically
2. The 2-3 most impactful things holding them back
3. The single best next step they should take today

Write directly to them, use their first name (${user.name.split(' ')[0]}), be honest but motivating.`;

  try {
    const response = await safeGenerateContent({
      model: MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });
    return response.text;
  } catch (err) {
    geminiErrorHandler(err);
  }
}

/** Generates custom roadmap weeks specifically targeting resume gaps. */
export async function geminiGenerateGapRoadmap({ gaps, targetRole }) {
  const prompt = `You are a technical career coach building a learning roadmap.
The user is targeting the role: ${targetRole}

Their resume analysis revealed the following specific gaps:
${gaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}

Generate a custom learning roadmap (1 week per gap) to address these exact weaknesses.
For each week, define a topic, a description, and exactly 3 actionable tasks.

Return ONLY a valid JSON array of week objects:
[
  {
    "topic": "Mastering [Topic]",
    "focus": "Addressing the gap: [Gap]",
    "tasks": [
      { "name": "Task 1", "hours": 2 },
      { "name": "Task 2", "hours": 3 },
      { "name": "Task 3", "hours": 2 }
    ]
  }
]`;

  return generateJson(prompt);
}

/** Deterministic local fallback generator for resume role-fit analysis when Gemini API is unavailable. */
function getLocalResumeFallback(parsedData, targetRole) {
  const candidateSkills = (parsedData?.skills || []).map((s) => s.toLowerCase());
  const roleLower = targetRole.toLowerCase();

  let expectedSkills = ['git', 'agile', 'rest api', 'problem solving'];
  let defaultAts = ['CI/CD', 'Docker', 'Testing', 'Clean Code'];

  if (roleLower.includes('front') || roleLower.includes('web') || roleLower.includes('ui')) {
    expectedSkills = ['javascript', 'html', 'css', 'react', 'typescript', 'tailwind'];
    defaultAts = ['Responsive Design', 'Web Performance', 'State Management', 'Vite'];
  } else if (roleLower.includes('back') || roleLower.includes('node') || roleLower.includes('api')) {
    expectedSkills = ['node.js', 'express', 'databases', 'sql', 'mongodb', 'rest api'];
    defaultAts = ['System Design', 'Redis', 'Unit Testing', 'Authentication'];
  } else if (roleLower.includes('data') || roleLower.includes('ml') || roleLower.includes('python')) {
    expectedSkills = ['python', 'pandas', 'sql', 'machine learning', 'data analysis'];
    defaultAts = ['Data Pipelines', 'Scikit-learn', 'Feature Engineering', 'Jupyter'];
  }

  const missingSkills = expectedSkills.filter((s) => !candidateSkills.includes(s));
  const keyGaps =
    missingSkills.length > 0
      ? missingSkills.map((s) => `Expand proficiency in ${s.toUpperCase()}`)
      : ['Integrate advanced system architecture patterns', 'Implement CI/CD pipeline automation'];

  const matches = expectedSkills.filter((s) => candidateSkills.includes(s)).length;
  const roleFitScore = Math.min(92, Math.max(55, 60 + matches * 8));

  const strengthAreas = [];
  if (candidateSkills.length > 3) {
    strengthAreas.push(
      `Broad core foundation: ${candidateSkills.slice(0, 3).join(', ').toUpperCase()}`
    );
  } else {
    strengthAreas.push('Shows initiative in academic project implementation');
  }
  if ((parsedData?.projects || []).length > 0) {
    strengthAreas.push(`Practical project execution (${parsedData.projects.length} parsed project(s))`);
  }

  const atsKeywordsPresent = (parsedData?.skills || []).slice(0, 5);
  const atsKeywordsMissing = defaultAts
    .filter((k) => !candidateSkills.includes(k.toLowerCase()))
    .slice(0, 3);

  const recommendations = [
    `Incorporate professional project structures utilizing ${expectedSkills[0] || 'modern tech stack'} practices.`,
    'Quantify resume project results using metric impact percentages (e.g. "reduced latency by 20%").',
    'Include direct documentation of API design, schema definition, and deployment flows.',
  ];

  return {
    roleFitScore,
    roleFitReason: `Analyzed against ${targetRole} standards (local heuristics backup). Matches key foundation parameters.`,
    keyGaps: keyGaps.slice(0, 3),
    strengthAreas: strengthAreas.slice(0, 2),
    atsKeywordsPresent,
    atsKeywordsMissing,
    recommendations,
    nextStepPriority: `Add a comprehensive capstone project explicitly showcasing ${expectedSkills.slice(0, 2).join(' and ').toUpperCase()}.`,
  };
}

// ── Resume Builder AI Features ────────────────────────────────────────────────

/**
 * Gemini-powered fallback roadmap generator.
 * Used when the Django AI service is unavailable (cold start or down on Render free tier).
 * Returns a roadmap object matching the same shape expected by `roadmapToWeeks()` in growth.service.js.
 */
export async function geminiGenerateRoadmap({ targetRole, currentSkills = [] }) {
  const skillsText = currentSkills.length > 0 ? currentSkills.join(', ') : 'none listed';
  const prompt = `You are a technical career coach. Generate a week-by-week learning roadmap for a student targeting: ${targetRole}.

Their current skills: ${skillsText}

Generate a structured 6-8 week roadmap focused on skills they likely still need for ${targetRole}.
Return ONLY valid JSON matching this exact structure:
{
  "targetRole": "${targetRole}",
  "summary": "<1-2 sentence roadmap summary>",
  "coverage": "6 weeks",
  "totalWeeks": 6,
  "totalTasks": 18,
  "totalHours": 48,
  "strengths": ["<existing strength 1>", "<existing strength 2>"],
  "weeks": [
    {
      "week": 1,
      "title": "<Core foundation: Skill1, Skill2>",
      "focusHours": 8,
      "tasks": [
        {
          "key": "skill-name-slug",
          "skill": "Skill Name",
          "title": "Learn Skill Name",
          "priority": "core",
          "difficulty": "Beginner",
          "estimatedHours": 8
        }
      ]
    }
  ]
}
Priority must be one of: core, recommended, supporting.
Difficulty must be one of: Beginner, Intermediate, Advanced.`;

  try {
    const result = await generateJson(prompt);
    if (!result || !Array.isArray(result.weeks)) return null;
    // Ensure each task has required fields
    result.weeks = result.weeks.map((w, i) => ({
      week: w.week || i + 1,
      title: w.title || `Week ${i + 1}`,
      focusHours: w.focusHours || 8,
      tasks: (w.tasks || []).map((t) => ({
        key: t.key || t.skill?.toLowerCase().replace(/\s+/g, '-') || `task-${i}`,
        skill: t.skill || t.title || 'General',
        title: t.title || `Learn ${t.skill}`,
        priority: ['core', 'recommended', 'supporting'].includes(t.priority) ? t.priority : 'core',
        difficulty: ['Beginner', 'Intermediate', 'Advanced'].includes(t.difficulty) ? t.difficulty : 'Intermediate',
        estimatedHours: Number(t.estimatedHours) || 8,
      })),
    }));
    return result;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Gemini Roadmap Fallback] Failed:', err.message);
    return null;
  }
}

/**
 * Gemini-powered fallback skill gap analyzer.
 * Used when the Django AI service is unavailable (cold start or down on Render free tier).
 * Returns a gap object matching the same shape expected by gap.controller.js.
 */
export async function geminiAnalyzeSkillGap({ targetRole, currentSkills = [] }) {
  const skillsText = currentSkills.length > 0 ? currentSkills.join(', ') : 'none listed';
  const prompt = `You are a technical career analyst. Analyze the skill gap for a student targeting: ${targetRole}.

Their current skills: ${skillsText}

Return ONLY valid JSON matching this exact structure:
{
  "targetRole": "${targetRole}",
  "matchedSkills": [
    { "skill": "Python", "priority": "core", "estimatedHours": 0 }
  ],
  "missingSkills": [
    { "skill": "Docker", "priority": "core", "estimatedHours": 10 },
    { "skill": "SQL", "priority": "recommended", "estimatedHours": 8 }
  ],
  "score": 45,
  "recommendations": [
    "Start with core skills: Docker and Kubernetes",
    "Build 2 role-relevant projects"
  ]
}
Priority must be one of: core, recommended, supporting.
Include 3-8 missing skills and all matched skills from their current skill list.
Score is the percentage of required role skills they already have (0-100).`;

  try {
    const result = await generateJson(prompt);
    if (!result) {
      // eslint-disable-next-line no-console
      console.warn('[Gemini Skill Gap Fallback] generateJson returned null/undefined');
      return null;
    }

    // Accept partial results — don't require perfect structure
    const missingSkills = Array.isArray(result.missingSkills)
      ? result.missingSkills
      : Array.isArray(result.missing_skills) ? result.missing_skills : [];

    const matchedSkills = Array.isArray(result.matchedSkills)
      ? result.matchedSkills
      : Array.isArray(result.matched_skills) ? result.matched_skills : [];

    return {
      targetRole: result.targetRole || targetRole,
      matchedSkills: matchedSkills.map((s) => ({
        skill: s.skill || String(s),
        priority: s.priority || 'recommended',
        estimatedHours: Number(s.estimatedHours) || 0,
      })),
      missingSkills: missingSkills.map((s) => ({
        skill: s.skill || String(s),
        priority: ['core','recommended','supporting'].includes(s.priority) ? s.priority : 'recommended',
        estimatedHours: Number(s.estimatedHours) || 8,
      })),
      score: Number(result.score) || 0,
      recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Gemini Skill Gap Fallback] Failed:', err.message, err.stack?.split('\n')[1] || '');
    return null;
  }
}

/** Rewrites a single resume bullet to be stronger, action-verb-first, and measurable. */
export async function geminiRewriteBullet({ bullet, targetRole, context = '' }) {
  const prompt = `You are a professional resume writer helping a candidate targeting: ${targetRole}

Rewrite this single resume bullet point to be stronger: start with a powerful action verb, be specific, and include a measurable result or impact wherever plausible. Keep it to one line, no more than 28 words. Do not invent specific numbers that weren't implied — instead use a placeholder like "[X]%" if a metric is clearly missing but appropriate.

${context ? `Additional context from the candidate: ${context}\n` : ''}
ORIGINAL BULLET:
"${bullet}"

Return ONLY a JSON object:
{
  "rewritten": "<the improved bullet, one line>",
  "changeSummary": "<one short phrase describing what improved, e.g. 'Added action verb and quantified impact'>"
}`;

  return generateJson(prompt);
}

/** Generates a professional resume summary targeting the candidate's dream role. */
export async function geminiGenerateResumeSummary({ targetRole, skills = [], experience = [], projects = [] }) {
  const prompt = `You are a professional resume writer. Write a 2-3 sentence professional summary for a candidate targeting: ${targetRole}

CANDIDATE BACKGROUND:
- Skills: ${skills.join(', ') || 'Not specified'}
- Experience highlights: ${experience.slice(0, 3).join(' | ') || 'None listed'}
- Project highlights: ${projects.slice(0, 3).join(' | ') || 'None listed'}

Write a confident, specific, non-generic summary (no "results-driven professional with a passion for..." clichés). Return ONLY a JSON object:
{
  "summary": "<the 2-3 sentence summary>"
}`;

  const result = await generateJson(prompt);
  return result?.summary || '';
}

/**
 * Scans the full resume draft and returns section-scoped improvement suggestions —
 * NOT a single opaque rewritten blob, so the editor can show a before/after diff
 * per bullet instead of silently replacing everything the user wrote.
 */
export async function geminiOptimizeResume({ targetRole, summary, experience, skills, missingKeywords = [] }) {
  const bulletList = (experience || []).flatMap((e, ei) =>
    (e.bullets || []).map((b, bi) => ({ id: `${ei}-${bi}`, text: b }))
  );

  const prompt = `You are a resume optimization expert reviewing a draft for a candidate targeting: ${targetRole}

CURRENT SUMMARY: ${summary || '(none written yet)'}
CURRENT SKILLS: ${(skills || []).join(', ') || 'None'}
MISSING ATS KEYWORDS FOR THIS ROLE: ${missingKeywords.join(', ') || 'None identified'}

CURRENT BULLETS (each tagged with an id):
${bulletList.map((b) => `[${b.id}] ${b.text}`).join('\n') || '(no bullets written yet)'}

Identify the WEAKEST bullets (vague, no metrics, passive, or missing action verbs — up to 5) and rewrite them. Also suggest 2-3 of the missing ATS keywords that could be woven naturally into the summary or a bullet. Flag any recruiter red flags you notice (e.g. no quantified results anywhere, summary too generic, skills list too short).

Return ONLY a JSON object:
{
  "bulletRewrites": [
    { "id": "<bullet id from above>", "original": "<original text>", "rewritten": "<improved version>" }
  ],
  "keywordSuggestions": ["<keyword to weave in>"],
  "redFlags": ["<short flag description>"],
  "summaryFeedback": "<one sentence on the summary's quality, or null if no summary exists>"
}`;

  return generateJson(prompt);
}

/** Compares resume content against a pasted job description; returns matched/missing keywords. */
export async function geminiMatchJobDescription({ jobDescription, resumeText, targetRole }) {
  const prompt = `You are an ATS keyword matching engine. Compare this candidate's resume content against the job description below for a ${targetRole} role.

JOB DESCRIPTION:
"""
${jobDescription.slice(0, 4000)}
"""

RESUME CONTENT:
"""
${resumeText.slice(0, 4000)}
"""

Extract the specific skills, tools, and qualifications this job description asks for, then determine which are present vs missing in the resume content.

Return ONLY a JSON object:
{
  "jdKeywords": ["<keyword the JD asks for>"],
  "matchedKeywords": ["<keyword present in the resume>"],
  "missingKeywords": ["<keyword the JD asks for but resume lacks>"],
  "matchPercent": <0-100 integer>
}`;

  return generateJson(prompt);
}

/** Weaves a list of missing keywords naturally into the resume summary. */
export async function geminiInsertKeywords({ summary, targetRole, keywords }) {
  const prompt = `You are a resume writer. Rewrite this professional summary for a ${targetRole} candidate to naturally incorporate these missing keywords, without making it feel like a keyword-stuffed list: ${keywords.join(', ')}

CURRENT SUMMARY: ${summary || '(empty — write a new 2-3 sentence summary that includes these keywords naturally)'}

Return ONLY a JSON object:
{
  "summary": "<the updated 2-3 sentence summary with keywords woven in naturally>"
}`;

  const result = await generateJson(prompt);
  return result?.summary || summary;
}

/** Fallback parser using Gemini when the local extraction/Django parses less than 30 words. */
export async function geminiParseFallback(rawText) {
  const prompt = `You are a high-fidelity resume extraction parser. 
Analyze the raw, potentially noisy or OCR-scanned text of a resume below, and extract the structured content into the specified JSON format.
If certain fields are missing, provide clean empty arrays/objects. Keep descriptions clean and impact-oriented.

RAW RESUME TEXT:
"""
${rawText}
"""

Return ONLY a JSON object of this structure:
{
  "skills": ["<canonical skill 1>", "<canonical skill 2>"],
  "education": ["<Degree, Major - Institution (Grad Year or Dates)>"],
  "projects": [
    {
      "title": "<Project Name>",
      "description": "<Concise description of what was built, stack used, and bulleted metrics if any>"
    }
  ],
  "experience": ["<Job Title - Company, Location (Dates) - bullet points of achievements>"],
  "certifications": ["<Certification name - Provider>"],
  "contact": {
    "email": "<extracted email or empty string>",
    "phone": "<extracted phone number or empty string>",
    "linkedin": "<extracted linkedin url/handle or empty string>",
    "github": "<extracted github url/handle or empty string>"
  },
  "health": {
    "score": 60,
    "breakdown": [
      { "label": "Contact & links", "score": 10, "max": 15, "status": "warn", "tip": "Improve links" }
    ]
  },
  "suggestions": ["Add missing GitHub links", "Quantify project metrics"],
  "wordCount": 100,
  "lowText": false
}`;

  try {
    const parsed = await generateJson(prompt);
    if (!parsed.skills) parsed.skills = [];
    if (!parsed.projects) parsed.projects = [];
    if (!parsed.contact) parsed.contact = { email: '', phone: '', linkedin: '', github: '' };
    if (!parsed.health) parsed.health = { score: 60, breakdown: [] };
    if (!parsed.suggestions) parsed.suggestions = [];
    return parsed;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Gemini Fallback Parser] Failed:', err);
    return null;
  }
}

/**
 * Post-parse sanity check. Django's regex parser (and the Gemini fallback above)
 * can still misfire on multi-column layouts, tables, or skills listed inline
 * within a job-description-style bullet — merging fields together or garbling
 * project titles. This does one lightweight pass comparing the parsed fields
 * back against the raw text, correcting obvious mistakes and flagging fields
 * it's still not confident about (surfaced in the UI as a "please verify" hint).
 *
 * Best-effort only: on any failure, returns the original fields unchanged
 * rather than blocking the analyze pipeline.
 */
/** Flattens a value into a single readable line — handles the case where Gemini
 *  returns a structured object (e.g. {degree, institution, years}) instead of
 *  the plain string the [String] schema fields require. */
function toReadableLine(entry) {
  if (typeof entry === 'string') return entry;
  if (Array.isArray(entry)) return entry.map(toReadableLine).filter(Boolean).join('; ');
  if (entry && typeof entry === 'object') {
    return Object.values(entry).map(toReadableLine).filter(Boolean).join(' — ');
  }
  return entry == null ? '' : String(entry);
}

function coerceStringArray(arr) {
  return (Array.isArray(arr) ? arr : []).map(toReadableLine).map((s) => s.trim()).filter(Boolean);
}

function coerceProjects(arr) {
  return (Array.isArray(arr) ? arr : []).map((p) => (
    typeof p === 'string'
      ? { title: p, description: '' }
      : { title: toReadableLine(p?.title), description: toReadableLine(p?.description) }
  ));
}

export async function geminiValidateParsedResume({ rawText, parsed }) {
  const original = {
    skills: coerceStringArray(parsed.skills),
    education: coerceStringArray(parsed.education),
    experience: coerceStringArray(parsed.experience),
    projects: coerceProjects(parsed.projects),
  };

  const prompt = `You are a resume-parsing QA reviewer. A previous parser extracted structured fields from a resume's raw text below. Parsers commonly make mistakes on multi-column layouts, tables, or skills listed inline within job descriptions — merging unrelated text together, garbling project titles, or misassigning content to the wrong section.

RAW RESUME TEXT (reference only, may be noisy):
"""
${rawText.slice(0, 6000)}
"""

PARSED FIELDS TO REVIEW:
skills: ${JSON.stringify(original.skills)}
education: ${JSON.stringify(original.education)}
experience: ${JSON.stringify(original.experience)}
projects: ${JSON.stringify(original.projects)}

Correct obvious extraction errors ONLY — don't rewrite content that's already fine, and don't invent information not present in the raw text. Then list which of these four field names (skills, education, experience, projects) you're still not fully confident about after cleanup.

IMPORTANT: "education" and "experience" must each be a flat array of PLAIN STRINGS (one line per entry, e.g. "B.Tech Computer Science, IIT Delhi (2022-2026)") — never nested objects.

Return ONLY a JSON object:
{
  "skills": ["<corrected skill list>"],
  "education": ["<corrected education entry as one plain string>"],
  "experience": ["<corrected experience entry as one plain string>"],
  "projects": [{ "title": "<corrected title>", "description": "<corrected description>" }],
  "lowConfidenceFields": ["<field name(s) from: skills, education, experience, projects>"]
}`;

  try {
    const result = await generateJson(prompt);
    return {
      skills: coerceStringArray(Array.isArray(result?.skills) ? result.skills : original.skills),
      education: coerceStringArray(Array.isArray(result?.education) ? result.education : original.education),
      experience: coerceStringArray(Array.isArray(result?.experience) ? result.experience : original.experience),
      projects: coerceProjects(Array.isArray(result?.projects) ? result.projects : original.projects),
      lowConfidenceFields: Array.isArray(result?.lowConfidenceFields) ? result.lowConfidenceFields : [],
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Resume Sanity Check] Failed, keeping original parsed fields:', err);
    return { ...original, lowConfidenceFields: [] };
  }
}
