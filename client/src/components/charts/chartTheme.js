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

/**
 * Colour tokens matching PathPilot's matte editorial design system.
 * Values reference the CSS custom properties from index.css (--color-*) so
 * charts automatically follow the light/dark theme toggle (ThemeContext) —
 * no separate dark-mode chart theme needed.
 */
export const CHART = {
  grid:    'var(--color-line)',   // gridlines — warm/dark border colour depending on theme
  axis:    'var(--color-faint)',  // axis tick labels
  brand:   'var(--color-brand)',  // forest green — primary data colour (brand, constant across themes)
  violet:  'var(--color-brand)',  // alias — kept for API compatibility with existing chart props
  success: 'var(--color-brand)',  // scores >= 75%
  warning: 'var(--color-warning)',// scores 50-74%
  danger:  'var(--color-danger)', // scores < 50%
};

/**
 * Consistent tooltip styling for all Recharts charts.
 * Spread this object onto any <Tooltip> component:
 *   <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, 'Score']} />
 */
export const tooltipStyle = {
  contentStyle: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-line)',
    borderRadius: 12,
    color: 'var(--color-ink)',
    fontSize: 12,
  },
  labelStyle: { color: 'var(--color-muted)' },
  itemStyle:  { color: 'var(--color-ink)' },
  cursor: { fill: 'rgba(5,150,105,0.08)' }, // faint brand-green hover column highlight
};
