/**
 * components/charts/ScoreHistogram.jsx — Peer Score Distribution Bar Chart
 *
 * Renders a vertical bar chart of how many peers fall into each Path Score
 * range (0-20, 21-40, ..., 81-100). The bucket the current user falls into
 * is highlighted in brand green; every other bucket is a muted neutral so
 * the user's own position stands out at a glance.
 *
 * PROPS:
 *   data       — array of { range: string, count: number }
 *   yourBucket — the range key the current user's score falls into (e.g. '61-80')
 *   height     — chart pixel height (default 220)
 *
 * USAGE:
 *   <ScoreHistogram data={benchmark.histogram} yourBucket={benchmark.yourBucket} />
 */

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { CHART, tooltipStyle } from './chartTheme';

export function ScoreHistogram({ data, yourBucket, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="range" stroke={CHART.axis} tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis allowDecimals={false} stroke={CHART.axis} tick={{ fontSize: 11 }} tickLine={false} />
        <Tooltip {...tooltipStyle} formatter={(value) => [`${value} student${value === 1 ? '' : 's'}`, 'Peers']} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={32}>
          {data.map((entry) => (
            <Cell key={entry.range} fill={entry.range === yourBucket ? CHART.brand : 'var(--color-surface-2)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
