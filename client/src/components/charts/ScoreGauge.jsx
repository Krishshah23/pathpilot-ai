/**
 * components/charts/ScoreGauge.jsx — Matte Radial Score Gauge
 *
 * Renders a circular arc with:
 * - Conic/Linear gradient stroke (--color-brand to --color-brand-soft, or warning/danger variants)
 * - 10 tick marks around the ring (every 10 units) in --color-line
 * - Smooth framer-motion arc animation on mount
 * - metric-glow effect on the centered score number
 */

import { motion } from 'framer-motion';

export function scoreColor(score) {
  if (score >= 75) return '#2B4C3F'; // brand forest green
  if (score >= 50) return '#92400E'; // warning amber
  return '#B85A3C';                  // danger rust
}

export function scoreLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 75) return 'Strong';
  if (score >= 50) return 'Fair';
  if (score > 0)   return 'Needs work';
  return 'Unscored';
}

export function ScoreGauge({ score = 0, size = 180, label }) {
  const safeScore = Math.min(100, Math.max(0, score));
  const color = scoreColor(safeScore);
  const colorSoft = safeScore >= 75 ? '#3D6B59' : safeScore >= 50 ? '#D97706' : '#DC2626';

  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2 - 16) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference * (1 - safeScore / 100);

  // Generate 10 tick marks around the ring (every 36 degrees = 10 units)
  const ticks = Array.from({ length: 10 }).map((_, i) => {
    const angleDeg = i * 36 - 90; // Start top
    const angleRad = (angleDeg * Math.PI) / 180;
    const tickRadiusOuter = radius + 6;
    const tickRadiusInner = radius - 4;
    const x1 = center + tickRadiusInner * Math.cos(angleRad);
    const y1 = center + tickRadiusInner * Math.sin(angleRad);
    const x2 = center + tickRadiusOuter * Math.cos(angleRad);
    const y2 = center + tickRadiusOuter * Math.sin(angleRad);
    return { id: i, x1, y1, x2, y2 };
  });

  const gradientId = `score-gauge-gradient-${Math.round(safeScore)}`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={colorSoft} />
          </linearGradient>
        </defs>

        {/* Track Ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#EAEAE5"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />

        {/* 10 Precision Tick Marks */}
        {ticks.map((t) => (
          <line
            key={t.id}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="#D0D0CA"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ))}

        {/* Animated Gradient Arc */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: targetOffset }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>

      {/* Centered Score Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="metric-glow flex flex-col items-center justify-center">
          <span className="font-serif text-3xl sm:text-4xl font-extrabold text-[#171717] animate-count-up leading-none">
            {Math.round(safeScore)}
          </span>
          <span className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-wider mt-1">
            /100
          </span>
        </div>
        <span className="text-xs font-semibold mt-1" style={{ color }}>
          {label ?? scoreLabel(safeScore)}
        </span>
      </div>
    </div>
  );
}
