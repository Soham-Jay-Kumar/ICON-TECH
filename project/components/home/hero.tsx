'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Reveal } from '@/components/site/reveal';
import { Parallax } from '@/components/site/scroll';
import { HeroSea } from '@/components/home/hero-sea';
import { HeroWordmarkA } from '@/components/home/hero-wordmark-a';
import {
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
// reduced-motion branch below — setting the sub-line visible in a layout
// effect means it is never painted in its hidden state on the frame React
// hydrates, which is the hidden-then-visible flash reveal.tsx also avoids.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function Callout({
  x,
  y,
  drift,
  bobRef,
  name,
  sub,
  subDelay = 900,
  leaderSide,
  children,
}: {
  x: number;
  y: number;
  /**
   * Stable handle for scripts/check-callout-track.js, whose TIPS map keys off
   * it. POSITIONAL, not semantic — it names which side of the hull the label
   * sits on, not what the label says, so retitling the copy leaves it alone.
   */
  name: string;
  /**
   * Supporting line under the label — what the agent DOES about the alert
   * above it. Rendered inside the same bobbing span as the label (see
   * `bobRef`), never as a sibling, so it is carried by the hull's transform
   * as part of the same annotation rather than drifting against it.
   */
  sub?: React.ReactNode;
  /**
   * When the sub-line rises in, ms after mount. It answers the alert, so it
   * lands after the tide has filled rather than with it (TRANSITIONS.md §5).
   */
  subDelay?: number;
  /**
   * Which side this callout's leader line approaches from — and therefore the
   * side the scrim behind the text must NOT overhang.
   *
   * The two callouts are mirrored, and their clearances are wildly different.
   * Left callout: text ends 468.7 with its arrowhead at 522, so ~53px spare on
   * the right. Right callout: text starts 1102 with its leader tip at 1095, so
   * barely 7px spare on the left. A symmetric wash would be safe on one and
   * would pale the dark leader on the other, so the overhang is asymmetric and
   * this says which way round.
   */
  leaderSide: 'left' | 'right';
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
  // The sub-line's entrance is timed from mount, NOT driven by <Reveal>.
  //
  // Reveal is observer-driven, and this element lives inside the ocean plate —
  // which is itself a `mask` Reveal, i.e. `clip-path: inset(0 0 100% 0)` until
  // the tide fills in. A clip-collapsed ancestor reports 0% intersection for
  // everything inside it, so a nested Reveal here cannot fire until the clip
  // has opened past this label, and then stacks its own delay on top of that.
  // Measured: the sub-lines were still hidden 3s after load. That interaction
  // is the one CLAUDE.md warns about; a timer sidesteps it entirely, and is
  // the honest mechanism anyway — the hero is above the fold, so there is no
  // scroll event to wait for and nothing for an observer to tell us.
  //
  // Shared motion tokens only (duration-reveal / ease-premium), and the hidden
  // state is scoped to `[.js_&]` exactly as Reveal's own is, so the line is
  // visible — not blank — if JavaScript never runs.
  const [subIn, setSubIn] = useState(false);
  useIsomorphicLayoutEffect(() => {
    if (!sub) return;
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setSubIn(true);
      return;
    }
    const t = window.setTimeout(() => setSubIn(true), subDelay);
    return () => window.clearTimeout(t);
  }, [sub, subDelay]);

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
      className="absolute z-20 hidden md:block"
      style={{ left: pctX(x), top: pctY(y) }}
    >
      <span
        ref={bobRef}
        data-callout-label={name}
        className="block whitespace-nowrap font-normal uppercase leading-none text-[#072637]"
        style={{
          // Poppins (the body face, inherited — no `font-display` here), at
          // REGULAR (400) with no added tracking, which is the reference's own
          // voice.
          //
          // This was briefly semibold with 0.015em, and that was the mistake:
          // measured off reference/01-hero.png, its label runs 0.563 em per
          // character against 0.615 for semibold+tracking — the whole
          // difference between the two is weight, not size. The reference's
          // type is ~21.4px and this is 21.75px, so the size was already
          // right; going bolder is what made it read chunky and cramped.
          //
          // Weight was picked by measurement, not by eye, and medium was a
          // near miss: rendered, Poppins medium uppercase is 0.590 em/char
          // (270px here), where the reference measures 0.563 (253px at its own
          // 21.4px, i.e. 257px at ours). Regular is the 5% narrower face that
          // lands on it — 258px — so 400, not 500, is what the reference is
          // actually set in.
          //
          // The LEFT label's `x` is set against this width (see the call
          // site): its leader is drawn inside the ship raster with a 14px-thick
          // arrowhead at plate x 522-528, and the text grows rightward into it.
          // The right callout has mirrored geometry — its leader runs away
          // leftward from x 1095 while the text runs right from 1102 — so it
          // never collides.
          fontSize: `max(${cqw(29)}, 13px)`,
          // The ship's own roll pivot, expressed relative to this label's box.
          // Hero.tsx writes the hull's exact transform here — the same
          // translate and the same rotate — so the label is carried as part of
          // the ship's rigid body, which is what its leader line already is.
          // Rotating about a pivot this far outside the box is the point: it
          // resolves into the translation the leader's own tip undergoes, and
          // that is what keeps the join between text and arrow fixed.
          //
          // In cqw (plate-relative) rather than vw: the pivot is a distance in
          // plate reference px, so one reference px is one (100/1560)cqw of the
          // PLATE. The plate is full-bleed, so this equals vw today — cqw just
          // keeps it correct against the plate rather than the window.
          transformOrigin: `${cqw(SHIP_PIVOT_REF.x - x)} ${cqw(SHIP_PIVOT_REF.y - y)}`,
          transform: `scale(${HERO_SHIP_SCALE})`,
          willChange: 'transform',
        }}
      >
        {/* A feathered white wash behind the type — no border, no shadow, no
            edge, so it reads as air rather than as a card.

            It earns its place because the reference's callouts sat on clean
            white and these no longer do. The watermark now runs plate y
            232-370 while this label sits at 309-325, i.e. directly over the
            letters, and the sub-line below it lands in a wave lattice that is
            100% non-white. The type was losing to two layers that were never
            behind it in the artwork.

            A radial gradient, NOT `filter: blur()`. `onShipPose` rewrites this
            span's transform every frame, and a blurred child would be
            re-composited on each of them; a gradient costs nothing per frame.

            The overhang is asymmetric — see `leaderSide`. Washing over a
            leader would pale it, and the right callout has only ~7px of
            clearance to its tip. */}
        <span
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            // Feathering is done with `filter: blur`, not by a gradient's own
            // stops. A radial gradient reaches its transparent stop on an
            // ELLIPSE while the element is a RECTANGLE, so unless the ellipse
            // is inscribed well inside the box the corners and edge midpoints
            // are still opaque where the box ends — which draws exactly the
            // hard rectangle this is meant to avoid. Blur has no such problem:
            // it softens every side equally, whatever the shape.
            //
            // The cost worry is unfounded here. `onShipPose` rewrites the
            // PARENT's transform each frame, but a transform-only change
            // re-composites this layer rather than re-running its filter, so
            // the blur is rasterised once.
            //
            // The insets are asymmetric because the blur is not: it spreads
            // ~0.3em in every direction, and on the leader side that would
            // wash the dark arrow pale. So the box is pulled INWARD on
            // whichever side the leader approaches from (see `leaderSide`) —
            // the right callout has only ~7px between its text and its tip —
            // and pushed outward on the other three.
            top: '-0.28em',
            bottom: '-0.28em',
            left: leaderSide === 'left' ? '0.15em' : '-0.55em',
            right: leaderSide === 'right' ? '0.15em' : '-0.55em',
            background: 'rgba(255,255,255,0.88)',
            borderRadius: '0.4em',
            filter: 'blur(0.3em)',
          }}
        />
        <span className="relative block">{children}</span>
        {sub ? (
          // `lg` rather than the label's `md`: the whole callout is scaled by
          // HERO_SHIP_SCALE, so below that the sub-line gets too small to
          // read. The label's own floor at `md` is pre-existing.
          <span className="relative hidden lg:block" style={{ marginTop: cqw(6) }}>
            <span
              data-callout-sub={name}
              className={
                'block normal-case font-normal text-[#0C3D59] ' +
                'transition-[clip-path,opacity] duration-reveal ease-premium ' +
                'motion-reduce:transition-none ' +
                (subIn
                  ? '[clip-path:inset(0)] opacity-100'
                  : '[.js_&]:[clip-path:inset(0_100%_0_0)] [.js_&]:opacity-0')
              }
              // The line WIPES IN left to right rather than rising: the alert
              // is stated, then its answer is written underneath it, the way a
              // readout prints. It is the one gesture the hero did not already
              // own — the headline rises out of a mask, the ocean fills from
              // the waterline, both vertical — so the horizontal sweep reads
              // as a different kind of event rather than a third copy of the
              // same one, and it runs along the line of reading.
              //
              // Animating clip-path here is safe precisely because this is NOT
              // inside a Reveal: a clip-collapsed node reports 0% intersection
              // forever, which is why Reveal keeps its own clip on an inner
              // wrapper and why the entrance here is driven by the mount timer
              // above instead of an observer.
              //
              // 0.727em against the label, which is +3px on screen (12.75 ->
              // 15.81) to match the label's own +3. Expressed as an em so the
              // pair stays locked whatever the label does. #0C3D59 rather than
              // the old #54778A: the previous pairing was too small and too
              // pale to hold against the wave lattice behind it. Still well
              // inside the width budget — the longer sub-line ends ~1321
              // against a 1560 frame.
              style={{ fontSize: '0.727em' }}
            >
              {sub}
            </span>
          </span>
        ) : null}
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
    // cqw (plate-relative), not vw: the labels live in the plate and their bob
    // must be a fraction of the PLATE's width to stay welded to the hull's own,
    // which the canvas draws at the plate's scale. The plate is full-bleed, so
    // this equals vw today — but cqw is the unit that stays correct if the
    // plate is ever sized to anything other than the whole viewport width.
    const t =
      `translate3d(0, ${cqw(dy)}, 0) ` +
      `rotate(${roll.toFixed(4)}deg) scale(${HERO_SHIP_SCALE})`;
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
              fontSize: `min(clamp(2.75rem, ${vw(HEADING_REF_SIZE)}, ${HEADING_MAX_SIZE}), ${HEADING_H_CAP})`,
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

            {/* The two sub-lines land 100ms apart, left first, so the pair
                reads as a sequence rather than both popping symmetrically —
                the same "a sequence, not a flat group" the rest of the hero
                is built on. */}
            {/* x 114 -> 30. At the label's new size its text is ~299px wide,
                and from the old x it ran to plate 578 — straight over the
                arrowhead at 522-528, which showed as a pale wedge stabbing
                through the last two letters of "DROPS". From 30 the text
                starts at 215 and ends at 514, clearing the head by 8px with
                the line still running on to the hull. `transformOrigin` is
                derived from `x`, so the weld to that leader follows the move
                automatically; scripts/check-callout-track.js keys off the
                declared position and has been updated to match. */}
            <Callout
              x={30}
              y={310}
              drift={-26}
              bobRef={anchorLabelRef}
              name="anchor (left)"
              leaderSide="right"
              sub="Turn insight into action"
              subDelay={900}
            >
              Hull Performance Drops
            </Callout>
            <Callout
              x={1213}
              y={217}
              drift={-38}
              bobRef={fuelLabelRef}
              name="fuel (right)"
              leaderSide="left"
              sub="Investigate. Validate. Drive Action"
              subDelay={1000}
            >
              Fuel Anomaly Detected
            </Callout>

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
          </div>
        </div>
      </Reveal>
    </section>
  );
}
