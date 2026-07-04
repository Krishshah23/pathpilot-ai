import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { CHART, tooltipStyle } from './chartTheme';

/** Horizontal bar chart of Path Score factors. `data`: [{label, percent}]. */
export function FactorBars({ data, height = 260 }) {
  const colorFor = (percent) =>
    percent >= 75 ? CHART.success : percent >= 50 ? CHART.warning : CHART.danger;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} stroke={CHART.axis} tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          stroke={CHART.axis}
          tick={{ fontSize: 11, fill: '#9aa3b6' }}
          tickLine={false}
        />
        <Tooltip {...tooltipStyle} formatter={(value) => [`${value}%`, 'Score']} />
        <Bar dataKey="percent" radius={[0, 6, 6, 0]} barSize={16}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={colorFor(entry.percent)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
