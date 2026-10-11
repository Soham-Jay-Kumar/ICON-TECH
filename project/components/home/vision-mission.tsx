'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Reveal } from '@/components/site/reveal';
import { VisionGlyph, MissionGlyph } from '@/components/home/vision-mission-glyphs';
import { PauseOffscreen } from '@/components/site/pause-offscreen';

const RINGS = [104, 80, 54];
const ICON_CY = 188;

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function VisionRings() {
  return (
    // Positioning lives on this wrapper (the static left-1/2/-translate-x-1/2
    // centring) and nowhere else. A CSS `animation` that only names `rotate()`
    // in its keyframes replaces an element's `transform` wholesale for as long
    // as it runs — it does not compose with a separate static `transform` on
    // that same element. Putting the spin class directly on the centred <svg>
    // below briefly did exactly that: mid-rotation the `-translate-x-1/2`
    // vanished and the whole ring set jumped half its own width to the right,
    // reading as a second, overlapping circle. The spin now lives on the
    // <svg> alone, which carries no positioning transform of its own to lose.
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 hidden h-[240px] w-[240px] -translate-x-1/2 md:block"
      style={{ top: ICON_CY - 120 }}
    >
      <svg viewBox="0 0 240 240" className="vision-rings-anim h-full w-full" fill="none">
        {RINGS.map((r) => (
          <circle
            key={r}
            cx="120"
            cy="120"
            r={r}
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="1"
          />
        ))}
        <path
          d="M120 16 V224 M16 120 H224"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

function MissionRings() {
  return (
    // PauseOffscreen so the rotating reticle stops compositing off-screen.
    <PauseOffscreen
      aria-hidden
      className="pointer-events-none absolute left-1/2 hidden h-[240px] w-[240px] -translate-x-1/2 md:block"
      style={{ top: ICON_CY - 120 }}
    >
    <svg aria-hidden viewBox="0 0 240 240" className="h-full w-full" fill="none">
      <circle cx="120" cy="120" r="104" stroke="#E9F1F2" strokeWidth="1" />
      {/* The two dashed reticle rings counter-rotate — a targeting scope
          acquiring lock beneath the radar sweep. Each <g> spins about its own
          centre (transform-box: fill-box). */}
      <g className="reticle-spin-anim">
        <circle
          cx="120"
          cy="120"
          r="84"
          stroke="#DCEBEC"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="150 60"
          strokeDashoffset="40"
        />
      </g>
      <g
        className="reticle-spin-anim"
        style={{ animationDirection: 'reverse', '--reticle-duration': '20s' } as React.CSSProperties}
      >
        <circle
          cx="120"
          cy="120"
          r="62"
          stroke="#DCEBEC"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="105 55"
          strokeDashoffset="150"
        />
      </g>
    </svg>
    </PauseOffscreen>
  );
}

/**
 * Vision panel signature: a sonar ping. Rings emanate outward from the glyph
 * and fade on a loop — the "listening" maritime counterpart to the Mission
 * scope's active radar sweep. PauseOffscreen-gated; disabled under reduced
 * motion by `.sonar-ping-anim` (base opacity 0, so it is simply invisible then,
 * not a stuck static ring). Centring is via margins, never a transform, so it
 * cannot fight the ping's own `scale`.
 */
function SonarPing() {
  return (
    <PauseOffscreen
      aria-hidden
      className="pointer-events-none absolute left-1/2 hidden h-[240px] w-[240px] -translate-x-1/2 md:block"
      style={{ top: ICON_CY - 120 }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="sonar-ping-anim absolute left-1/2 top-1/2 block h-[150px] w-[150px] rounded-full border border-[rgba(150,220,220,0.7)]"
          style={
            {
              marginLeft: -75,
              marginTop: -75,
              opacity: 0,
              animationDelay: `${i * 1.05}s`,
              '--ping-duration': '3.2s',
            } as React.CSSProperties
          }
        />
      ))}
    </PauseOffscreen>
  );
}

/**
 * Vision panel: the one-shot flourish that fires the instant the panel first
 * scrolls into view (mounted only once `Panel`'s local observer flips
 * `awake`, so it always plays fresh — see the ambient-loop remount there for
 * why that matters). A single bright bloom, well past the sonar rings' own
 * reach, so the panel visibly "switches on" instead of asking the reader to
 * catch a subtle loop already mid-cycle. The continuous sonar ping keeps
 * going underneath it, unaffected.
 */
function VisionBloom() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 hidden h-[240px] w-[240px] -translate-x-1/2 md:block"
      style={{ top: ICON_CY - 120 }}
    >
      <span
        className="vision-bloom-anim absolute left-1/2 top-1/2 block h-[150px] w-[150px] rounded-full"
        style={{
          marginLeft: -75,
          marginTop: -75,
          background:
            'radial-gradient(circle, rgba(180,230,230,0.55) 0%, rgba(150,220,220,0.28) 42%, transparent 72%)',
        }}
      />
    </div>
  );
}

/**
 * The site's single signature ambient loop (TRANSITIONS.md §13): a slow radar
 * sweep inside the Mission ring scope — the one maritime/AI motif that runs at
 * rest. A conic wedge, masked to the ring's disc, rotating once every few
 * seconds. Wrapped in PauseOffscreen so it never composites off-screen, and
 * disabled under reduced motion by `.radar-sweep-anim`. Everything else on the
 * page is still at rest.
 */
function RadarSweep() {
  return (
    <PauseOffscreen
      aria-hidden
      className="pointer-events-none absolute left-1/2 hidden h-[240px] w-[240px] -translate-x-1/2 md:block"
      style={{ top: ICON_CY - 120 }}
    >
      <div
        className="radar-sweep-anim h-full w-full rounded-full"
        style={
          {
            '--radar-duration': '4.5s',
            background:
              'conic-gradient(from 0deg, transparent 0deg, rgba(47,160,152,0.42) 48deg, rgba(47,160,152,0.10) 96deg, transparent 120deg)',
            maskImage:
              'radial-gradient(circle at center, #000 0 43%, transparent 46%)',
            WebkitMaskImage:
              'radial-gradient(circle at center, #000 0 43%, transparent 46%)',
          } as React.CSSProperties
        }
      />
    </PauseOffscreen>
  );
}

/**
 * Mission panel: a bright flash at the bullseye, timed to land on the arrow's
 * first strike. Mounted only once `Panel`'s local observer flips `awake`
 * (paired with the ambient-loop remount below), so the reader's first look at
 * the panel always catches the hit landing rather than whatever phase a
 * long-running loop happens to be in. The delay is arrow-strike's 22% contact
 * point at the sped-up 3.4s cycle (~0.75s), nudged slightly earlier so the
 * flash's own ramp-up (globals.css, `mission-impact`) peaks right on contact.
 */
function MissionImpactFlash() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 hidden h-[60px] w-[60px] -translate-x-1/2 md:block"
      style={{ top: ICON_CY - 30 }}
    >
      <span
        className="mission-impact-anim absolute left-1/2 top-1/2 block h-[46px] w-[46px] rounded-full"
        style={{
          marginLeft: -23,
          marginTop: -23,
          animationDelay: '0.65s',
          background:
            'radial-gradient(circle, rgba(255,218,180,0.95) 0%, rgba(250,136,55,0.5) 45%, transparent 74%)',
        }}
      />
    </div>
  );
}

// A few grid cells are tinted in the reference; these are their positions
// within a 780px-wide panel.
const VISION_CELLS = [
  [145, 119, 53, 49],
  [353, 168, 40, 45],
  [73, 256, 46, 49],
  [414, 271, 43, 34],
  [27, 411, 42, 38],
];
const MISSION_CELLS = [
  [225, 210, 46, 46],
  [545, 271, 46, 41],
  [637, 434, 68, 38],
  [134, 381, 61, 61],
];

function Panel({
  dark,
  glyph,
  title,
  subtitle,
  body,
  cells,
  delay,
  from,
}: {
  dark?: boolean;
  glyph: React.ReactNode;
  title: React.ReactNode;
  subtitle: string;
  body: string;
  cells: number[][];
  delay?: number;
  /** Side the copy enters from, so the pair converges on the centre seam. */
  from: 'left' | 'right';
}) {
  // The decorative loop cluster (rings, sonar/radar, glyph) restarts fresh
  // the instant this panel first comes into view, keyed below, rather than
  // resuming from whatever phase PauseOffscreen happened to freeze it at.
  // Without this, a reader scrolling to the section catches the animation
  // wherever a long `infinite` loop already was — for arrow-strike that was
  // its hold phase more often than not, since the hold outlasted the strike
  // itself. The one-shot bloom/flash below only ever exists after `awake`,
  // so it always plays as a fresh "switching on" moment rather than firing
  // before the reader can see it.
  const ref = useRef<HTMLDivElement>(null);
  const [awake, setAwake] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      setAwake(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAwake(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -64px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    // min-h rather than h: the panel is a fixed 702px box with overflow
    // hidden, so between md and lg — where it is full-width but still 702px
    // tall behind 357px of top padding — any growth in the copy (a longer
    // string, a translation) was silently clipped instead of making the panel
    // taller. At the reference width the content fits well inside 702px, so
    // this resolves to exactly the same height there.
    <div
      ref={ref}
      className={`relative overflow-hidden px-8 py-20 text-center md:min-h-[702px] md:py-0 ${
        dark ? 'bg-[#072637]' : 'bg-[#F7F8F9]'
      }`}
      style={{
        backgroundImage: dark
          ? 'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)'
          : 'linear-gradient(rgba(12,61,89,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(12,61,89,0.035) 1px, transparent 1px)',
        backgroundSize: '52px 52px',
      }}
    >
      {/* All three decorative layers — tinted cells, rings, glyph — are placed
          at fixed pixel offsets measured against the desktop panel, where
          md:pt-[357px] holds the copy below them. Below md that padding is
          gone and the copy starts at 80px, so the glyph landed on top of the
          subtitle and the rings behind the heading. They carry no meaning
          (all aria-hidden), so they start at md with the layout they were
          measured for rather than being repositioned for a viewport the
          reference never covered. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
        {cells.map(([x, y, w, h]) => (
          <span
            key={`${x}-${y}`}
            className="absolute block"
            style={{
              left: `${(x / 780) * 100}%`,
              top: y,
              width: `${(w / 780) * 100}%`,
              height: h,
              background: dark
                ? 'rgba(255,255,255,0.028)'
                : 'rgba(45,150,150,0.045)',
            }}
          />
        ))}
      </div>

      {/* Keyed on the awake flip so every loop inside restarts from its own
          0% in lockstep the moment the panel is first seen — see the note
          above `ref`/`awake`. Plain `display:contents` div: it must not
          become a new positioned ancestor, since everything inside is
          `absolute` against the panel itself. */}
      <div key={awake ? 'live' : 'idle'} style={{ display: 'contents' }}>
        {dark ? <VisionRings /> : <MissionRings />}
        {dark && <SonarPing />}
        {!dark && <RadarSweep />}
        {awake && (dark ? <VisionBloom /> : <MissionImpactFlash />)}
        {/* Centring stays on this wrapper — the glyphs animate their own
            transform, which would otherwise fight -translate-x-1/2. */}
        {/* PauseOffscreen replaces this wrapper rather than adding one, so the
            glyph keeps its exact box; it stops the tick/strike/pulse loops
            running while the panel is off-screen. */}
        <PauseOffscreen
          aria-hidden
          className="pointer-events-none absolute left-1/2 hidden h-[60px] w-[60px] -translate-x-1/2 md:block"
          style={{ top: ICON_CY - 30 }}
        >
          {glyph}
        </PauseOffscreen>
      </div>

      {/* Cinematic tier: the two panels converge on the centre seam slowly and
          in step, so the split reads as one composition opening rather than two
          halves sliding in. */}
      <Reveal
        variant={from}
        duration="cinematic"
        delay={delay}
        className="relative mx-auto md:pt-[357px]"
      >
        <h3
          className={`text-[2rem] font-medium leading-[1.15] md:text-[42.5px] ${
            dark ? 'text-white' : 'text-[#072637]'
          }`}
        >
          {title}
          <span className="text-[#FA8837]">.</span>
        </h3>
        <p
          className={`mx-auto mt-6 max-w-[680px] text-lg font-medium md:mt-[49px] md:text-[23.6px] ${
            dark ? 'text-white' : 'text-[#0C3D59]'
          }`}
        >
          {subtitle}
        </p>
        <p
          className={`mx-auto mt-4 max-w-[560px] text-[15px] leading-[1.75] md:mt-[22px] md:max-w-[660px] md:text-[19px] md:leading-[30.5px] ${
            dark ? 'text-[#E0E4E6]' : 'text-[#466C81]'
          }`}
        >
          {body}
        </p>
      </Reveal>
    </div>
  );
}

export function VisionMission() {
  return (
    <section data-shot="vision-mission" className="grid lg:grid-cols-2">
      <Panel
        dark
        from="left"
        cells={VISION_CELLS}
        glyph={<VisionGlyph />}
        title="Our Vision"
        subtitle="Powering autonomous maritime decision-making"
        body="Building a future where complex decisions are trusted, timely, and action-ready—guided by AI, governed by people."
      />
      <Panel
        delay={80}
        from="right"
        cells={MISSION_CELLS}
        glyph={<MissionGlyph />}
        title="Our Mission"
        subtitle="Turning fragmented data into action that gets done"
        body="Moving teams beyond dashboards by converting data, risks, and recommendations into measurable execution."
      />
    </section>
  );
}
