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
 * Line chart for a metric over time (e.g. resume health per version).
 * `data`: array of points; `xKey`/`yKey` name the fields.
 */
export function TrendLine({ data, xKey = 'index', yKey = 'score', height = 260, domain = [0, 100] }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis dataKey={xKey} stroke={CHART.axis} tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis domain={domain} stroke={CHART.axis} tick={{ fontSize: 11 }} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Line
          type="monotone"
          dataKey={yKey}
          stroke={CHART.brand}
          strokeWidth={2.5}
          dot={{ r: 4, fill: CHART.brand }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
