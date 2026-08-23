'use client';

import { useEffect, useRef } from 'react';
import {
  WATER_BAND,
  WATER_FIELD_URL,
} from '@/components/home/hero-water-geometry';
import {
  createWaveRenderer,
  MAX_STEP,
  parseWaveField,
  type ShipPose,
  type WaveRenderer,
} from '@/components/home/hero-water-flow';

// ---------------------------------------------------------------------------
// HeroWaves — the ocean of waves.svg, flowing.
//
// There is no second wave design here, no overlay and no footage: this canvas
// *is* the water. Every frame it redraws waves.svg's own marks — the same
// contours, the same Catmull-Rom smoothing, the same wash gradients, the same
// dot pitch, colour, width and opacity — with the surface carried outward from
// the bow. hero-water-flow.ts owns that model.
//
// (An earlier version put a generated video clip in front of this and kept the
// canvas as a fallback. The clip was a different sea, and it was ping-pong
// looped, so the water ran outward and then back inward every ten seconds. Both
// are gone; if you are tempted to reach for footage again, note that a reversing
// loop is the one thing the water must never do.)
//
// Freeze it and the hero is the illustration: the base <img> has the printed
// ocean masked out and the canvas paints exactly the pixels it gave up, so the
// two reassemble the plate with no seam.
//
// The drawing itself goes to a worker (hero-water-worker.ts) wherever
// OffscreenCanvas allows — it is far too expensive to run on the thread that
// also has to scroll the page. Where it does not, the same renderer runs here
// at a lower cadence. Either way the clock stops when nobody is watching:
// off-screen, on a hidden tab, or under prefers-reduced-motion, where it shows
// a single untouched frame and never runs again.
//
// Each frame also reports where the hull is sitting on the surface it just
// drew; `onPose` hands that to the ship layer in hero-sea.tsx. The first of
// those doubles as "the canvas has painted", which is what takes the still
// fallback underneath it away.
// ---------------------------------------------------------------------------

/**
 * Cadence for the main-thread fallback. Every redraw here is a redraw the page
 * cannot use for anything else, so it is deliberately slower than the worker's
 * — the water is a background, and scrolling is not.
 */
const FALLBACK_MS = 1000 / 15;

/** How long to wait for the worker to come up before drawing here instead. */
const WORKER_TIMEOUT = 4000;

/**
 * Where the band sits on the plate. Nothing is masked out of the water any
 * more: the hull and the two leaders are their own layer above this one, so the
 * sea is painted continuously across the band and simply runs behind them.
 * There is no ring where neither layer paints — that ring was the halo.
 */
const waterLayerStyle = {
  top: WATER_BAND.top,
  height: WATER_BAND.height,
} as const;

const LEVEL: ShipPose = { dy: 0, roll: 0 };

export function HeroWaves({
  onPose,
}: {
  /** Called with the hull's seat on the surface, in reference px and degrees. */
  onPose?: (pose: ShipPose) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef(onPose);
  poseRef.current = onPose;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    let disposed = false;
    let visible = false;
    let onTab = typeof document === 'undefined' || !document.hidden;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    const emit = (pose: ShipPose) => poseRef.current?.(pose);

    const dpr = () => window.devicePixelRatio || 1;
    const cssWidth = () => canvas.getBoundingClientRect().width;

    // --- whichever engine ends up driving the canvas, it answers to these ---
    let start: (on: boolean) => void = () => {};
    let resize: () => void = () => {};
    let rewind: () => void = () => {};

    const sync = () => {
      const want = visible && onTab && !reduce?.matches;
      start(want);
      // Whether the clock is running, published so it can be asserted from
      // outside (scripts/check-orange-fixes.js, O11).
      canvas.dataset.flowing = String(want);
    };

    // ---- main-thread engine ------------------------------------------------
    // Also the worker's fallback, so it has to be able to take over a canvas
    // that was never transferred.
    const runHere = () => {
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return;
      let renderer: WaveRenderer | null = null;
      let raf = 0;
      let elapsed = 0;
      let last = 0;
      let painted = 0;

      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        elapsed += last ? Math.min((now - last) / 1000, MAX_STEP) : 0;
        last = now;
        if (painted && now - painted < FALLBACK_MS - 1) return;
        painted = now;
        // Sizing is the ResizeObserver's job — measuring the element here
        // would force a layout on every redraw.
        renderer!.draw(elapsed);
        emit(renderer!.pose);
      };

      start = (on) => {
        if (on && !raf && renderer) {
          last = 0;
          painted = 0;
          raf = requestAnimationFrame(frame);
        } else if (!on && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      };
      resize = () => {
        if (renderer?.resize(cssWidth(), dpr())) renderer.draw(elapsed);
      };
      rewind = () => {
        elapsed = 0;
        renderer?.draw(0);
        emit(LEVEL);
      };

      fetch(WATER_FIELD_URL)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then((buf) => {
          if (disposed) return;
          renderer = createWaveRenderer(ctx, parseWaveField(buf));
          renderer.resize(cssWidth(), dpr());
          renderer.draw(0); // frame zero: waves.svg, untouched
          emit(renderer.pose); // ...and the first pose, which says it painted
          // A handle for scripts/grab-hero.js, which has to draw a chosen
          // instant rather than whatever the wall clock has reached. Capturing
          // this water in real time cannot work: a screenshot costs about a
          // second, and at the speed the surface travels that samples it far
          // below its own Nyquist rate and reports aliased nonsense. Dev only —
          // `process.env.NODE_ENV` is substituted at build time, so this block
          // is dead code eliminated from a production bundle.
          if (process.env.NODE_ENV !== 'production') {
            (window as unknown as Record<string, unknown>).__heroWater = {
              draw: (t: number) => {
                renderer!.draw(t);
                return { ...renderer!.pose };
              },
            };
          }
          sync();
        })
        .catch(() => {
          /* no field, no water — the plate keeps the ship and the white page */
        });
    };

    // ---- worker engine -----------------------------------------------------
    // The canvas is only handed over once the worker has answered: nothing can
    // take it back after transferControlToOffscreen, so a worker that never
    // loads must cost a wait, not the water.
    let worker: Worker | undefined;

    const runThere = () => {
      try {
        worker = new Worker(new URL('./hero-water-worker.ts', import.meta.url));
      } catch {
        runHere();
        return;
      }

      let handedOver = false;
      const fallBack = () => {
        window.clearTimeout(giveUp);
        if (handedOver || disposed) return;
        worker?.terminate();
        worker = undefined;
        runHere();
      };
      const giveUp = window.setTimeout(fallBack, WORKER_TIMEOUT);

      worker.onerror = fallBack;
      worker.onmessage = (
        e: MessageEvent<{ type: string; dy?: number; roll?: number }>
      ) => {
        if (disposed) return;
        if (handedOver) {
          if (e.data.type === 'pose') {
            emit({ dy: e.data.dy ?? 0, roll: e.data.roll ?? 0 });
          }
          return;
        }
        if (e.data.type !== 'ready') {
          fallBack();
          return;
        }
        handedOver = true;
        window.clearTimeout(giveUp);

        const offscreen = canvas.transferControlToOffscreen();
        worker!.postMessage(
          { type: 'canvas', canvas: offscreen, cssWidth: cssWidth(), dpr: dpr() },
          [offscreen]
        );
        start = (on) => worker?.postMessage({ type: 'run', on });
        resize = () =>
          worker?.postMessage({ type: 'resize', cssWidth: cssWidth(), dpr: dpr() });
        rewind = () => {
          worker?.postMessage({ type: 'rewind' });
          emit(LEVEL);
        };
        sync();
      };

      worker.postMessage({ type: 'load', url: WATER_FIELD_URL });
    };

    if (typeof Worker !== 'undefined' && 'transferControlToOffscreen' in canvas) {
      runThere();
    } else {
      runHere();
    }

    // ---- when to run -------------------------------------------------------
    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          sync();
        },
        { rootMargin: '128px' }
      );
      io.observe(canvas);
    } else {
      visible = true;
    }

    const onTabChange = () => {
      onTab = !document.hidden;
      sync();
    };
    document.addEventListener('visibilitychange', onTabChange);

    const onPref = () => {
      if (reduce?.matches) rewind();
      sync();
    };
    reduce?.addEventListener?.('change', onPref);

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => resize())
        : undefined;
    ro?.observe(canvas);

    return () => {
      disposed = true;
      start(false);
      worker?.terminate();
      io?.disconnect();
      ro?.disconnect();
      document.removeEventListener('visibilitychange', onTabChange);
      reduce?.removeEventListener?.('change', onPref);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute left-0 w-full"
      style={waterLayerStyle}
    />
  );
}
