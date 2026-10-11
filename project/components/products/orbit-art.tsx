'use client';

import { useId } from 'react';
import { AgentOrbGraphic, sparklePath, type OrbTone } from './agent-orb';

/**
 * Every coordinate in this file is measured off the Products design and is
 * relative to the product card's bottom-right corner, which is the origin of
 * the SVG below: x runs negative to the left, y negative upwards. Anchoring
 * there keeps the composition hugging the corner whatever the card's width.
 */
const ART_W = 560;
const ART_H = 460;

// Orbit rings: concentric on the corner itself, as circle-fitted in the design.
const ORBIT_RADII = [450, 333, 216.5];

// Agent spheres riding the rings: centre and diameter.
const ORBS: { tone: OrbTone; cx: number; cy: number; d: number }[] = [
  { tone: 'graphite', cx: -388, cy: -234.5, d: 39 },
  { tone: 'blue', cx: -149.5, cy: -294, d: 48 },
  { tone: 'orange', cx: -34.5, cy: -219, d: 40 },
  { tone: 'teal', cx: -320.5, cy: -100.5, d: 48 },
];

/**
 * The large Sense orb: a pale halo, the teal sphere with an orange core behind
 * a small star, a specular streak, and a large white star rising into it from
 * below. Drawn in its original 2556×1358 artboard, whose bottom-right corner
 * (2556, 1358) the transform puts on the origin; the design shows it at 0.274
 * of that size.
 */
function SenseOrb({ id }: { id: string }) {
  return (
    <g transform="scale(0.274) translate(-2556 -1358)">
      <defs>
        <radialGradient id={`${id}-sphere`} gradientUnits="userSpaceOnUse" cx="2520" cy="1120" r="500">
          <stop offset="0" stopColor="#45C2C0" />
          <stop offset="0.3" stopColor="#22A3A6" />
          <stop offset="0.62" stopColor="#0F888E" />
          <stop offset="1" stopColor="#09757C" />
        </radialGradient>
        <radialGradient id={`${id}-glow`} gradientUnits="userSpaceOnUse" cx="2233" cy="1250" r="160">
          <stop offset="0" stopColor="#E0621A" />
          <stop offset="0.36" stopColor="#C85B1C" />
          <stop offset="0.6" stopColor="#875C33" stopOpacity="0.85" />
          <stop offset="0.82" stopColor="#2F6F68" stopOpacity="0.4" />
          <stop offset="1" stopColor="#127C82" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-halo`} gradientUnits="userSpaceOnUse" cx="2323" cy="1352" r="382">
          <stop offset="0.75" stopColor="#EEF4F5" />
          <stop offset="1" stopColor="#F3F7F8" />
        </radialGradient>
        <filter id={`${id}-blur`} x="-50%" y="-100%" width="200%" height="300%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <clipPath id={`${id}-clip`}>
          <circle cx="2335" cy="1360" r="303" />
        </clipPath>
      </defs>
      <circle cx="2323" cy="1352" r="382" fill={`url(#${id}-halo)`} />
      {/* The sphere's rim is soft in the design, so it is blurred outside the clip. */}
      <circle cx="2335" cy="1360" r="303" fill={`url(#${id}-sphere)`} filter={`url(#${id}-soft)`} />
      <g clipPath={`url(#${id}-clip)`}>
        <circle cx="2233" cy="1250" r="160" fill={`url(#${id}-glow)`} />
        <path
          d="M2312 1134 Q2452 1150 2552 1262"
          fill="none"
          stroke="#F2FAFA"
          strokeWidth="34"
          strokeLinecap="round"
          opacity="0.95"
          filter={`url(#${id}-blur)`}
        />
      </g>
      <g fill="#fff">
        <path d={sparklePath(2233, 1250, 58, 50)} />
        <path d={sparklePath(2370, 1425, 174, 147, 0.18)} />
      </g>
    </g>
  );
}

/**
 * The decorative half of the product card: orbit rings, the four agent
 * spheres and the Sense orb, at the design's own pixel size. Place it
 * absolutely at the card's bottom-right; the card clips whatever overhangs.
 */
export function OrbitArt({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      width={ART_W}
      height={ART_H}
      viewBox={`${-ART_W} ${-ART_H} ${ART_W} ${ART_H}`}
      aria-hidden
      className={className}
    >
      <g fill="none" stroke="#D6E5EB" strokeWidth="1">
        {ORBIT_RADII.map((r) => (
          <circle key={r} cx="0" cy="0" r={r} />
        ))}
      </g>
      <SenseOrb id={id} />
      {ORBS.map((o) => (
        <g
          key={o.tone}
          transform={`translate(${o.cx - o.d / 2} ${o.cy - o.d / 2}) scale(${o.d / 130})`}
        >
          <AgentOrbGraphic tone={o.tone} />
        </g>
      ))}
    </svg>
  );
}
