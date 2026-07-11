// Simple POST test to ai-service /api/predict/
// Mirrors the real Express caller (ai.service.js) exactly:
//   - trailing slash on the URL
//   - X-Internal-Key header (same shared secret the Node backend sends)
//
// Key is read from the environment first so this stays accurate if rotated.
// Fallback matches the dev default in both .env files.
const INTERNAL_KEY =
  process.env.INTERNAL_API_KEY || 'd23f7078f492cad0c9b7fe9ca35184f279c670b486ffe5e7';

const url = 'http://127.0.0.1:8000/api/predict/';

async function main() {
  try {
    // Payload mirrors what pathScore.controller.js sends in production.
    // Django's extract_resume_features() expects nested arrays/objects,
    // NOT flat primitives like skills_count or education:1.
    const payload = {
      skills: ['python', 'django', 'react', 'nodejs', 'mongodb'],
      education: [
        'B.Tech in Computer Science, Mumbai University, 2024, CGPA: 8.5/10',
      ],
      projects: [
        {
          title: 'PathPilot AI',
          description:
            'Built a full-stack career guidance platform using React, Node.js and Django. Deployed on AWS.',
        },
        {
          title: 'SkillLink',
          description:
            'Developed a skill-matching job board with real-time notifications using Socket.io.',
        },
      ],
      experience: [
        'Software Engineer Intern, TechCorp, June 2023 – Aug 2023',
        'Freelance Web Developer, Jan 2022 – Present',
      ],
      certifications: ['AWS Cloud Practitioner'],
      contact: {
        email: 'test@example.com',
        github: 'https://github.com/testuser',
        linkedin: 'https://linkedin.com/in/testuser',
      },
      healthScore: 78,
      wordCount: 800,
      rawText:
        'developed built designed led optimized automated open source contributor',
      profile: {
        college: 'Mumbai University',
        branch: 'Computer Science',
        semester: null,
        dreamRole: 'Software Engineer',
        skills: ['python', 'django'],
        resumeUrl: '',
      },
      currentSkills: ['python', 'django', 'react', 'nodejs'],
      targetRole: 'Software Engineer',
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': INTERNAL_KEY,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined,
    });

    console.log('Status:', res.status);
    const text = await res.text();
    try {
      const js = JSON.parse(text);
      console.log(JSON.stringify(js, null, 2));
    } catch (e) {
      console.log('Response text:', text);
    }
  } catch (err) {
    console.error('Request failed:', err.message || err);
    process.exit(1);
  }
}

main();
