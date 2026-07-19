/**
 * components/charts/TrendLine.jsx — Line Chart for Metric Over Time
 *
 * Renders a smooth line chart to visualise how a metric has changed across
 * multiple versions or time points.
 *
 * PRIMARY USE CASE:
 *   Resume health score trend — shows how the score improved with each new
 *   resume version the user uploaded (Version 1 → Version 2 → Version 3 …).
 *
 * FLEXIBILITY:
 *   `xKey` and `yKey` props let this same component display any two-dimensional
 *   time-series data without modification. For example:
 *     - Resume versions vs. health scores: { xKey: 'index', yKey: 'score' }
 *     - Weeks vs. tasks completed:         { xKey: 'week', yKey: 'tasks' }
 *
 * PROPS:
 *   data   — array of data point objects, e.g. [{ index: 'v1', score: 52 }, ...]
 *   xKey   — the field name to use as the horizontal axis (default: 'index')
 *   yKey   — the field name to use as the vertical axis (default: 'score')
 *   height — chart pixel height (default 260)
 *   domain — [min, max] for the Y-axis scale (default [0, 100])
 *
 * USAGE:
 *   <TrendLine data={resume.versionHistory} />
 *   <TrendLine data={weeklyData} xKey="week" yKey="tasks" domain={[0, 20]} />
 */

import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CHART, tooltipStyle } from './chartTheme';

/**
 * Line chart for a metric over time.
 * `data`: array of points; `xKey`/`yKey` name the fields to plot.
 */
export function TrendLine({ data, xKey = 'index', yKey = 'score', height = 260, domain = [0, 100] }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      {/* Negative left margin compensates for the hidden Y-axis ticks */}
      <LineChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: -18 }}>

        {/* Horizontal grid lines only — vertical lines removed for cleanliness */}
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />

        {/* X-axis: the category/time dimension (e.g. "v1", "v2", "Week 1") */}
        <XAxis dataKey={xKey} stroke={CHART.axis} tick={{ fontSize: 11 }} tickLine={false} />

        {/* Y-axis: the value dimension (e.g. score 0-100) */}
        <YAxis domain={domain} stroke={CHART.axis} tick={{ fontSize: 11 }} tickLine={false} />

        {/* Tooltip shows the Y value on hover */}
        <Tooltip {...tooltipStyle} />

        {/* The actual line — smooth curve, brand indigo colour, with dots on each point */}
        <Line
          type="monotone"          // smooth interpolation between points
          dataKey={yKey}           // which field to plot on the Y-axis
          stroke={CHART.brand}     // line colour
          strokeWidth={2.5}        // slightly thicker than default for visibility
          dot={{ r: 4, fill: CHART.brand }}     // dot on each data point
          activeDot={{ r: 6 }}                  // larger dot on hover
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
