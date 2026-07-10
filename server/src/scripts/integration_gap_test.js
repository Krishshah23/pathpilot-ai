import { analyzeGap } from '../controllers/gap.controller.js';
import * as ResumeModel from '../models/Resume.js';
import { aiService } from '../services/ai.service.js';
import * as jobMarket from '../services/jobMarket.service.js';

async function run() {
  console.log('Integration-style controller test: analyzeGap');

  // Mock Resume.findOne to return a sample resume
  const fakeResume = {
    skills: ['JavaScript', 'React'],
    healthScore: 72,
    projects: ['proj1', 'proj2'],
  };

  const origFindOne = ResumeModel.Resume.findOne;
  ResumeModel.Resume.findOne = async () => ({ sort: () => Promise.resolve(fakeResume) });

  // Mock aiService.skillGap to return no recommendations (force fallback)
  const origSkillGap = aiService.skillGap;
  aiService.skillGap = async () => ({ data: {
    coverage: 60,
    summary: 'Test summary',
    matchedSkills: [{ skill: 'JavaScript' }],
    missingSkills: [{ skill: 'Docker', estimatedHours: 8, priority: 'recommended' }],
    matchedCount: 1,
    missingCount: 1,
    estimatedLearningTime: 8,
    currentSkills: ['JavaScript'],
  } });

  // Mock market data
  const origMarket = jobMarket.getMarketDataForRole;
  jobMarket.getMarketDataForRole = async () => ({ available: true, skills: [{ skill: 'Docker', frequency: 34 }], lastUpdated: new Date().toISOString(), sampleSize: 1200 });

  // Build fake req/res
  const req = {
    body: { targetRole: 'DevOps Engineer' },
    user: { _id: 'user1', profile: { skills: ['JavaScript'], dreamRole: 'DevOps Engineer' } },
  };

  let captured = null;
  const res = {
    status(code) { this._status = code; return this; },
    json(obj) { captured = obj; },
  };

  try {
    await analyzeGap(req, res);
  } catch (err) {
    console.error('analyzeGap threw:', err);
    process.exit(1);
  }

  // Basic assertions
  if (!captured || !captured.data) {
    console.error('No response captured');
    process.exit(1);
  }

  const { gap, sources, marketData } = captured.data;
  console.log('Captured gap.recommendationSource =', gap.recommendationSource);

  if (gap.recommendationSource !== 'fallback' && gap.recommendationSource !== 'ai') {
    console.error('recommendationSource missing or invalid');
    process.exit(1);
  }

  if (!Array.isArray(gap.recommendations)) {
    console.error('recommendations not an array');
    process.exit(1);
  }

  console.log('Integration-style test passed.');

  // Restore originals
  ResumeModel.Resume.findOne = origFindOne;
  aiService.skillGap = origSkillGap;
  jobMarket.getMarketDataForRole = origMarket;
  process.exit(0);
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
