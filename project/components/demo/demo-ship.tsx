'use client';

import { useEffect, useRef } from 'react';
import { PauseOffscreen } from '@/components/site/pause-offscreen';
import { ShipWake } from '@/components/home/ship-wake';

/**
 * The site's maritime vessel motif, used on /schedule-demo.
 *
 * Same sprite (public/images/exec-ship.png), same slow linear passage, same
 * particle wake laid down by the propeller (see ship-wake.tsx), sailing the
 * left copy column as a continuation of the site's maritime visual language.
 *
 * Two mechanical differences from the full-width version:
 *
 * - The loop itself: `.ship-sail-anim` spans viewport units, which in a
 *   half-width column would park the ship off the right edge for most of
 *   every cycle. `.ship-sail-contained-anim` spans a percentage of the band
 *   instead, so the crossing fills the column.
 * - The column is much narrower than the full-width version's viewport, so
 *   the ship's own width is a large fraction of it — large enough that a
 *   spatial fade (a mask/clip at the column edges) visibly dissolves the hull
 *   piece by piece as it crosses the boundary, reading as the ship
 *   materialising rather than sailing in. The `contained` effect below hides
 *   the sprite as one whole unit instead: opacity flips only once the entire
 *   hull is inside the column, and again just before any part of it would
 *   start crossing out, so it is always either fully visible or fully hidden,
 *   never a partial silhouette.
 *
 * Decorative throughout — `aria-hidden`, nothing gated on it. Frozen
 * off-screen by PauseOffscreen and, under reduced motion, resolved to a
 * single still frame behind a parked hull.
 */

// Matches the -20% → 120% keyframes of `.ship-sail-contained-anim`. The wake
// only needs these to prime its reduced-motion still frame; the live emitter
// reads the ship's real box each frame.
const SAIL_SPAN_FRACTION = 1.4;
const SAIL_SECONDS = 26;

export function DemoShip({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // The wake emitter reads this element's live box every frame to find where
  // the propeller currently is; the effect below reads the same box to decide
  // whether the whole hull is inside the column.
  const shipRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const img = shipRef.current;
    if (!container || !img) return;

    // Under reduced motion the CSS loop is off and the inline transform below
    // parks the hull mid-column — already fully contained by construction, so
    // there is nothing to track.
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      img.style.opacity = '0.9';
      return;
    }

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const c = container.getBoundingClientRect();
      const s = img.getBoundingClientRect();
      const contained = s.left >= c.left && s.right <= c.right;
      // Matches the sprite's resting `opacity-90` — the effect only ever
      // toggles between that and fully hidden, never changing how solid the
      // hull looks once it's on screen.
      img.style.opacity = contained ? '0.9' : '0';
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    // Hidden below `md`, where the column is the full page width and the copy
    // and form already fill it — matching the full-width version's breakpoint so
    // the particle sim never runs on a phone.
    //
    // `overflow-hidden` is a hard, unambiguous clip — the CSS-only fallback
    // for when the effect above hasn't attached (no JS). With it running, the
    // sprite's opacity is already 0 well before any part of it reaches this
    // boundary, so the hard edge here is never actually seen crossing the
    // hull; it only guards the wake canvas's own edges and the no-JS case.
    <div
      ref={containerRef}
      aria-hidden
      className={`pointer-events-none relative hidden h-[112px] overflow-hidden md:block ${className ?? ''}`}
    >
      <ShipWake
        shipRef={shipRef}
        sailSpanFraction={SAIL_SPAN_FRACTION}
        sailSeconds={SAIL_SECONDS}
      />
      <PauseOffscreen className="absolute inset-0">
        {/* The inline transform is the reduced-motion resting position — the
            CSS loop overrides it whenever it runs — parking the hull a little
            past the middle of the column, mid-passage. */}
        <div
          className="ship-sail-contained-anim relative h-full"
          style={
            {
              '--sail-duration': `${SAIL_SECONDS}s`,
              transform: 'translateX(46%)',
            } as React.CSSProperties
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={shipRef}
            src="/images/exec-ship.png"
            alt=""
            aria-hidden
            draggable={false}
            className="absolute left-0 top-1/2 block h-auto w-[96px] -translate-y-1/2 select-none opacity-90 transition-opacity duration-ui ease-standard lg:w-[112px]"
          />
        </div>
      </PauseOffscreen>
    </div>
  );
}
