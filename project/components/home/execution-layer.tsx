'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Container } from '@/components/site/section';
import { PauseOffscreen } from '@/components/site/pause-offscreen';
import { ShipWake } from '@/components/home/ship-wake';

/**
 * The hero's closing statement, lifted out of the hero into its own moment
 * directly below the ship image — reimagined as a dark "execution deck".
 *
 * This is the site's one kinetic-type showcase (cinematic register) and a
 * deliberate dark seam between the white hero above and the white About band
 * below: deep navy, a dot field, faint sonar rings and the site's signature
 * radar sweep loop behind an editorial pull-quote that wipes up line by line.
 *
 * Emphasis on the anchor phrases ("enterprise intelligence", "executed
 * action") is carried by weight + brightness alone — no coloured marker. Along
 * the foot a ship crosses the band's horizon, left to right, on a slow loop —
 * the maritime motif standing in for the old marker; the terminal full stop
 * keeps the one orange accent.
 *
 * Built entirely on the shared motion tokens (`duration-cinematic`/`ease-cine`,
 * `.radar-sweep-anim`) — nothing hardcodes a raw ms/bezier. Honours reduced
 * motion (everything lands instantly, loops freeze) and never gates content on
 * JS: lines render fully visible until the client confirms it can animate them
 * (`armed`). Ambient loops sit inside PauseOffscreen so they stop compositing
 * off-screen.
 */

// The statement, unchanged in wording, broken into three deliberate lines.
// Each segment carries an `on` flag: emphasised (bright/heavy) vs supporting
// (dimmer/lighter) — the sentence's hierarchy without a highlight.
type Seg = { t: string; on?: boolean };
const LINES: Seg[][] = [
  [{ t: 'Starting with maritime, Icon Tech turns' }],
  [
    { t: 'enterprise intelligence', on: true },
    { t: ' into ' },
    { t: 'executed action', on: true },
  ],
  [{ t: '— building the AI layer that gets work done' }],
];

// A patient stagger between lines — this is the cinematic tier, not UI.
const LINE_STEP = 140;

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** One line inside its own clipped frame, wiping up into place. */
function Line({
  segments,
  index,
  hidden,
  last,
}: {
  segments: Seg[];
  index: number;
  hidden: boolean;
  last: boolean;
}) {
  return (
    // pb/-mb pair gives descenders room inside the clip without changing the
    // line box, so nothing is shaved at rest or mid-wipe.
    <span className="block overflow-hidden pb-[0.12em] -mb-[0.12em]">
      <span
        className="block will-change-transform transition-[transform,opacity,filter] duration-cinematic ease-cine"
        style={{
          transform: hidden ? 'translateY(112%)' : 'translateY(0)',
          opacity: hidden ? 0 : 1,
          // A soft blur that clears as the line settles, so the type resolves
          // into focus rather than simply sliding — a more cinematic entrance
          // that reads alongside the ship's motion.
          filter: hidden ? 'blur(10px)' : 'blur(0px)',
          transitionDelay: `${index * LINE_STEP}ms`,
        }}
      >
        {segments.map((s, i) =>
          s.on ? (
            <span key={i} className="font-semibold text-white">
              {s.t}
            </span>
          ) : (
            <span key={i} className="text-navy-200/90">
              {s.t}
            </span>
          )
        )}
        {last && <span className="text-brand-500">.</span>}
      </span>
    </span>
  );
}

export function ExecutionLayer() {
  const ref = useRef<HTMLDivElement>(null);
  // The sailing ship's own element — the wake emitter reads its live box each
  // frame to find where the propeller currently is.
  const shipRef = useRef<HTMLImageElement>(null);
  // `armed` = the client has mounted and may hide lines for the reveal. Until
  // then (and if JS never runs) content renders visible, so nothing is gated
  // on JS. `visible` flips once the band scrolls into view.
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    setArmed(true);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3, rootMargin: '0px 0px -80px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const hidden = armed && !visible;

  return (
    <section
      data-shot="execution-layer"
      className="relative overflow-hidden bg-navy-950 py-28 md:py-44"
      style={{
        backgroundImage:
          'radial-gradient(120% 120% at 82% 18%, #12324a 0%, #0b2438 46%, #081b29 100%)',
      }}
    >
      {/* Dot field — the faint texture used across the dark surfaces. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-dots-dark opacity-70" />

      {/* Signature radar sweep + sonar rings, anchored off the right edge.
          The site's one ambient loop; frozen off-screen and under reduced
          motion. Hidden on small screens where it would crowd the type. */}
      <PauseOffscreen
        aria-hidden
        className="pointer-events-none absolute right-[-18%] top-1/2 hidden -translate-y-1/2 md:block lg:right-[-8%]"
      >
        <div className="relative h-[820px] w-[820px]">
          <div
            className="radar-sweep-anim absolute inset-0 rounded-full opacity-[0.14]"
            style={
              {
                '--radar-duration': '20s',
                background:
                  'conic-gradient(from 0deg, transparent 0deg, transparent 296deg, rgba(47,160,152,0) 316deg, rgba(47,160,152,0.6) 360deg)',
                WebkitMaskImage: 'radial-gradient(closest-side, #000 38%, transparent 76%)',
                maskImage: 'radial-gradient(closest-side, #000 38%, transparent 76%)',
              } as React.CSSProperties
            }
          />
          <div className="absolute inset-[6%] rounded-full border border-teal-400/10" />
          <div className="absolute inset-[24%] rounded-full border border-teal-400/[0.08]" />
          <div className="absolute inset-[42%] rounded-full border border-teal-400/[0.06]" />
          <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400/40" />
        </div>
      </PauseOffscreen>

      {/* Top and bottom hairlines fade the dark band into the white sections
          it sits between, so the seam reads as intentional, not a hard cut. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-navy-100/12 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-navy-100/12 to-transparent"
      />

      <Container className="relative">
        <div ref={ref} className="max-w-[1000px]">
          {/* The statement. Base tone is a soft navy-white; anchor phrases lift
              to pure white. Left-aligned for a confident, command-deck read. */}
          <p className="text-[clamp(1.85rem,4.6vw,3.75rem)] font-medium leading-[1.16] tracking-[-0.024em] text-navy-100">
            {LINES.map((segs, i) => (
              <Line
                key={i}
                segments={segs}
                index={i}
                hidden={hidden}
                last={i === LINES.length - 1}
              />
            ))}
          </p>

        </div>
      </Container>

      {/* The vessel: the little top-down cargo ship from the foot of the site's
          footer, replicated here on the execution deck. It sails the dark
          band's horizon from left to right on a slow loop while its propeller
          lays a wake — a stream of white particles thrown off the stern that
          hang in the water, spread, and dissolve as the hull pulls away. The
          ship art (public/images/exec-ship.png) is the same sprite lifted from
          the footer panel, so bow, hull and the teal propeller-wash read
          identically.

          The wake canvas is deliberately a *sibling* of the sailing group, not
          a child: it sits in the band's own coordinate space, so the particles
          it emits are never carried along by the ship's transform — the ship
          leaves them behind. See ship-wake.tsx.

          Hidden on small screens where it would crowd the type; frozen
          off-screen and under reduced motion (where the inline transform below
          parks the group at a visible resting position and the wake resolves
          to a single still frame). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[9%] hidden h-[40px] md:block"
      >
        <ShipWake shipRef={shipRef} />
        <PauseOffscreen className="absolute inset-0">
          {/* The inline transform is the reduced-motion resting position (the
              CSS loop overrides it whenever it runs). It has to be *negative*:
              the ship sits at the group's right edge, so a positive offset
              parks it past the right side of the screen where it cannot be
              seen. -26vw leaves it a little right of centre, mid-passage. */}
          <div
            className="ship-sail-anim relative h-[40px]"
            style={{ transform: 'translateX(-26vw)' } as React.CSSProperties}
          >
            {/* The ship at the head of the wake, bow to the right. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={shipRef}
              src="/images/exec-ship.png"
              alt=""
              aria-hidden
              draggable={false}
              className="absolute right-0 top-1/2 block h-auto w-[96px] lg:w-[112px] -translate-y-1/2 select-none opacity-90"
            />
          </div>
        </PauseOffscreen>
      </div>
    </section>
  );
}
