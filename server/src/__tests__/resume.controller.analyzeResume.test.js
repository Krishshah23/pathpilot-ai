import { jest } from '@jest/globals';

jest.mock('../config/env.js', () => ({
  env: { isProd: false },
}));

jest.mock('../models/Resume.js', () => ({
  Resume: { create: jest.fn(), countDocuments: jest.fn().mockResolvedValue(1) },
}));

jest.mock('../models/Notification.js', () => ({
  Notification: { create: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../config/gridfs.js', () => ({
  uploadBufferToGridFS: jest.fn().mockResolvedValue('fake-file-id'),
  downloadGridFSBuffer: jest.fn(),
  findGridFSFile: jest.fn(),
  pipeGridFSFileToResponse: jest.fn(),
}));

jest.mock('../services/resumeText.service.js', () => ({
  extractResumeText: jest.fn(),
}));

jest.mock('../services/ai.service.js', () => ({
  aiService: { parseResume: jest.fn(), predict: jest.fn() },
}));

jest.mock('../services/resumeRedFlags.js', () => ({
  detectRedFlags: jest.fn().mockReturnValue([]),
}));

jest.mock('../services/gemini.service.js', () => ({
  geminiAnalyzeResume: jest.fn().mockResolvedValue({}),
  geminiExplainScore: jest.fn().mockResolvedValue(null),
  geminiParseFallback: jest.fn(),
  geminiValidateParsedResume: jest.fn(),
}));

jest.mock('../services/pathScore.service.js', () => ({
  buildPathScore: jest.fn().mockReturnValue({ displayScore: 50 }),
  recomputePathScoreCache: jest.fn().mockResolvedValue({ previous: null, current: { displayScore: 50 } }),
}));

jest.mock('../services/notification.service.js', () => ({
  notify: jest.fn().mockResolvedValue(undefined),
  notifyOnce: jest.fn().mockResolvedValue(undefined),
}));

import { analyzeResume } from '../controllers/resume.controller.js';
import { Resume } from '../models/Resume.js';
import { extractResumeText } from '../services/resumeText.service.js';
import { aiService } from '../services/ai.service.js';
import { geminiParseFallback, geminiValidateParsedResume } from '../services/gemini.service.js';

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function mockReq(overrides = {}) {
  return {
    file: { buffer: Buffer.from('fake-pdf-bytes'), originalname: 'resume.pdf', mimetype: 'application/pdf' },
    user: {
      _id: 'user-123',
      profile: { dreamRole: 'Backend Engineer' },
      save: jest.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  };
}

/** A parsed-resume shape from Django, with a distinctive marker to trace which source won. */
function djangoParsed(overrides = {}) {
  return {
    skills: ['Python'],
    education: [],
    projects: [{ title: 'DjangoProj' }],
    experience: [],
    certifications: [],
    contact: {},
    health: { score: 70, breakdown: [] },
    suggestions: ['django-tip'],
    wordCount: 120,
    lowText: false,
    ...overrides,
  };
}

function geminiParsed(overrides = {}) {
  return {
    skills: ['Gemini-Skill'],
    education: [],
    projects: [{ title: 'GeminiProj' }],
    experience: [],
    certifications: [],
    contact: {},
    health: { score: 60, breakdown: [] },
    suggestions: ['gemini-tip'],
    wordCount: 100,
    lowText: false,
    ...overrides,
  };
}

beforeEach(() => {
  extractResumeText.mockResolvedValue({ text: 'some resume text with enough words to be realistic content here', links: [] });
  Resume.create.mockResolvedValue({ _id: 'resume-1', healthScore: 70, save: jest.fn().mockResolvedValue(undefined) });
  // Pass-through validator: echoes back whatever parser data it was given.
  geminiValidateParsedResume.mockImplementation(({ parsed }) =>
    Promise.resolve({
      skills: parsed.skills,
      education: parsed.education,
      experience: parsed.experience,
      projects: parsed.projects,
      lowConfidenceFields: [],
    })
  );
});

describe('resume.controller — analyzeResume fallback chain', () => {
  it('uses the Django parse result directly when it succeeds with good-quality data', async () => {
    aiService.parseResume.mockResolvedValue({ data: djangoParsed() });

    await analyzeResume(mockReq(), mockRes(), jest.fn());

    expect(geminiParseFallback).not.toHaveBeenCalled();
    const created = Resume.create.mock.calls[0][0];
    expect(created.suggestions).toEqual(['django-tip']);
    expect(created.skills).toEqual(['Python']);
  });

  it('falls back to Gemini when the Django call throws (service unreachable)', async () => {
    aiService.parseResume.mockRejectedValue(new Error('ECONNREFUSED'));
    geminiParseFallback.mockResolvedValue(geminiParsed());

    await analyzeResume(mockReq(), mockRes(), jest.fn());

    expect(geminiParseFallback).toHaveBeenCalled();
    const created = Resume.create.mock.calls[0][0];
    expect(created.suggestions).toEqual(['gemini-tip']);
    expect(created.skills).toEqual(['Gemini-Skill']);
  });

  it('falls back to Gemini when Django "succeeds" but flags the text as low-quality (lowText)', async () => {
    aiService.parseResume.mockResolvedValue({ data: djangoParsed({ lowText: true }) });
    geminiParseFallback.mockResolvedValue(geminiParsed());

    await analyzeResume(mockReq(), mockRes(), jest.fn());

    expect(geminiParseFallback).toHaveBeenCalled();
    const created = Resume.create.mock.calls[0][0];
    expect(created.suggestions).toEqual(['gemini-tip']);
  });

  it('falls back to Gemini when Django returns empty skills AND empty projects', async () => {
    aiService.parseResume.mockResolvedValue({ data: djangoParsed({ skills: [], projects: [] }) });
    geminiParseFallback.mockResolvedValue(geminiParsed());

    await analyzeResume(mockReq(), mockRes(), jest.fn());

    expect(geminiParseFallback).toHaveBeenCalled();
    const created = Resume.create.mock.calls[0][0];
    expect(created.skills).toEqual(['Gemini-Skill']);
  });

  it('falls back to the local regex parser when both Django and Gemini fail', async () => {
    aiService.parseResume.mockRejectedValue(new Error('ECONNREFUSED'));
    geminiParseFallback.mockResolvedValue(null);
    extractResumeText.mockResolvedValue({
      text: 'Experienced JavaScript and React developer with a GitHub portfolio and several projects built over the years',
      links: [],
    });

    await analyzeResume(mockReq(), mockRes(), jest.fn());

    const created = Resume.create.mock.calls[0][0];
    // Proves the *local* fallback ran for real: it keyword-matches KNOWN_SKILLS
    // against the raw text rather than using either mocked fixture's data.
    expect(created.skills).toEqual(expect.arrayContaining(['JavaScript', 'React']));
    expect(created.suggestions).toEqual([
      'AI parsing was temporarily unavailable. Re-upload your resume for a full AI analysis.',
    ]);
  });

  it('rejects with 502 when Django fails, Gemini fails, and the local fallback also can’t parse (text too short)', async () => {
    aiService.parseResume.mockRejectedValue(new Error('ECONNREFUSED'));
    geminiParseFallback.mockResolvedValue(null);
    extractResumeText.mockResolvedValue({ text: 'too short', links: [] });

    const next = jest.fn();
    await analyzeResume(mockReq(), mockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 502,
        message: 'AI service returned no analysis and fallback parsing failed.',
      })
    );
    expect(Resume.create).not.toHaveBeenCalled();
  });

  it('rejects with 400 when no file was uploaded', async () => {
    const next = jest.fn();
    await analyzeResume(mockReq({ file: undefined }), mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(aiService.parseResume).not.toHaveBeenCalled();
  });
});
