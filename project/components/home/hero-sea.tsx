'use client';

import { useCallback, useRef, useState } from 'react';
import { HeroWaves } from '@/components/home/hero-waves';
import type { ShipPose } from '@/components/home/hero-water-flow';
import {
  SHIP_BOX,
  SHIP_DY_PCT_PER_REF_PX,
  SHIP_PIVOT,
  SHIP_URL,
  WATER_BAND,
  WATER_STILL_URL,
} from '@/components/home/hero-water-geometry';

// ---------------------------------------------------------------------------
// The sea and the thing floating on it.
//
// Two layers that have to agree: <HeroWaves> paints waves.svg's own surface
// flowing outward from the bow, and the ship rides it. The ship is not running
// an animation of its own — the renderer reads the contour it just drew, right
// across the hull's waterline, and reports the seat; this only applies it. Stop
// the water and the ship stops with it, in the same instant and at whatever
// height the frozen surface leaves it.
//
// The transform is written straight to the node rather than through state: this
// arrives up to 30 times a second, and re-rendering the hero at that rate to
// move one image would cost far more than the movement is worth. The one thing
// that does go through state is whether the canvas has ever painted, which
// happens once.
//
// Under both of them sits the printed ocean, which is what the hero shows until
// the canvas has something of its own — and, with JavaScript off or the wave
// field unreachable, permanently. It is not a poster for a loading spinner: at
// frame zero the canvas draws this same sea, so the handover is invisible.
//
// It blends with `multiply`, like the plate it was cut from, and for the same
// reason: the left callout's label sits inside the water band, under all of
// this. An opaque still covered it outright — multiply lets it through, exactly
// as the undivided artwork did.
// ---------------------------------------------------------------------------

export function HeroSea({
  onPose: onExternalPose,
}: {
  /**
   * Called with the same pose the hull rides, every frame the water draws
   * one. The two callout leader lines are baked into the ship layer below —
   * cut from the same raster, riding the same rigid transform — so anything
   * outside this file that wants to track them (hero.tsx's callout labels,
   * so the text stays with the arrow it is attached to rather than sitting
   * dead still under it) reads its motion from here rather than approximating
   * a second copy of it.
   */
  onPose?: (pose: ShipPose) => void;
} = {}) {
  const shipRef = useRef<HTMLImageElement>(null);
  const [painted, setPainted] = useState(false);
  const everPainted = useRef(false);

  const onPose = useCallback(
    ({ dy, roll }: ShipPose) => {
      // The first pose is the canvas's first frame; after that the still below is
      // redundant and would only show through the semi-transparent washes. Latched
      // on a ref so the other thirty of these a second don't reach React at all.
      if (!everPainted.current) {
        everPainted.current = true;
        setPainted(true);
      }
      const el = shipRef.current;
      if (el) {
        el.style.transform =
          `translate3d(0, ${(dy * SHIP_DY_PCT_PER_REF_PX).toFixed(4)}%, 0)` +
          ` rotate(${roll.toFixed(4)}deg)`;
      }
      onExternalPose?.({ dy, roll });
    },
    [onExternalPose]
  );

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={WATER_STILL_URL}
        alt=""
        aria-hidden
        decoding="async"
        className="pointer-events-none absolute left-0 bottom-0 w-full mix-blend-multiply transition-opacity duration-ui ease-standard"
        style={{ top: WATER_BAND.top, opacity: painted ? 0 : 1 }}
      />
      <HeroWaves onPose={onPose} />
      {/* The hull, the superstructure and both callout leaders, cut out of the
          plate with a real alpha channel (scripts/build-hero-masks.py). Normal
          blending, not the plate's `multiply`: multiplied against the water
          below it the hull would darken every time a wash passed under it.

          It renders untransformed, so with JavaScript off — or before the water
          has loaded — the hero is the artwork, at rest, exactly as drawn. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={shipRef}
        src={SHIP_URL}
        alt=""
        aria-hidden
        // Named, so scripts/check-sea-ship.js can find this layer rather than
        // whichever decorative image happens to come first.
        data-hero-ship
        fetchPriority="high"
        decoding="async"
        className="pointer-events-none absolute"
        style={{
          left: SHIP_BOX.left,
          top: SHIP_BOX.top,
          width: SHIP_BOX.width,
          height: SHIP_BOX.height,
          transformOrigin: SHIP_PIVOT,
          willChange: 'transform',
        }}
      />
    </>
  );
}
