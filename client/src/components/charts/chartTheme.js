/**
 * components/charts/chartTheme.js — Shared Chart Styling Tokens
 *
 * A single source of truth for all Recharts colour and style values.
 * By importing from here, all charts automatically match each other and
 * the app's dark theme. Changing a colour here updates every chart at once.
 *
 * CONTENTS:
 *   CHART        — colour tokens (grid lines, axis labels, data colours)
 *   tooltipStyle — consistent tooltip appearance across all chart types
 *
 * HOW TO USE:
 *   import { CHART, tooltipStyle } from './chartTheme';
 *
 *   // Use a colour token as a stroke/fill value
 *   <Line stroke={CHART.brand} />
 *   <Bar fill={CHART.success} />
 *
 *   // Spread the tooltip style onto a Recharts <Tooltip> component
 *   <Tooltip {...tooltipStyle} />
 */

/** Colour tokens matching the dark dashboard theme */
export const CHART = {
  grid:    '#232838', // subtle gridline colour — very dark blue-grey
  axis:    '#626b80', // axis tick labels and axis line colour
  brand:   '#818cf8', // indigo — primary data line colour (resume scores over time)
  violet:  '#8b5cf6', // purple — skill radar chart fill
  success: '#22c55e', // green  — scores >= 75%
  warning: '#f59e0b', // amber  — scores 50-74%
  danger:  '#ef4444', // red    — scores < 50%
};

/**
 * Consistent tooltip styling for all Recharts charts.
 * Spread this object onto any <Tooltip> component:
 *   <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, 'Score']} />
 */
export const tooltipStyle = {
  contentStyle: {
    background: '#151823',   // dark panel background
    border: '1px solid #232838',
    borderRadius: 12,
    color: '#f4f6fb',        // light text inside tooltip
    fontSize: 12,
  },
  labelStyle: { color: '#9aa3b6' },   // x-axis label inside tooltip (e.g. "Week 1")
  itemStyle:  { color: '#f4f6fb' },   // data value inside tooltip
  cursor: { fill: 'rgba(99,102,241,0.08)' }, // faint hover column highlight
};
