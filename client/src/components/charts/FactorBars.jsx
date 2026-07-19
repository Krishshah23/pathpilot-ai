/**
 * components/charts/FactorBars.jsx — Horizontal Bar Chart for Path Score Factors
 *
 * Renders a horizontal bar chart where each bar represents one factor that
 * contributes to the student's overall Path Score (e.g. "Resume Health", "Skills").
 *
 * WHY HORIZONTAL (instead of vertical)?
 *   Factor names are long strings. Horizontal layout lets the label sit on the
 *   left side (the Y-axis) with plenty of room, while the bar grows rightward.
 *
 * COLOUR CODING:
 *   Each bar is coloured individually based on its percentage:
 *     ≥ 75% → green  (good)
 *     ≥ 50% → amber  (fair)
 *     <  50% → red   (needs work)
 *
 * PROPS:
 *   data   — array of { label: string, percent: number } objects
 *            e.g. [{ label: 'Resume Health', percent: 72 }, ...]
 *   height — chart pixel height (default 260)
 *
 * USAGE:
 *   <FactorBars data={pathScore.factors} />
 *   <FactorBars data={factors} height={300} />
 */

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell, // Cell lets us set a different fill colour per bar
} from 'recharts';
import { CHART, tooltipStyle } from './chartTheme';

/** Horizontal bar chart of Path Score factors. `data`: [{label, percent}]. */
export function FactorBars({ data, height = 260 }) {
  /**
   * Returns the appropriate bar colour for a given percentage.
   * Uses the shared thresholds from chartTheme.
   */
  const colorFor = (percent) =>
    percent >= 75 ? CHART.success : percent >= 50 ? CHART.warning : CHART.danger;

  return (
    // ResponsiveContainer makes the chart fill 100% of its parent's width
    <ResponsiveContainer width="100%" height={height}>
      {/* layout="vertical" makes bars grow left-to-right instead of bottom-to-top */}
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>

        {/* Vertical gridlines to help read values — horizontal lines hidden */}
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />

        {/* X-axis (numbers 0-100) shown at the bottom */}
        <XAxis type="number" domain={[0, 100]} stroke={CHART.axis} tick={{ fontSize: 11 }} tickLine={false} />

        {/* Y-axis shows factor names on the left side; width=120 gives room for long labels */}
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          stroke={CHART.axis}
          tick={{ fontSize: 11, fill: '#9aa3b6' }}
          tickLine={false}
        />

        {/* Tooltip appears on hover: shows "72%" and "Score" */}
        <Tooltip {...tooltipStyle} formatter={(value) => [`${value}%`, 'Score']} />

        {/* The actual bars — each bar gets its colour from Cell based on its percent */}
        <Bar dataKey="percent" radius={[0, 6, 6, 0]} barSize={16}>
          {data.map((entry) => (
            // Cell overrides the fill for each individual bar
            <Cell key={entry.label} fill={colorFor(entry.percent)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
