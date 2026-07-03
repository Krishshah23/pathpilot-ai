import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from 'recharts';

/** Colour thresholds shared across score visualisations. */
export function scoreColor(score) {
  if (score >= 75) return '#22c55e'; // success
  if (score >= 50) return '#f59e0b'; // warning
  return '#ef4444'; // danger
}

export function scoreLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 75) return 'Strong';
  if (score >= 50) return 'Fair';
  if (score > 0) return 'Needs work';
  return 'Unscored';
}

/**
 * Radial gauge (0–100) with the value + label centered. Used for Resume Health
 * now and reused for Path Score later.
 */
export function ScoreGauge({ score = 0, size = 200, label }) {
  const color = scoreColor(score);
  const data = [{ value: score, fill: color }];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background={{ fill: '#1b1f2b' }} dataKey="value" cornerRadius={20} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-extrabold text-ink">{Math.round(score)}</span>
        <span className="text-xs font-medium" style={{ color }}>
          {label ?? scoreLabel(score)}
        </span>
      </div>
    </div>
  );
}
