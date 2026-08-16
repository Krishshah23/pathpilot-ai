import { buildPathScore } from '../services/pathScore.service.js';

describe('pathScore.service — buildPathScore', () => {
  it('scores 0 / "Unscored" for a brand-new user with no profile data and no resume', () => {
    const user = { profile: {} };

    const result = buildPathScore(user, undefined);

    expect(result.score).toBe(0);
    expect(result.displayScore).toBe(0);
    expect(result.readiness.label).toBe('Unscored');
    expect(result.factors).toHaveLength(5);
    expect(result.skills).toEqual([]);
    expect(result.resume).toBeNull();
    expect(result.profileCompletion.completed).toBe(0);
  });

  it('computes a correct weighted score for a strong, mostly-complete profile', () => {
    const user = {
      profile: {
        dreamRole: 'Backend Engineer',
        skills: ['Node.js', 'Docker'],
        resumeUrl: '/uploads/resumes/abc.pdf',
        college: 'ABC Institute',
        branch: 'Computer Science',
        semester: 8, // 7+ => no experience cap
      },
    };
    const resume = {
      _id: 'resume-1',
      healthScore: 90,
      skills: ['Node.js', 'Express', 'MongoDB', 'Docker', 'AWS'],
      projects: Array(6).fill({}), // saturates at 5
      experience: Array(5).fill({}), // saturates at 4
      fileUrl: '/api/resume/file/resume-1',
      originalName: 'resume.pdf',
      createdAt: new Date('2026-01-01'),
      lowText: false,
    };

    const result = buildPathScore(user, resume);

    // resumeQuality: (90/100)*25 = 22.5
    expect(result.factors.find((f) => f.key === 'resumeQuality').score).toBe(22.5);
    // skills: 5 unique skills (Node.js/Docker deduped across profile+resume) -> (5/20)*20 = 5
    expect(result.factors.find((f) => f.key === 'skills').score).toBe(5);
    expect(result.skills).toEqual(['AWS', 'Docker', 'Express', 'MongoDB', 'Node.js']);
    // projects: 6 saturates at 5 -> (5/5)*20 = 20
    expect(result.factors.find((f) => f.key === 'projects').score).toBe(20);
    // experience: 5 saturates at 4, uncapped at semester 8 -> (4/4)*1.0*20 = 20
    expect(result.factors.find((f) => f.key === 'experience').score).toBe(20);
    // profileCompletion: all 4 checks pass -> (4/4)*15 = 15
    expect(result.factors.find((f) => f.key === 'profileCompletion').score).toBe(15);

    expect(result.score).toBe(82.5);
    expect(result.displayScore).toBe(83);
    expect(result.readiness.label).toBe('Interview-ready foundation');
    expect(result.resume).toEqual({
      id: 'resume-1',
      healthScore: 90,
      originalName: 'resume.pdf',
      analyzedAt: resume.createdAt,
      lowText: false,
    });
  });

  it('reaches the maximum possible score (100, "Career-ready") when every factor is maxed', () => {
    const user = {
      profile: {
        dreamRole: 'Backend Engineer',
        skills: Array.from({ length: 20 }, (_, i) => `Skill${i}`),
        resumeUrl: '/uploads/resumes/abc.pdf',
        college: 'ABC Institute',
        branch: 'Computer Science',
        semester: 8,
      },
    };
    const resume = {
      healthScore: 100,
      skills: [],
      projects: Array(10).fill({}),
      experience: Array(10).fill({}),
    };

    const result = buildPathScore(user, resume);

    expect(result.score).toBe(100);
    expect(result.displayScore).toBe(100);
    expect(result.readiness.label).toBe('Career-ready');
  });

  describe('semester-based experience cap', () => {
    // Same 4 experience entries (fully saturated) at different semesters —
    // only the cap should change the resulting score.
    const resume = { healthScore: 0, skills: [], projects: [], experience: Array(4).fill({}) };

    it('caps early semesters (1-3) at 35% of the experience factor', () => {
      const result = buildPathScore({ profile: { semester: 2 } }, resume);
      // rawExperienceScore=1.0 * cap 0.35 * 20 = 7
      expect(result.factors.find((f) => f.key === 'experience').score).toBe(7);
    });

    it('caps mid semesters (4-6) at 65% of the experience factor', () => {
      const result = buildPathScore({ profile: { semester: 5 } }, resume);
      expect(result.factors.find((f) => f.key === 'experience').score).toBe(13);
    });

    it('applies no cap for semester 7+', () => {
      const result = buildPathScore({ profile: { semester: 9 } }, resume);
      expect(result.factors.find((f) => f.key === 'experience').score).toBe(20);
    });

    it('applies no cap when semester is unset (defaults to uncapped, not the harshest cap)', () => {
      // profile.semester is undefined -> Number(undefined)||0 -> 0, which matches
      // none of the 1-3 / 4-6 / 7+ bands, so experienceCap stays at its 1.0 default.
      const result = buildPathScore({ profile: {} }, resume);
      expect(result.factors.find((f) => f.key === 'experience').score).toBe(20);
    });
  });

  it('deduplicates skills case-insensitively across profile and resume, keeping first-seen casing', () => {
    const user = { profile: { skills: ['React', 'Node.js'] } };
    const resume = { skills: ['react', 'Python'] }; // 'react' duplicates profile's 'React'

    const result = buildPathScore(user, resume);

    expect(result.skills).toEqual(['Node.js', 'Python', 'React']);
  });

  it('marks only the profile-completeness checks that are actually satisfied', () => {
    const user = {
      profile: {
        dreamRole: 'Backend Engineer', // complete
        skills: ['A', 'B'], // incomplete: needs >= 3
        // resumeUrl not set, no resume passed -> incomplete
        college: 'ABC', // branch missing -> incomplete
      },
    };

    const result = buildPathScore(user, undefined);

    expect(result.profileCompletion.completed).toBe(1);
    expect(result.profileCompletion.checks).toEqual([
      { label: 'Dream role', complete: true },
      { label: 'Skills added', complete: false },
      { label: 'Resume uploaded', complete: false },
      { label: 'College & Branch', complete: false },
    ]);
  });

  it('treats a resume with fileUrl (but no profile.resumeUrl) as satisfying "Resume uploaded"', () => {
    const user = { profile: {} };
    const resume = { fileUrl: '/api/resume/file/abc', skills: [], projects: [], experience: [] };

    const result = buildPathScore(user, resume);

    expect(result.profileCompletion.checks.find((c) => c.label === 'Resume uploaded').complete).toBe(true);
  });
});
