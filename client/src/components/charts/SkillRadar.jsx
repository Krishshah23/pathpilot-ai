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
        <PolarGrid stroke={CHART.grid} />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fill: '#9aa3b6', fontSize: 11 }}
        />
        <Radar
          name="Skills"
          dataKey="count"
          stroke={CHART.violet}
          fill={CHART.violet}
          fillOpacity={0.35}
        />
        <Tooltip {...tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
