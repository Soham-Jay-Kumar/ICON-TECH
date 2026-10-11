'use client';

import { useId } from 'react';
import { AgentOrbGraphic, sparklePath, type OrbTone } from './agent-orb';

const ART_W = 560;
const ART_H = 460;

const AGENTS: {
  tone: OrbTone;
  x: number;
  y: number;
  size: number;
  glow: string;
}[] = [
  { tone: 'yellow', x: 78, y: 100, size: 62, glow: '#F6A500' },
  { tone: 'pink', x: 432, y: 72, size: 64, glow: '#EA167E' },
  { tone: 'blue', x: 110, y: 285, size: 66, glow: '#2E74CC' },
  { tone: 'orange', x: 402, y: 296, size: 54, glow: '#D65C16' },
];

/**
 * Operations Sense uses a softer network of independent AI agents rather
 * than the orbital system used by the other Sense products. The drawing is
 * kept as SVG so the robot marks stay crisp at every responsive size.
 */
export function OperationsArt({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');

  return (
    <svg
      width={ART_W}
      height={ART_H}
      viewBox={`0 0 ${ART_W} ${ART_H}`}
      aria-hidden
      className={className}
    >
      <defs>
        <radialGradient id={`${id}-mint`} cx="82%" cy="78%" r="58%">
          <stop offset="0" stopColor="#BDE8E4" stopOpacity="0.88" />
          <stop offset="0.58" stopColor="#DDF2EF" stopOpacity="0.48" />
          <stop offset="1" stopColor="#F5FAFA" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-peach`} cx="42%" cy="26%" r="42%">
          <stop offset="0" stopColor="#FFE7D2" stopOpacity="0.74" />
          <stop offset="1" stopColor="#FFF7F1" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-rose`} cx="80%" cy="18%" r="36%">
          <stop offset="0" stopColor="#FCE4EF" stopOpacity="0.72" />
          <stop offset="1" stopColor="#FFF8FB" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF985B" />
          <stop offset="1" stopColor="#EC681D" />
        </linearGradient>
        <filter id={`${id}-blur`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id={`${id}-orb-shadow`} x="-90%" y="-90%" width="280%" height="280%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#17394A" floodOpacity="0.18" />
        </filter>
        <filter id={`${id}-tile-shadow`} x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#B45B2A" floodOpacity="0.24" />
        </filter>
      </defs>

      <rect width={ART_W} height={ART_H} fill={`url(#${id}-peach)`} />
      <rect width={ART_W} height={ART_H} fill={`url(#${id}-rose)`} />
      <rect width={ART_W} height={ART_H} fill={`url(#${id}-mint)`} />

      {/* Soft out-of-focus nodes extend the agent field beyond the four leads. */}
      <g filter={`url(#${id}-blur)`} opacity="0.48">
        <circle cx="157" cy="42" r="15" fill="#58AEB6" />
        <circle cx="27" cy="208" r="12" fill="#7C858B" />
        <circle cx="534" cy="345" r="18" fill="#4A91D0" />
      </g>

      {AGENTS.map((agent) => {
        const scale = agent.size / 130;
        return (
          <g key={agent.tone}>
            <circle
              cx={agent.x + agent.size / 2}
              cy={agent.y + agent.size / 2}
              r={agent.size * 0.72}
              fill={agent.glow}
              opacity="0.2"
              filter={`url(#${id}-blur)`}
            />
            <g transform={`translate(${agent.x} ${agent.y}) scale(${scale})`} filter={`url(#${id}-orb-shadow)`}>
              <AgentOrbGraphic tone={agent.tone} />
            </g>
          </g>
        );
      })}

      <g transform="rotate(-5 317 222)" filter={`url(#${id}-tile-shadow)`}>
        <rect x="242" y="147" width="150" height="150" rx="38" fill={`url(#${id}-tile)`} />
        <path d={sparklePath(317, 222, 38, 38, 0.2)} fill="#fff" />
      </g>
    </svg>
  );
}
