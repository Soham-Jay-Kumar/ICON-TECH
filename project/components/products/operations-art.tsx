'use client';

import { useId } from 'react';
import { AgentOrbGraphic, sparklePath, type OrbTone } from './agent-orb';

const ART_W = 560;
const ART_H = 460;

/** Centre of the orange star tile: the cluster's pivot. */
const STAR_X = 317;
const STAR_Y = 222;

/**
 * The whole cluster — washes, glows, agents and tile — is drawn smaller than
 * the design about the star tile's centre, so the star stays put and the
 * agents close in on it. At full size the yellow agent sat ~7px from the end
 * of the heading ("…operations intelligence"). 0.87 is the smallest reduction
 * that holds 32px of clear space between the copy and the nearest agent at
 * every `lg` width: the gap grows with --u, so 1024px is the tight case
 * (32.5px there; 0.88 gave 30.3px). Measured 1024, 1280 and 1440.
 */
const ART_SCALE = 0.87;

/**
 * The three background washes, as user-space ellipses equal to the
 * `objectBoundingBox` gradients they replaced on a full-art rect (centre and
 * radius as fractions of 560×460). In user space they scale with the cluster
 * while their rect is oversized, so the wash still runs to the card's edges
 * instead of stopping at a hard line once the cluster shrinks.
 */
function washProps(fx: number, fy: number, fr: number) {
  const cx = fx * ART_W;
  const cy = fy * ART_H;
  return {
    gradientUnits: 'userSpaceOnUse' as const,
    cx,
    cy,
    r: fr * ART_W,
    gradientTransform: `translate(${cx} ${cy}) scale(1 ${ART_H / ART_W}) translate(${-cx} ${-cy})`,
  };
}

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
        <radialGradient id={`${id}-mint`} {...washProps(0.82, 0.78, 0.58)}>
          <stop offset="0" stopColor="#BDE8E4" stopOpacity="0.88" />
          <stop offset="0.58" stopColor="#DDF2EF" stopOpacity="0.48" />
          <stop offset="1" stopColor="#F5FAFA" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-peach`} {...washProps(0.42, 0.26, 0.42)}>
          <stop offset="0" stopColor="#FFE7D2" stopOpacity="0.74" />
          <stop offset="1" stopColor="#FFF7F1" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-rose`} {...washProps(0.8, 0.18, 0.36)}>
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

      <g transform={`translate(${STAR_X} ${STAR_Y}) scale(${ART_SCALE}) translate(${-STAR_X} ${-STAR_Y})`}>
        {[`${id}-peach`, `${id}-rose`, `${id}-mint`].map((wash) => (
          <rect key={wash} x={-ART_W} y={-ART_H} width={ART_W * 3} height={ART_H * 3} fill={`url(#${wash})`} />
        ))}

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

        <g transform={`rotate(-5 ${STAR_X} ${STAR_Y})`} filter={`url(#${id}-tile-shadow)`}>
          <rect x={STAR_X - 75} y={STAR_Y - 75} width="150" height="150" rx="38" fill={`url(#${id}-tile)`} />
          <path d={sparklePath(STAR_X, STAR_Y, 38, 38, 0.2)} fill="#fff" />
        </g>
      </g>
    </svg>
  );
}
