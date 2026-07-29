import { useId } from 'react';

const AGENTS = [
  { id: 'audit', name: 'Audit Agent', role: 'Career Analysis', angle: 0, status: 'Active' },
  { id: 'interview', name: 'Coach Agent', role: 'Mock Interviews', angle: 60, status: 'Active' },
  { id: 'builder', name: 'Resume Agent', role: 'ATS & Content', angle: 120, status: 'Active' },
  { id: 'bench', name: 'Peer Agent', role: 'Benchmarking', angle: 180, status: 'Active' },
  { id: 'roadmap', name: 'Roadmap Agent', role: 'Skill Paths', angle: 240, status: 'Active' },
  { id: 'exec', name: 'Engine Agent', role: 'Execution', angle: 300, status: 'Active' },
];

export default function AgentConstellation({ size = 280 }) {
  const gradientId = useId();
  const radius = size * 0.38;
  const center = size / 2;

  return (
    <div className="relative flex items-center justify-center mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#34D399" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Orbit rings */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#1E2530" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx={center} cy={center} r={radius * 0.55} fill="none" stroke="#1E2530" strokeWidth="1" />

        {/* Radial glow */}
        <circle cx={center} cy={center} r={radius * 0.7} fill={`url(#${gradientId})`} />

        {/* Radar Sweep line */}
        <g style={{ transformOrigin: `${center}px ${center}px` }} className="radar-sweep">
          <line x1={center} y1={center} x2={center} y2={center - radius} stroke="#34D399" strokeWidth="1.5" strokeOpacity="0.6" />
          <polygon
            points={`${center},${center} ${center - radius * 0.4},${center - radius} ${center},${center - radius}`}
            fill="#34D399"
            fillOpacity="0.1"
          />
        </g>

        {/* Spokes */}
        {AGENTS.map((agent) => {
          const rad = (agent.angle * Math.PI) / 180;
          const x = center + radius * Math.cos(rad);
          const y = center + radius * Math.sin(rad);
          return (
            <line
              key={agent.id}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#1E2530"
              strokeWidth="1"
            />
          );
        })}

        {/* Center core */}
        <circle cx={center} cy={center} r={18} fill="#11151C" stroke="#34D399" strokeWidth="2" className="radar-core-ping" />
        <text
          x={center}
          y={center + 4}
          textAnchor="middle"
          fill="#34D399"
          className="font-mono text-[10px] font-extrabold tracking-tight"
        >
          CORE
        </text>

        {/* Orbital Agent Nodes */}
        {AGENTS.map((agent) => {
          const rad = (agent.angle * Math.PI) / 180;
          const x = center + radius * Math.cos(rad);
          const y = center + radius * Math.sin(rad);

          return (
            <g key={agent.id} transform={`translate(${x}, ${y})`}>
              <circle r={12} fill="#11151C" stroke="#34D399" strokeWidth="1.5" />
              <circle r={3} fill="#34D399" />
              <text
                x={0}
                y={y > center ? 22 : -16}
                textAnchor="middle"
                fill="#8B95A1"
                className="font-mono text-[9px] font-semibold tracking-wider uppercase"
              >
                {agent.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
