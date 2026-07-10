import assert from 'assert';
import { ensureGapRecommendations } from '../controllers/gap.controller.js';

async function run() {
  console.log('Running gap recommendations unit checks...');

  // Case 1: AI provided recommendations
  const gap1 = { recommendations: ['Do X', 'Do Y'], missingSkills: [{skill: 'A'}] };
  ensureGapRecommendations(gap1);
  assert.strictEqual(gap1.recommendationSource, 'ai', 'Should keep AI source when recommendations present');
  assert.deepStrictEqual(gap1.recommendations, ['Do X', 'Do Y']);

  // Case 2: No recommendations, missingSkills with estimatedHours
  const gap2 = { recommendations: [], missingSkills: [{skill: 'React', estimatedHours: 12}, {skill: 'Docker'}] };
  ensureGapRecommendations(gap2);
  assert.strictEqual(gap2.recommendationSource, 'fallback', 'Should mark fallback when no AI recommendations');
  assert.ok(Array.isArray(gap2.recommendations) && gap2.recommendations.length > 0, 'Fallback recommendations should exist');
  assert.strictEqual(gap2.recommendations[0], 'Learn React — ~12h');

  // Case 3: No missingSkills present
  const gap3 = { recommendations: null, missingSkills: [] };
  ensureGapRecommendations(gap3);
  assert.strictEqual(gap3.recommendationSource, 'fallback');
  assert.deepStrictEqual(gap3.recommendations, []);

  console.log('All checks passed.');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
