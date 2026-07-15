import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const ai = new GoogleGenAI({ apiKey: env.gemini.apiKey });

const MODEL = env.gemini.model; // gemini-3.5-flash

async function safeGenerateContent({ model, contents, config }) {
  try {
    return await ai.models.generateContent({ model, contents, config });
  } catch (err) {
    const msg = err?.message || String(err);
    const isQuota = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || msg.includes('limit');
    if (isQuota && model !== 'gemini-3.1-flash-lite') {
      console.warn(`[Gemini Fallback] Quota exceeded on model '${model}'. Retrying with 'gemini-3.1-flash-lite'...`);
      try {
        return await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents,
          config,
        });
      } catch (fallbackErr) {
        console.error('[Gemini Fallback] Fallback model also failed:', fallbackErr.message);
        throw fallbackErr;
      }
    }
    throw err;
  }
}

/**
 * Converts raw Google API errors into clean, user-friendly ApiErrors.
 * Prevents raw 429/403 JSON from leaking to the frontend.
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
  // Generic fallback
  throw new ApiError(503, `AI service error: ${msg.slice(0, 120)}`);
}

/**
 * Builds a rich system context string from user + resume data.
 * Injected into every Gemini call so responses are always personal.
 */
function buildUserContext(user, resume, roadmap = null) {
  const profile = user?.profile || {};
  const dreamRole = profile.dreamRole || 'Software Engineer';
  const skills = [
    ...(profile.skills || []),
    ...(resume?.skills || []),
  ]
    .filter((s) => s && s.toLowerCase() !== 'none')
    .map((s) => s.trim());
  const uniqueSkills = [...new Set(skills.map((s) => s.toLowerCase()))].map(
    (s) => skills.find((sk) => sk.toLowerCase() === s)
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
- Current Week Focus: ${roadmap.weeks?.find(w => !w.isCompleted)?.topic || 'All caught up'}`
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

/* ─── Helpers ────────────────────────────────────────────────────────── */

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
    
    // Clean markdown and conversational padding
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
    if (err instanceof ApiError) throw err; // already handled
    geminiErrorHandler(err);
  }
}

/* ─── Exported Functions ─────────────────────────────────────────────── */

/**
 * Context-aware career coaching chat.
 */
export async function geminiChat({ user, resume, roadmap, history = [], message }) {
  try {
    const systemInstruction = buildUserContext(user, resume, roadmap);

    // Build conversation contents including history
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
 * Analyzes a resume against the user's target role.
 * Django parses structure first — Gemini adds role-specific intelligence on top.
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
    console.warn('[Gemini] Analyze resume failed or overloaded. Falling back to local heuristic analysis.', err.message || err);
    return getLocalResumeFallback(parsedData, targetRole);
  }
}

/**
 * Generates a role-specific interview question targeting a known gap.
 */
export async function geminiGenerateQuestion({ targetRole, gap, previousQuestions = [], difficulty = 'mid' }) {
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

/**
 * Evaluates a candidate's interview answer against a role-specific rubric.
 */
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

/**
 * Generates a path score explanation narrative from actual score data.
 */
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
      }
    });
    return response.text;
  } catch (err) {
    geminiErrorHandler(err);
  }
}

/**
 * Phase 5 Connection: Generate roadmap weeks specifically targeting resume gaps.
 */
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

/**
 * Fallback heuristic resume analyzer when Gemini is overloaded or API key fails.
 * Guarantees candidate onboarding succeeds with high-quality localized insights.
 */
function getLocalResumeFallback(parsedData, targetRole) {
  const candidateSkills = (parsedData?.skills || []).map(s => s.toLowerCase());
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
  
  const missingSkills = expectedSkills.filter(s => !candidateSkills.includes(s));
  const keyGaps = missingSkills.length > 0 
    ? missingSkills.map(s => `Expand proficiency in ${s.toUpperCase()}`)
    : ['Integrate advanced system architecture patterns', 'Implement CI/CD pipeline automation'];
  
  const matches = expectedSkills.filter(s => candidateSkills.includes(s)).length;
  const roleFitScore = Math.min(92, Math.max(55, 60 + matches * 8));
  
  const strengthAreas = [];
  if (candidateSkills.length > 3) {
    strengthAreas.push(`Broad core foundation: ${candidateSkills.slice(0, 3).join(', ').toUpperCase()}`);
  } else {
    strengthAreas.push('Shows initiative in academic project implementation');
  }
  if ((parsedData?.projects || []).length > 0) {
    strengthAreas.push(`Practical project execution (${parsedData.projects.length} parsed project(s))`);
  }
  
  const atsKeywordsPresent = (parsedData?.skills || []).slice(0, 5);
  const atsKeywordsMissing = defaultAts.filter(k => !candidateSkills.includes(k.toLowerCase())).slice(0, 3);
  
  const recommendations = [
    `Incorporate professional project structures utilizing ${expectedSkills[0] || 'modern tech stack'} practices.`,
    'Quantify resume project results using metric impact percentages (e.g. "reduced latency by 20%").',
    'Include direct documentation of API design, schema definition, and deployment flows.'
  ];

  return {
    roleFitScore,
    roleFitReason: `Analyzed against ${targetRole} standards (local heuristics backup). Matches key foundation parameters.`,
    keyGaps: keyGaps.slice(0, 3),
    strengthAreas: strengthAreas.slice(0, 2),
    atsKeywordsPresent,
    atsKeywordsMissing,
    recommendations,
    nextStepPriority: `Add a comprehensive capstone project explicitly showcasing ${expectedSkills.slice(0, 2).join(' and ').toUpperCase()}.`
  };
}

/**
 * Fallback parser using Gemini when the local extraction/Django parses less than 30 words.
 * Returns standard structured parsed resume fields.
 */
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
    // Add default structures if missing
    if (!parsed.skills) parsed.skills = [];
    if (!parsed.projects) parsed.projects = [];
    if (!parsed.contact) parsed.contact = { email: '', phone: '', linkedin: '', github: '' };
    if (!parsed.health) parsed.health = { score: 60, breakdown: [] };
    if (!parsed.suggestions) parsed.suggestions = [];
    return parsed;
  } catch (err) {
    console.error('[Gemini Fallback Parser] Failed:', err);
    return null;
  }
}

