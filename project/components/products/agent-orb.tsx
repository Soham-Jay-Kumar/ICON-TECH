'use client';

import { useId } from 'react';

/**
 * Body colour of each agent sphere, sampled from the flat centre of each orb
 * in the Products design (the gloss and shading sit on top of these).
 */
export const ORB_TONES = {
  blue: '#2163B9',
  orange: '#C1501A',
  graphite: '#3F3F3F',
  teal: '#178A9A',
  yellow: '#F2A000',
  pink: '#DC0875',
} as const;

export type OrbTone = keyof typeof ORB_TONES;

/** A concave four-point sparkle centred on (cx, cy). `k` sets how pinched the arms are. */
export function sparklePath(cx: number, cy: number, w: number, h: number, k = 0.25) {
  const cw = w * k;
  const ch = h * k;
  return [
    `M${cx} ${cy - h}`,
    `Q${cx + cw} ${cy - ch} ${cx + w} ${cy}`,
    `Q${cx + cw} ${cy + ch} ${cx} ${cy + h}`,
    `Q${cx - cw} ${cy + ch} ${cx - w} ${cy}`,
    `Q${cx - cw} ${cy - ch} ${cx} ${cy - h}Z`,
  ].join('');
}

/**
 * The agent sphere — a glossy ball carrying the white VR-goggles mark and two
 * sparkles — drawn in a 130×130 box (the design's largest orb is 130px
 * across). Rendered as a <g> so the orbit artwork can place it inside its own
 * SVG; `<AgentOrb>` below wraps it for standalone use.
 */
export function AgentOrbGraphic({ tone }: { tone: OrbTone }) {
  const id = useId().replace(/:/g, '');
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-shade`} cx="0.68" cy="0.28" r="0.85">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.1" />
        </radialGradient>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>
      <circle cx="65" cy="65" r="65" fill={ORB_TONES[tone]} />
      <circle cx="65" cy="65" r="65" fill={`url(#${id}-shade)`} />
      {/* Specular streak hugging the upper-right rim. */}
      <path
        d="M78 14 Q100 16 112 30"
        fill="none"
        stroke="#fff"
        strokeWidth="9"
        strokeLinecap="round"
        opacity="0.55"
        filter={`url(#${id}-soft)`}
      />
      {/* The mark's geometry is traced from the 130px blue orb in the design. */}
      <g fill="#fff">
        <path d={sparklePath(40, 36.5, 8, 7.5)} />
        <path d={sparklePath(30.5, 25.5, 4, 4)} />
        {/* Ear pieces */}
        <rect x="18" y="69" width="4.5" height="13.5" rx="2.25" />
        <rect x="108.5" y="69" width="4.5" height="13.5" rx="2.25" />
        {/* Nose rest */}
        <path d="M56 101 L66 93 L76 101Z" />
      </g>
      <g fill="none" stroke="#fff" strokeLinejoin="round" strokeLinecap="round">
        {/* Strap band over the frame */}
        <path
          d="M39.5 61V57Q39.5 53 43.5 53H96.5Q100.5 53 100.5 57V61"
          strokeWidth="4"
        />
        {/* Lens frame with the nose bridge cut into its lower edge */}
        <path
          d="M37 62H94Q104 62 104 72V82.5Q104 92.5 94 92.5H77Q74.5 92.5 73 90L68 82Q65.5 78.5 63 82L58 90Q56.5 92.5 54 92.5H37Q27 92.5 27 82.5V72Q27 62 37 62Z"
          strokeWidth="5.5"
        />
      </g>
    </g>
  );
}

export function AgentOrb({
  tone,
  className,
  style,
}: {
  tone: OrbTone;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 130 130"
      aria-hidden
      className={className}
      style={style}
    >
      <AgentOrbGraphic tone={tone} />
    </svg>
  );
}
