'use client';

import { useCallback, useRef } from 'react';
import { Reveal } from '@/components/site/reveal';
import { Parallax } from '@/components/site/scroll';
import { HeroSea } from '@/components/home/hero-sea';
import { HeroWordmarkA } from '@/components/home/hero-wordmark-a';
import {
  LAND_MASK_URL,
  SHIP_PIVOT_REF,
} from '@/components/home/hero-water-geometry';
import { REF_W, ILLUS_H, vw, pctX, pctY } from '@/components/home/hero-metrics';
import type { ShipPose } from '@/components/home/hero-water-flow';

// Reference 01-hero.png: 70.7px type on 86px leading.
const HEADING_LEADING = 86 / 70.7;

function Callout({
  x,
  y,
  drift,
  bobRef,
  name,
  children,
}: {
  x: number;
  y: number;
  /** Stable handle for scripts/check-callout-track.js. */
  name: string;
  /** Scroll drift in px; the two callouts travel at slightly different rates. */
  drift: number;
  /**
   * The label's own leader line and arrowhead are not a separate element —
   * they are baked into the ship raster (hero-sea.tsx), riding the hull's
   * transform. Without this the arrow rocks on the water every ~5s while its
   * label sits dead still above it, reading as two things that happen to be
   * near each other rather than one annotation. Set on the inner span (never
   * the Parallax div, which drives its own scroll-linked transform on that
   * same node) so the two motions compose instead of fighting over one
   * `style.transform`.
   */
  bobRef?: React.Ref<HTMLSpanElement>;
  children: React.ReactNode;
}) {
  return (
    // Hidden below `md`, floored above it. vw(21.4) is ~5px on a 375px phone
    // — illegible — but simply flooring the size does not rescue it: the
    // illustration is only ~150px tall there, and a legible label is wide
    // enough to run across the hull and past the right edge of the frame. At
    // `md` and up the frame is wide enough for an 11px label to sit clear of
    // both, so the labels start there and the phone layout drops them rather
    // than showing unreadable or overlapping text.
    <Parallax
      anchor="top"
      distance={drift}
      className="absolute hidden md:block"
      style={{ left: pctX(x), top: pctY(y) }}
    >
      <span
        ref={bobRef}
        data-callout-label={name}
        className="block whitespace-nowrap font-medium uppercase leading-none text-[#072637]"
        style={{
          fontSize: `max(${vw(21.4)}, 11px)`,
          // The ship's own roll pivot, expressed relative to this label's box.
          // Hero.tsx writes the hull's exact transform here — the same
          // translate and the same rotate — so the label is carried as part of
          // the ship's rigid body, which is what its leader line already is.
          // Rotating about a pivot this far outside the box is the point: it
          // resolves into the translation the leader's own tip undergoes, and
          // that is what keeps the join between text and arrow fixed.
          //
          // In vw so it holds at every width: the plate is full-bleed, so one
          // reference px is one (100/1560)vw at any viewport.
          transformOrigin: `${vw(SHIP_PIVOT_REF.x - x)} ${vw(SHIP_PIVOT_REF.y - y)}`,
          willChange: 'transform',
        }}
      >
        {children}
      </span>
    </Parallax>
  );
}

export function Hero() {
  // Both callout labels ride the hull as part of its rigid body — the same
  // translate AND the same rotate the ship layer itself gets, about the same
  // pivot (each label carries that pivot as its own transform-origin; see
  // `Callout`). Their leader lines are drawn inside the ship raster, so this
  // is the only way the text and the arrow it belongs to stay welded.
  //
  // The rotation is not a refinement — it is most of the effect. The two
  // leader tips sit on opposite sides of the pivot (plate x 439 and 1203
  // against a pivot at 771), so a roll moves them in OPPOSITE vertical
  // directions: at half a degree, the left tip drops ~2.9px while the right
  // rises ~3.8px. Driving both labels with one shared `dy` — which is what
  // this did at first — is therefore wrong for at least one of them at every
  // instant the hull is not level.
  //
  // Applied to the span directly rather than through state, for the same
  // reason hero-sea.tsx writes the ship's own transform straight to its node:
  // this arrives up to 30 times a second, and re-rendering the page to move
  // two labels would cost far more than the movement itself.
  const anchorLabelRef = useRef<HTMLSpanElement>(null);
  const fuelLabelRef = useRef<HTMLSpanElement>(null);
  const onShipPose = useCallback(({ dy, roll }: ShipPose) => {
    const t = `translate3d(0, ${vw(dy)}, 0) rotate(${roll.toFixed(4)}deg)`;
    if (anchorLabelRef.current) anchorLabelRef.current.style.transform = t;
    if (fuelLabelRef.current) fuelLabelRef.current.style.transform = t;
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
        style={{ paddingTop: `max(${vw(125)}, 64px)` }}
      >
        {/* Headline wipes in on the cinematic tier (type revealed left→right),
            then the two copy lines rise under it — a layered sequence with
            clear hierarchy rather than three identical fade-ups. */}
        <Reveal variant="rise-mask" duration="cinematic">
          <h1
            className="font-semibold uppercase text-[#072637]"
            style={{
              fontSize: `clamp(2.25rem, ${vw(70.7)}, 5.5rem)`,
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
            Building <span className="text-[#FA8837]">AI Agents</span>
            <br />
            For Shipping and Beyond
            <span className="text-[#FA8837]">.</span>
          </h1>
        </Reveal>
        <Reveal delay={100}>
          {/* Reference measures this at 23.6px; sized up per request. */}
          <p
            className="text-[#54778A]"
            style={{
              fontSize: `clamp(1.05rem, ${vw(26.5)}, 1.8rem)`,
              letterSpacing: '-0.008em',
              // Floored for the same reason as the leading above: the font
              // size stops shrinking at its clamp floor but a bare vw gap does
              // not, closing to ~4px on a phone and jamming this against the
              // heading. Resolves to the reference 16px at REF_W either way.
              marginTop: `max(${vw(16)}, 12px)`,
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
        <div
          className="relative w-full"
          // Offsets the 45px (at reference width) lifted off the copy block's
          // top padding above, so the illustration holds its original position
          // on the page while the text moves up and away from the mast.
          style={{ aspectRatio: `${REF_W} / ${ILLUS_H}`, marginTop: vw(44) }}
        >
          {/* The wordmark sits IN the water, and has to stay there — but not so
              deep that it reads as sunk rather than afloat-in-contact. Both
              departures from the reference frame below are deliberate:

              `top` is 17px below the measured 220, putting the letters' feet
              at plate y 370. Sampled every half-second for 90s
              (scripts/grab-hero.js against a scan of the canvas's own alpha
              for the topmost painted row per column, pooled across the whole
              wordmark's width), the water's top edge under it ranges roughly
              307-364: 364 at its shallowest (water pulled back the most) and
              307 at a brief, localised trough under one edge of the text.
              370 keeps a 6px margin below 364, so the text is never fully
              clear of the water even at the shallowest measured moment — the
              hard requirement, since a visible gap there reads as floating.

              Against the TYPICAL water level (the pooled median, 339) that
              same 370 keeps the water clear of more than two thirds of the
              133px-tall glyphs (77% of the height stays above the surface).
              It dips under that bar only at the rare, brief, single-column
              trough near 307-320 — a local dimple under one edge of one word,
              not the text going under. There is no single position that stays
              at both "never floats" and "always >=2/3 visible" against every
              instant: the water's own swing under the wordmark (~57px) is
              wider than a third of the text (~44px), so the two asks trade
              off against each other. This sits close to the tightest float
              margin the measurement supports, biased toward "more visible."

              The drift is DOWNWARD (+), not upward. A layer further away
              should displace *less* than the page, which reads as drifting
              down as you scroll — up was the near-layer cue, and it also
              lifted the wordmark clean out of the sea. Downward, contact can
              only deepen.

              anchor="top" keeps frame zero identical to the reference. */}
          <Parallax
            anchor="top"
            distance={36}
            className="absolute"
            style={{ left: pctX(29), right: pctX(14), top: pctY(237) }}
          >
            <div
              aria-hidden
              className="flex justify-between whitespace-nowrap font-display uppercase leading-none text-[#FEEDE0]"
              style={{ fontSize: vw(145.1), letterSpacing: vw(7.4) }}
            >
              <span style={{ wordSpacing: vw(-14) }}><HeroWordmarkA />I Driven</span>
              <span style={{ letterSpacing: vw(9.4), marginRight: vw(-9.4) }}>
                Shipping
              </span>
            </div>
          </Parallax>

          <Callout x={114} y={310} drift={-26} bobRef={anchorLabelRef} name="anchor (left)">
            Anchor Change Suggested
          </Callout>
          <Callout x={1213} y={217} drift={-38} bobRef={fuelLabelRef} name="fuel (right)">
            Fuel Anomaly Detected
          </Callout>

          {/* White background of the plate is dropped by multiply, letting the
              wordmark and labels above show through while the ship occludes them
              exactly as it does in the reference. */}
          {/* fetchpriority: this is the page's LCP element, and as a plain
              <img> it would otherwise be discovered at normal priority.

              LAND_MASK_URL takes two things out of this raster: the printed
              ocean, redrawn moving by the canvas in <HeroSea>, and the ship,
              which is redrawn there too as its own layer so it can bob. What is
              left is the sky and the horizon. The three layers sum to the
              artwork at every pixel — freeze them and the hero is the
              illustration, with no seam and no doubled mesh. */}
          <img
            src="/images/hero-ocean.png"
            alt="Cargo ship on a digital ocean, annotated with AI-detected fuel and anchor alerts"
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
        </div>
      </Reveal>
    </section>
  );
}
