/**
 * components/charts/ScoreGauge.jsx — Radial Score Gauge Chart
 *
 * Renders a circular arc (radial bar) that fills from 0 to a given score (0-100).
 * The score number and a label appear centered inside the ring.
 *
 * Used for: Resume Health score, Path Score — anywhere we show a 0-100 score
 * as a prominent visual indicator rather than just a number.
 *
 * COLOUR THRESHOLDS (shared via scoreColor/scoreLabel helpers):
 *   ≥ 75 → green  (success) → "Strong" / "Excellent"
 *   ≥ 50 → amber  (warning) → "Fair"
 *   < 50 → red    (danger)  → "Needs work"
 *   = 0  →                  → "Unscored"
 *
 * EXPORTED HELPERS (also used by other components):
 *   scoreColor(score) → CSS hex colour string
 *   scoreLabel(score) → human-readable quality label string
 *
 * PROPS (ScoreGauge):
 *   score — number 0-100
 *   size  — pixel size of the square gauge (default 200)
 *   label — override the auto label (optional)
 *
 * USAGE:
 *   <ScoreGauge score={resume.healthScore} size={180} />
 *   <ScoreGauge score={pathScore} label="Your Path Score" />
 */

import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from 'recharts';

/**
 * Returns the correct hex colour for a given 0-100 score.
 * Exported so other components (e.g. FactorBars) can use the same thresholds.
 */
export function scoreColor(score) {
  if (score >= 75) return '#22c55e'; // green  — strong
  if (score >= 50) return '#f59e0b'; // amber  — fair
  return '#ef4444';                  // red    — needs work
}

/**
 * Returns a short quality label for a given score.
 * Shown below the number inside the gauge (unless overridden by `label` prop).
 */
export function scoreLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 75) return 'Strong';
  if (score >= 50) return 'Fair';
  if (score > 0)   return 'Needs work';
  return 'Unscored';
}

/**
 * Radial gauge — a circular arc chart with the score centered inside.
 * Built with Recharts RadialBarChart. The arc fills proportionally to `score / 100`.
 */
export function ScoreGauge({ score = 0, size = 200, label }) {
  const color = scoreColor(score);

  // Recharts RadialBarChart expects `data` as an array.
  // Each element's `value` fills the arc. `fill` sets the arc colour.
  const data = [{ value: score, fill: color }];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* ResponsiveContainer makes the chart fill its parent container */}
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="72%"  // the hole in the middle (72% of total radius)
          outerRadius="100%" // the outer edge of the arc
          data={data}
          startAngle={90}    // start at the top (12 o'clock position)
          endAngle={-270}    // go clockwise all the way around
        >
          {/* PolarAngleAxis defines the scale (0-100) but hides tick marks */}
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />

          {/* The coloured arc — dark grey background track + coloured foreground */}
          <RadialBar background={{ fill: '#1b1f2b' }} dataKey="value" cornerRadius={20} />
        </RadialBarChart>
      </ResponsiveContainer>

      {/* Score number and label, absolutely positioned in the center of the ring */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-extrabold text-ink">
          {Math.round(score)} {/* round to nearest integer */}
        </span>
        <span className="text-xs font-medium" style={{ color }}>
          {label ?? scoreLabel(score)} {/* use custom label or auto-generated one */}
        </span>
      </div>
    </div>
  );
}
