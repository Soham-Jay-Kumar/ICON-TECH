'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Reveal } from '@/components/site/reveal';
import { Parallax } from '@/components/site/scroll';
import { PauseOffscreen } from '@/components/site/pause-offscreen';
import { cn } from '@/lib/utils';
import { HeroSea } from '@/components/home/hero-sea';
import { HeroWordmarkA } from '@/components/home/hero-wordmark-a';
import {
  CALLOUT_MARKERS,
  HERO_SHIP_SCALE,
  LAND_MASK_URL,
  SHIP_PIVOT_REF,
  SHIP_RECT,
  REF_H,
} from '@/components/home/hero-water-geometry';
import { REF_W, ILLUS_H, vw, cqw, pctX, pctY } from '@/components/home/hero-metrics';
import type { ShipPose } from '@/components/home/hero-water-flow';

// Preserve the reference's leading ratio as the requested larger heading grows.
const HEADING_LEADING = 86 / 70.7;

// --- The watermark, sized so the hull still parts it ---------------------
//
// In reference/01-hero.png the watermark is not two words with the ship
// dropped in the gap between them: both words run BEHIND the hull, and the
// hull is what hides the join. Measured off that file (plate px, its own
// 145.1px type):
//
//     "AI DRIVEN" ink   28 .. 570     (543 wide)
//     "SHIPPING"  ink 1015 .. 1544    (530 wide)
//     red hull        547 .. 1026     (480 wide)
//
// so "DRIVEN" runs 23px past the hull's left edge and "SHIPPING" starts 11px
// before its right edge. That overlap is the whole composition — it is what
// makes the two words read as one continuous backdrop instead of a pair of
// labels flanking a ship.
//
// The hull now draws at HERO_SHIP_SCALE about its pivot (x 771), so it spans
// 603..962 — 120px narrower than the artwork the watermark was spaced for.
// Holding the type at the reference size and letting the words keep their
// reference positions would open a gap at each hull edge; shrinking the whole
// watermark to match the hull closes the gaps but walks both ends in off the
// plate edges, losing the reference's edge-to-edge sweep.
//
// So the type GROWS instead. Scaling by this factor and letting the flex
// justify-between span stay full-width puts each word's inner end back
// against the smaller hull with the reference's own overlap (23 and 11, times
// this scale) while the outer ends stay within ~4px of the reference's 28 and
// 1544. Solved from both edges — 1.1058 from the left, 1.1209 from the right
// — and split between them, which is why neither inset is exactly the
// reference's.
const WORDMARK_SCALE = 1.1133;
// The wordmark must shrink vertically only. Keep its horizontal measure (and
// therefore the solved overlap with the scaled hull) intact, then scale the
// painted glyph height from its waterline-facing feet.
const WORDMARK_HEIGHT_SCALE = 0.9;
// A reference-frame watermark measure, scaled. Every number the watermark is
// built from is the reference's own, passed through here, so the letter and
// word spacing keep exactly the proportions 01-hero.png sets.
const wm = (refPx: number) => cqw(refPx * WORDMARK_SCALE);
// The uppercase ink stops 12.1 reference px above its leading-none line box's
// bottom. Scale around that ink edge—not the line box—so height changes never
// lift the wordmark out of contact with the animated water.
const WORDMARK_FOOT_INSET = wm(12.1);

// The desktop headline is intentionally 15% smaller than its prior 108px
// reference size. The supporting line keeps its existing size: the request is
// for a calmer headline, not a smaller overall copy block. The mobile headline
// floor remains unchanged below, protecting its existing readability.
const FULL_HEADLINE_REF_SIZE = 108;
const DESKTOP_HEADLINE_SCALE = 0.85;
const HEADING_REF_SIZE = FULL_HEADLINE_REF_SIZE * DESKTOP_HEADLINE_SCALE;
const HEADING_MAX_SIZE = '6.8rem';
// The headline now carries ~40 characters per line where it used to carry
// ~24, and each line measures 21.7em wide (uppercase, -0.053em tracking). It
// keeps its original size wherever that fits, and is capped only where a line
// would run past 88% of the window, so it always holds the two lines the
// FIT_DIV budget below assumes and the ocean still lands on the first screen.
// The rem floor applies on phones, where the lines wrap freely. Applies to the
// headline ONLY: the supporting line and every other measurement are unchanged.
const LONG_HEADLINE_WIDTH_CAP = `max(${(88 / 21.7).toFixed(3)}vw, 1.75rem)`;
// Requested "a little smaller" across the board, on top of the fit above.
const LONG_HEADLINE_TRIM = 0.92;
const SUBHEAD_REF_SIZE = 40.5;
// Preserve the original 40.5 / 108 relationship only for the subhead's
// existing height ceiling; it must not inherit the headline's new 15% cap.
const SUBHEAD_RATIO = SUBHEAD_REF_SIZE / FULL_HEADLINE_REF_SIZE;
//
// What sets the ceiling on these is line WRAP, not taste. The heading is
// written to sit on two lines, which is what lets the height cap below divide
// the leftover by a fixed FIT_DIV; a third line would overflow the fold. Its
// longest line ("For Shipping and Beyond.") measures a near-constant 0.0813 x
// the viewport width across every size tested (1088/1560, 1118/1512,
// 1064/1440, 946/1280), so the wrap threshold is vw(126.9) and anything below
// that is safe at any width. The new vw(91.8) headline stays well below that
// threshold, including when the fallback face is wider.

// --- Fit the whole hero into the first screen, full-bleed, no side borders ---
//
// The ocean plate is full-bleed (100vw) at every width, so its height is fixed
// at PLATE_H/REF_W of the viewport width — ~33.3vw once SKY_CROP is off it —
// and cannot be reduced further without either cropping the waves (not
// allowed) or letterboxing the plate narrower than the window (the white
// borders we are told to avoid). On a 16:9 desktop that full-width plate plus
// a full-size text block is still taller than the viewport, so the whole
// composition would not fit on its own.
//
// The full-sized heading cap is calculated from the height LEFT OVER once the
// full-bleed ocean has taken its share. The headline receives 85% of that cap;
// the supporting copy keeps the original cap so its size does not change.
// Empty sky trimmed off the TOP of the plate, in plate px.
//
// The plate is a fixed 1560x630 crop of the reference artwork, drawn when the
// ship filled it top to bottom. At HERO_SHIP_SCALE the hull shrinks toward its
// waterline pivot, so its highest ink — the mast tip, measured at plate y 17 in
// the reference — now falls at plate y 159, and everything above that is blank:
// 163px of pure white between the sub-head and the mast in the rendered page
// (verified by scanning the render; the first non-white row is the 6px-wide
// mast at page y 410 against a plate top of y 247).
//
// Cropping it is free — there is nothing there to lose — and it pays twice.
// It closes the gap the ship's scaling opened, and because the plate is what
// the fold-fit budget below spends most of its height on, every px trimmed
// here is a px the heading cap can hand to the type instead. 120 leaves ~39px
// of air above the mast, which reads as sky rather than a crop.
const SKY_CROP = 120;
const PLATE_H = ILLUS_H - SKY_CROP;
const OCEAN_VH = (PLATE_H / REF_W) * 100; // ocean height as a % of viewport width
// Everything vertical in the text block that ISN'T the heading glyphs, in vw:
// the nav-clearing top padding (88) + the heading→sub-head gap (10) + the
// plate's top margin (4). The sub-head's own height is folded into the
// divisor, since it scales with the heading.
//
// This is where the requested larger copy actually comes from on a desktop
// window. On any short/wide viewport the height cap below — not the vw clamp
// — is what sets the heading (measured: 41px at 1560×878, 51px at
// 1920×1080, both far under the 80px reference), so raising HEADING_REF_SIZE
// alone would have changed nothing there. Every px taken out of this reserve
// is a px handed to the type instead, and the two gaps are the only slack in
// the column: the top padding has to stay, since the fixed navbar measures
// 73-92px against its 85-108px and the heading would tuck under the bar. The
// gap (16→10) and the plate's margin (20→4) cost little — the top of the
// plate is empty sky above the mast — and buy the heading ~18% at 1560 and
// 1920, ~10% at the taller 1440/1512 shapes, with the ocean still ending
// exactly on the fold rather than being pushed through it.
const FIT_RESERVE_VW = 6.538;
// The headline is ~2.43 line-heights tall and the supporting line adds ~0.56
// more at the original ratio, so the headline font divides into the leftover
// height ~3.0×.
const FIT_DIV = 3.0;
// The unscaled cap is retained for the supporting line. Only the headline's
// cap gets the requested 15% desktop reduction.
const BASE_HEADING_H_CAP = `calc((100svh - ${(OCEAN_VH + FIT_RESERVE_VW).toFixed(3)}vw) / ${FIT_DIV})`;
const HEADING_H_CAP = `calc(${BASE_HEADING_H_CAP} * ${DESKTOP_HEADLINE_SCALE})`;
const SUBHEAD_H_CAP = `calc(${BASE_HEADING_H_CAP} * ${SUBHEAD_RATIO.toFixed(4)})`;

// Same shape as reveal.tsx's: runs before paint on the client, but avoids the
// "useLayoutEffect does nothing on the server" warning. It matters for the
// reduced-motion branch below — showing an alert in a layout
// effect means it is never painted in its hidden state on the frame React
// hydrates, which is the hidden-then-visible flash reveal.tsx also avoids.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// --- The alert cards ------------------------------------------------------
//
// Two live alerts annotate the ship: a card on the waves, joined to its
// hotspot on the hull by a leader. The card is the Products section's alert
// card (components/products/product-showcase.tsx), so the hero previews the
// product instead of carrying a label style of its own.
//
// Everything below is in plate reference px (1560x630). The hotspots are the
// ship raster's own markers (CALLOUT_MARKERS), scaled about the waterline pivot
// exactly as the ship layer is, so each leader lands on the marker the hull
// actually draws.

/** Where a raster marker sits on the page at rest, in plate px. */
const atRest = (m: { x: number; y: number }) => ({
  x: SHIP_PIVOT_REF.x + HERO_SHIP_SCALE * (m.x - SHIP_PIVOT_REF.x),
  y: SHIP_PIVOT_REF.y + HERO_SHIP_SCALE * (m.y - SHIP_PIVOT_REF.y),
});

/** Leader stroke, and half of it for squaring the elbow. */
const LEADER_W = '1.5px';
const LEADER_HALF = '0.75px';
/** How far the leader's foot lands in from the card's near edge, in CSS px. */
const CARD_JOINT = 24;

type HeroAlert = {
  /**
   * Stable handle for scripts/check-callout-track.js. POSITIONAL, not
   * semantic — it names the side of the hull, so retitling leaves it alone.
   */
  name: string;
  marker: { x: number; y: number; r: number };
  /** The side of the hull the card sits on; the leader runs out that way. */
  side: 'left' | 'right';
  /** Where the leader turns down towards the card, in plate px. */
  elbowX: number;
  /**
   * The card's top edge, in plate px. Both sit on the waves, below the
   * watermark's feet (plate y 382), so neither covers its letters.
   */
  cardTop: number;
  /** When the leader starts drawing, ms after mount. */
  delay: number;
  title: string;
};

const ALERTS: HeroAlert[] = [
  {
    name: 'hull (left)',
    marker: CALLOUT_MARKERS.hull,
    side: 'left',
    elbowX: 556,
    cardTop: 466,
    delay: 900,
    title: 'Hull performance drops',
  },
  {
    name: 'fuel (right)',
    marker: CALLOUT_MARKERS.fuel,
    side: 'right',
    elbowX: 1012,
    cardTop: 412,
    delay: 1050,
    title: 'Fuel anomaly detected',
  },
];

const HOTSPOTS = ALERTS.map((a) => atRest(a.marker));

function AlertCard({
  title,
  className,
  style,
}: {
  title: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        'rounded-[12px] border border-[#E3EDF1] bg-white px-4 py-3 text-left shadow-[0_6px_24px_rgba(7,38,54,0.12)]',
        className
      )}
    >
      <p className="text-[16px] font-semibold leading-[22px] text-[#072636]">{title}</p>
    </div>
  );
}

/**
 * One alert over the plate: the hotspot's pulse, the leader, and the card.
 *
 * The whole group rides the hull as ONE translation — the displacement the
 * hotspot itself undergoes (see `onShipPose`) — rather than the hull's
 * rotation. That keeps the leader welded to its marker while the card and its
 * lines stay square to the page: a card rocking half a degree with the swell
 * would lose the crisp edge it is there for.
 *
 * The entrance is timed from mount, not driven by <Reveal>: this lives inside
 * the plate's own `mask` Reveal, whose collapsed clip-path reports 0%
 * intersection for everything in it (CLAUDE.md). The leader draws out of the
 * hotspot, turns down, and the card arrives at its foot — hotspot, line, card,
 * the order the eye should take. Hidden states are scoped to `[.js_&]`, so
 * without JavaScript the whole thing is simply there.
 */
function AlertAnnotation({
  alert,
  hotspot,
  groupRef,
}: {
  alert: HeroAlert;
  hotspot: { x: number; y: number };
  groupRef: (el: HTMLDivElement | null) => void;
}) {
  const [shown, setShown] = useState(false);
  useIsomorphicLayoutEffect(() => {
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setShown(true);
      return;
    }
    const t = window.setTimeout(() => setShown(true), alert.delay);
    return () => window.clearTimeout(t);
  }, [alert.delay]);

  const right = alert.side === 'right';
  const r = alert.marker.r * HERO_SHIP_SCALE;
  // The leader leaves from the marker's rim, not its centre.
  const start = right ? hotspot.x + r : hotspot.x - r;
  const run = Math.abs(alert.elbowX - start);
  const drop = alert.cardTop - hotspot.y;
  const step = 'transition duration-ui ease-standard motion-reduce:transition-none motion-reduce:!delay-0';

  return (
    <div
      ref={groupRef}
      data-callout-label={alert.name}
      className="absolute inset-0"
      style={{ willChange: 'transform' }}
    >
      <span
        aria-hidden
        className="absolute"
        style={{
          left: pctX(hotspot.x - r),
          top: pctY(hotspot.y - r),
          width: cqw(2 * r),
          height: cqw(2 * r),
        }}
      >
        <span className="hotspot-pulse-anim block h-full w-full rounded-full border-[1.5px] border-white" />
      </span>

      {/* The run, out of the hotspot, overshooting the elbow by half a stroke
          so the corner is square. */}
      <span
        aria-hidden
        className={cn(
          'absolute bg-[#072637]',
          step,
          right ? 'origin-left' : 'origin-right',
          shown ? 'scale-x-100' : '[.js_&]:scale-x-0'
        )}
        style={{
          left: right ? pctX(start) : `calc(${pctX(alert.elbowX)} - ${LEADER_HALF})`,
          top: pctY(hotspot.y),
          marginTop: `-${LEADER_HALF}`,
          width: `calc(${cqw(run)} + ${LEADER_HALF})`,
          height: LEADER_W,
        }}
      />
      {/* The drop, from the elbow to the card's top edge. */}
      <span
        aria-hidden
        className={cn(
          'absolute origin-top bg-[#072637]',
          step,
          shown ? 'scale-y-100' : '[.js_&]:scale-y-0'
        )}
        style={{
          left: pctX(alert.elbowX),
          marginLeft: `-${LEADER_HALF}`,
          top: pctY(hotspot.y),
          marginTop: `-${LEADER_HALF}`,
          width: LEADER_W,
          height: `calc(${cqw(drop)} + ${LEADER_HALF})`,
          // Starts as the run lands: one `ui` beat after it.
          transitionDelay: 'var(--motion-duration-ui)',
        }}
      />

      <AlertCard
        title={alert.title}
        className={cn(
          'absolute whitespace-nowrap transition-opacity duration-reveal ease-premium motion-reduce:transition-none motion-reduce:!delay-0',
          shown ? 'opacity-100' : '[.js_&]:opacity-0'
        )}
        style={{
          top: pctY(alert.cardTop),
          // Arrives over the last stretch of the drop (1.6 `ui` beats).
          transitionDelay: 'calc(var(--motion-duration-ui) * 1.6)',
          ...(right
            ? { left: pctX(alert.elbowX), marginLeft: -CARD_JOINT }
            : { right: pctX(REF_W - alert.elbowX), marginRight: -CARD_JOINT }),
        }}
      />
    </div>
  );
}

export function Hero() {
  // Each alert group follows its hotspot, which is painted inside the ship
  // raster and so moves with the hull's full transform: translate by `dy`,
  // rotate by `roll` about the waterline pivot. Its displacement is that
  // rotation applied to the hotspot's offset from the pivot, plus the bob. The
  // two hotspots sit either side of the pivot, so a roll moves them in
  // OPPOSITE vertical directions and each group needs its own.
  //
  // Written straight to the nodes rather than through state, for the same
  // reason hero-sea.tsx writes the ship's own transform: this arrives up to 30
  // times a second.
  const alertRefs = useRef<(HTMLDivElement | null)[]>([]);
  const onShipPose = useCallback(({ dy, roll }: ShipPose) => {
    const a = (roll * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    HOTSPOTS.forEach((h, i) => {
      const el = alertRefs.current[i];
      if (!el) return;
      const vx = h.x - SHIP_PIVOT_REF.x;
      const vy = h.y - SHIP_PIVOT_REF.y;
      const dx = vx * cos - vy * sin - vx;
      const ddy = vx * sin + vy * cos - vy + dy;
      // cqw (plate-relative): the hull's bob is a fraction of the PLATE.
      el.style.transform = `translate3d(${cqw(dx)}, ${cqw(ddy)}, 0)`;
    });
  }, []);

  return (
    <section data-shot="hero" className="relative overflow-hidden bg-white">
      {/* Reference measures this at 170px, which left the copy only ~5px clear
          of the ship's mast (and overlapping it around 768px). Lifted to 125px
          to open that gap back up.

          The floor has to clear the navbar, which is `fixed` (i.e. out of
          flow), so this padding is the only thing holding the heading below
          it. On mobile the bar's height is set by its 44px menu button plus
          vw(17) of top padding — ~48px at 375px, ~52px at 768px — so the old
          41px floor (carried over from when the navbar was `absolute`) tucked
          the first line of the h1 underneath it. 64px clears the bar at every
          width below the ~799px where vw(125) takes over again. */}
      <div
        className="text-center"
        style={{ paddingTop: `max(${vw(88)}, 72px)` }}
      >
        {/* Headline wipes in on the cinematic tier (type revealed left→right),
            then the two copy lines rise under it — a layered sequence with
            clear hierarchy rather than three identical fade-ups. */}
        <Reveal variant="rise-mask" duration="cinematic">
          <h1
            className="font-semibold uppercase text-[#072637]"
            style={{
              // min(normal clamp, height cap): the cap only shrinks the type on
              // short/wide viewports so the full-bleed ocean below still fits.
              fontSize: `calc(${LONG_HEADLINE_TRIM} * min(clamp(2.75rem, ${vw(HEADING_REF_SIZE)}, ${HEADING_MAX_SIZE}), ${HEADING_H_CAP}, ${LONG_HEADLINE_WIDTH_CAP}))`,
              // Unitless, not vw(86). `fontSize` is clamped at both ends but a
              // vw line-height is not, so below the ~794px where the 2.25rem
              // floor engages the leading kept shrinking past the text: 20.7px
              // of leading under 36px type at 375px, which drew the two lines
              // of this heading on top of each other. As a ratio it tracks the
              // clamped font-size instead, and still resolves to exactly the
              // reference 86px/70.7px at REF_W.
              lineHeight: HEADING_LEADING,
              letterSpacing: '-0.053em',
            }}
          >
            Turning <span className="text-[#FA8837]">Digital Ambition</span> into{' '}
            <span className="text-[#FA8837]">Measurable</span>
            {/* Two balanced 40-character lines from md up; phones wrap freely. */}
            <br className="hidden md:block" />{' '}
            <span className="text-[#FA8837]">Business Value</span> through Technology
            and AI<span className="text-[#FA8837]">.</span>
          </h1>
        </Reveal>
        <Reveal delay={100}>
          {/* Deliberately independent of the smaller headline: the supporting
              copy keeps its existing desktop and height-capped sizes. */}
          <p
            className="text-[#54778A]"
            style={{
              // Its own rem floor still wins on phones, while the independent
              // base cap preserves its existing desktop size.
              fontSize: `min(clamp(1.375rem, ${vw(SUBHEAD_REF_SIZE)}, 2.75rem), ${SUBHEAD_H_CAP})`,
              letterSpacing: '-0.008em',
              // Floored for the same reason as the leading above: the font
              // size stops shrinking at its clamp floor but a bare vw gap does
              // not, closing to ~2px on a phone and jamming this against the
              // heading. Tightened from 16px to 10px at REF_W to feed the
              // height cap (see FIT_RESERVE_VW); the larger type closes the
              // gap optically anyway.
              marginTop: `max(${vw(10)}, 10px)`,
            }}
          >
            We help enterprises transform data into intelligent and decisive
            action.
          </p>
        </Reveal>
      </div>

      {/* The ocean/ship plate: a bottom-up clip wipe — the tide fills in from
          the waterline, the site's signature media move. Cinematic (not epic)
          and a short delay because this is the page's LCP element; the grand
          epic reveal is spent on the CTA dashboard at the foot instead, where
          it costs no LCP. */}
      <Reveal
        delay={140}
        duration="cinematic"
        variant="mask"
        className="relative w-full"
      >
        {/* The viewport onto the plate. Full-bleed at every width (no side
            borders), and SKY_CROP shorter than the plate it holds — so its
            height follows from that via aspectRatio, and the heading above is
            what shrinks to keep the whole thing on-screen (see
            HEADING_H_CAP). marginTop keeps a small gap under the sub-head.

            It clips at exactly the plate's own bottom edge, which is where the
            hero section used to do the clipping: the water band deliberately
            runs 28px past the plate into artwork that has already dissolved to
            white, and that is still cut here rather than drawn. */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            aspectRatio: `${REF_W} / ${PLATE_H}`,
            marginTop: vw(4),
          }}
        >
          {/* The plate itself, pulled up by the cropped band. Its own box stays
              the full 1560x630 the reference defines, so every pctX/pctY and
              every cqw inside it — the wordmark, the callouts, the water band,
              the ship layer — keeps addressing the coordinate system it was
              measured in. Only what you SEE of it changes. containerType makes
              it the query container those cqw values resolve against; it is
              still the full viewport width, so cqw still equals vw. */}
          <div
            className="absolute inset-x-0"
            style={{
              top: `${((-SKY_CROP / PLATE_H) * 100).toFixed(4)}%`,
              aspectRatio: `${REF_W} / ${ILLUS_H}`,
              containerType: 'inline-size',
            }}
          >
            {/* The wordmark sits BEHIND the water and half into it — the design
                reference has the sea crossing the letters at about their
                midpoint, so roughly half of each glyph reads above the surface
                and the rest is simply gone behind the wave field.

                `top` puts the letters' feet at plate y 382. Sampled across the
                running animation (eight frames over ~11s, the canvas's own
                painted top row per column pooled across the whole wordmark's
                width), the water's top edge under the text sits at plate 324
                typically, 342 at its shallowest and 297 at its deepest. Against
                that median, 382 leaves 53% of the 124.25px painted glyphs above
                water — the reference's proportion — falling to 32% at the
                deepest moment and never rising past 68%.

                This REPLACED an earlier 370, which was solved for a different
                brief: keep the water clear of more than two thirds of the
                glyphs while never quite letting the feet leave it. That bought
                a 6px contact margin at the shallowest water and read as type
                floating on the sea rather than standing in it. At 382 the feet
                are 40px under even when the water is at its most withdrawn, so
                contact is no longer the delicate part of this — the readable
                half of the letters is.

                Both halves of that only work because the water composites
                NORMALLY over this element (hero-waves.tsx paints the canvas
                with no blend mode, after the wordmark in paint order). If the
                canvas ever stops painting — the hydration watchdog firing, a
                worker chunk 404 — the fallback still underneath it blends with
                `multiply` instead, and the wordmark comes back through the
                water looking like it is printed on top of the sea. That is a
                broken-page symptom, not a layering bug to fix here.

                The drift is DOWNWARD (+), not upward. A layer further away
                should displace *less* than the page, which reads as drifting
                down as you scroll — up was the near-layer cue, and it also
                lifted the wordmark clean out of the sea. Downward, contact can
                only deepen.

                anchor="top" keeps frame zero identical to the reference. */}
            {/* left/right are solved, not measured: they are whatever puts each
                word's INNER end against the scaled hull with the reference's own
                overlap (see WORDMARK_SCALE). At 1.1133 the words come out
                24.1..628.6 and 950.1..1540.1, against a hull of 603..962.25 —
                25.6px of "DRIVEN" behind its left edge, 12.2px of "SHIPPING"
                behind its right, both exactly the reference's overlap scaled.
                The outer ends land within ~4px of the reference's own 28 and
                1544, so the sweep still reads edge-to-edge.

                `top` is solved the same way, against the water rather than the
                ship: the untransformed glyphs are 138.05 tall (124 x scale) and
                sit 10.02 below the line box top (9 x scale), so 382 - 138.05 -
                10.02 puts their feet on plate y 382. The
                foot-origin 0.9 vertical transform then makes the painted
                height 124.25px without changing its width or water contact.
                See the submersion note above for why 382 is the number that
                matters. */}
            <Parallax
              anchor="top"
              distance={36}
              className="absolute"
              style={{ left: pctX(24.1), right: pctX(19.9), top: pctY(233.93) }}
            >
              <div
                aria-hidden
                // #FEEDE0 -> #FEE1CC: 10 points less transparent, as asked.
                // The watermark carries no `opacity` — it never has. Its
                // faintness IS this colour: a tint of the brand orange
                // (#FA8837) laid over white, which the reference measures at
                // ~15.3% (from the G and B channels; R is meaningless here
                // because the orange's own red, 250, is within a whisker of
                // white). So "less transparent" has to be a deeper tint, not a
                // smaller alpha, and 25.3% is that same tint 10 points up.
                //
                // Read as a x1.10 relative change instead it would land on
                // #FEEBDD — two steps of green and three of blue out of 255,
                // which nobody could see. This is the design-tool reading: the
                // opacity slider moved from 15 to 25.
                className="flex justify-between whitespace-nowrap font-display uppercase leading-none text-[#FEE1CC]"
                // Every horizontal value is the reference's own, put through
                // wm() — cqw (plate-relative, so the watermark holds its size
                // against the ocean rather than the window) times
                // WORDMARK_SCALE. scaleY is deliberately paint-only: it reduces
                // the requested height by 10% without narrowing the words,
                // changing their tracking, or disturbing the hull overlap.
                style={{
                  fontSize: wm(145.1),
                  letterSpacing: wm(7.4),
                  transform: `scaleY(${WORDMARK_HEIGHT_SCALE})`,
                  transformOrigin: `center calc(100% - ${WORDMARK_FOOT_INSET})`,
                }}
              >
                <span style={{ wordSpacing: wm(-14) }}><HeroWordmarkA />I Driven</span>
                <span style={{ letterSpacing: wm(9.4), marginRight: wm(-9.4) }}>
                  Shipping
                </span>
              </div>
            </Parallax>

            {/* White background of the plate is dropped by multiply, letting the
                wordmark and labels above show through while the ship occludes them
                exactly as it does in the reference. */}
            {/* fetchpriority: this is the page's LCP element, and as a plain
                <img> it would otherwise be discovered at normal priority.

                LAND_MASK_URL takes two things out of this raster: the printed
                ocean, redrawn moving by the canvas in <HeroSea>, and the original
                full-size ship footprint. The ship is redrawn there at its
                requested 75% scale, so the broader static cut also removes pale
                pixels the moving sprite's intentionally tight matte excludes. */}
            <img
              src="/images/hero-ocean.png"
              alt="Cargo ship on a digital ocean, annotated with AI-detected fuel and hull-performance alerts"
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full mix-blend-multiply"
              style={{
                WebkitMaskImage: `url("${LAND_MASK_URL}")`,
                maskImage: `url("${LAND_MASK_URL}")`,
                WebkitMaskSize: '100% 100%',
                maskSize: '100% 100%',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
              }}
            />

            {/* The water, moving, and the ship riding it. Not an overlay of new
                graphics — this *is* the ocean: waves.svg's own contours, washes
                and dot lattice, redrawn each frame with the surface propagating
                outward from the bow, and the hull seated on the contour the
                renderer just drew. It manages its own animation clock (freezes
                under reduced motion, pauses off-screen and on hidden tabs), so it
                needs no PauseOffscreen wrapper. */}
            <HeroSea onPose={onShipPose} />

            {/* The alerts, over the ship and the water. From `lg` only: below
                that the plate is too small for a 16px card to sit beside the
                hull, so the same cards stack under the plate instead (below),
                without leaders. PauseOffscreen holds the hotspot pulse while
                the hero is scrolled away. */}
            <PauseOffscreen className="pointer-events-none absolute inset-0 z-20 hidden lg:block">
              {ALERTS.map((alert, i) => (
                <AlertAnnotation
                  key={alert.name}
                  alert={alert}
                  hotspot={HOTSPOTS[i]}
                  groupRef={(el) => {
                    alertRefs.current[i] = el;
                  }}
                />
              ))}
            </PauseOffscreen>
          </div>
        </div>
      </Reveal>

      <Reveal delay={200} className="lg:hidden">
        <div className="mx-auto grid max-w-[760px] gap-3 px-5 pb-10 pt-4 sm:grid-cols-2 sm:px-8">
          {ALERTS.map((alert) => (
            <AlertCard key={alert.name} title={alert.title} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}
