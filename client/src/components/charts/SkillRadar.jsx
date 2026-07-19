/**
 * components/charts/SkillRadar.jsx — Skill Distribution Radar Chart
 *
 * Renders a spider/radar chart that shows the user's skill distribution
 * across different categories (e.g. Frontend, Backend, DevOps, Data Science).
 *
 * HOW A RADAR CHART WORKS:
 *   - Each category gets one "spoke" radiating from the center.
 *   - The polygon is drawn by connecting a point on each spoke proportional
 *     to the skill count for that category.
 *   - A larger area means the user is stronger / more diverse in that category.
 *
 * This gives an at-a-glance view of the user's technical breadth.
 * For example: a full-stack developer would have a roughly even polygon across
 * Frontend and Backend spokes, while a specialist would have one dominant axis.
 *
 * PROPS:
 *   data   — array of { category: string, count: number }
 *            e.g. [{ category: 'Frontend', count: 4 }, { category: 'Backend', count: 2 }]
 *   height — chart pixel height (default 300)
 *
 * USAGE:
 *   <SkillRadar data={resume.skillCategories} />
 *   <SkillRadar data={skillBreakdown} height={250} />
 */

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { CHART, tooltipStyle } from './chartTheme';

/** Skill distribution radar across skill categories. `data`: [{category, count}]. */
export function SkillRadar({ data, height = 300 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        {/* The concentric polygonal grid lines behind the data */}
        <PolarGrid stroke={CHART.grid} />

        {/* Category labels around the outside of the radar */}
        <PolarAngleAxis
          dataKey="category"
          tick={{ fill: '#9aa3b6', fontSize: 11 }}
        />

        {/* The filled polygon — violet colour with 35% opacity fill */}
        <Radar
          name="Skills"
          dataKey="count"          // which property from `data` to plot
          stroke={CHART.violet}    // outline colour
          fill={CHART.violet}      // fill colour
          fillOpacity={0.35}       // semi-transparent so the grid shows through
        />

        {/* Tooltip appears on hover showing category name + count */}
        <Tooltip {...tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
