/**
 * The two panel glyphs in the Vision / Mission section.
 *
 * Vision keeps the original raster asset — the artwork is already a circle
 * with a wedge bitten out of it, so rotating it *is* the clock: `steps(12)`
 * makes the gap jump 30° at a time, one tick a second, the way a hand moves
 * rather than sweeping smoothly.
 *
 * Mission had to be redrawn as inline SVG. Its arrow and target are baked
 * into a single flattened PNG, and the strike needs the arrow to move
 * independently of the rings it lands in.
 */

const ORANGE = '#FA8837';

export function VisionGlyph() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/vision-glyph.png"
      alt=""
      aria-hidden
      className="h-full w-full animate-glyph-tick motion-reduce:animate-none"
      draggable={false}
    />
  );
}

/**
 * Concentric arcs + a struck arrow, redrawn to match the original asset.
 *
 * Each ring's gap is placed with `strokeDasharray` alone rather than a
 * rotation: a dash of exactly ¾ of the circumference runs from 3 o'clock
 * clockwise to 12 o'clock, which leaves the gap sitting in the upper-right
 * quadrant — where the arrow enters.
 */
export function MissionGlyph() {
  const outerR = 21;
  const innerR = 11.5;
  const dash = (r: number) => {
    const c = 2 * Math.PI * r;
    return `${(c * 0.75).toFixed(2)} ${(c * 0.25).toFixed(2)}`;
  };

  return (
    <svg viewBox="0 0 60 60" fill="none" className="h-full w-full" aria-hidden>
      <g
        className="animate-target-pulse motion-reduce:animate-none"
        style={{ transformOrigin: '30px 30px', transformBox: 'view-box' }}
      >
        <circle
          cx="30"
          cy="30"
          r={outerR}
          stroke={ORANGE}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={dash(outerR)}
        />
        <circle
          cx="30"
          cy="30"
          r={innerR}
          stroke={ORANGE}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={dash(innerR)}
        />
      </g>

      <circle cx="30" cy="30" r="3.2" fill={ORANGE} />

      {/* Shaft + flight, travelling as one group along its own axis. */}
      <g
        className="animate-arrow-strike motion-reduce:animate-none"
        style={{ transformOrigin: '30px 30px', transformBox: 'view-box' }}
      >
        <path
          d="M30 30 L46 14"
          stroke={ORANGE}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M38.5 13.5 L46.5 13.5 L46.5 21.5"
          stroke={ORANGE}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
