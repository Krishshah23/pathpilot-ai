const fs = require('fs');
const path = require('path');

function loadBenchmarks() {
  const p = path.resolve(__dirname, '..', 'ml', 'models', 'peer_benchmarks.json');
  if (!fs.existsSync(p)) throw new Error('benchmarks file not found: ' + p);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function computePercentile(percentiles, score) {
  if (!Array.isArray(percentiles) || percentiles.length < 2) return 50;
  // expect 0..100 indices
  const min = percentiles[0];
  const max = percentiles[percentiles.length - 1];
  if (score <= min) return 0;
  if (score >= max) return 100;
  // find interval
  for (let i = 0; i < percentiles.length - 1; i++) {
    const a = percentiles[i];
    const b = percentiles[i + 1];
    if (score >= a && score <= b) {
      const span = b - a;
      if (span === 0) return i;
      const frac = (score - a) / span;
      return i + frac;
    }
  }
  return 50;
}

function testRole(roleName, benchmarks) {
  const data = benchmarks[roleName] || benchmarks[Object.keys(benchmarks)[0]];
  const percentiles = data.percentiles;
  const tests = [data.min - 5, data.min, data.mean, data.max, data.max + 5, 0, 50, 100, Math.round((data.min + data.mean)/2)];
  console.log('Role:', roleName);
  console.log('min,mean,max:', data.min, data.mean, data.max);
  for (const s of tests) {
    const pct = computePercentile(percentiles, s);
    console.log(' score=', s, ' -> percentile=', Math.round(pct));
  }
}

function main() {
  const benchmarks = loadBenchmarks();
  const roles = Object.keys(benchmarks);
  if (roles.length === 0) throw new Error('no roles in benchmarks');
  // prefer Software Engineer if present
  const role = roles.includes('Software Engineer') ? 'Software Engineer' : roles[0];
  testRole(role, benchmarks);
}

main();
