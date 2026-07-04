/* Shared Recharts styling tokens so all charts match the dark theme. */
export const CHART = {
  grid: '#232838',
  axis: '#626b80',
  brand: '#818cf8',
  violet: '#8b5cf6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

/** Consistent tooltip look across charts. */
export const tooltipStyle = {
  contentStyle: {
    background: '#151823',
    border: '1px solid #232838',
    borderRadius: 12,
    color: '#f4f6fb',
    fontSize: 12,
  },
  labelStyle: { color: '#9aa3b6' },
  itemStyle: { color: '#f4f6fb' },
  cursor: { fill: 'rgba(99,102,241,0.08)' },
};
