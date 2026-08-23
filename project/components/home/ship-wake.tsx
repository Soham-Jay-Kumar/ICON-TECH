'use client';

import { useEffect, useRef } from 'react';

/**
 * ShipWake — the propeller wash behind the execution-deck vessel.
 *
 * This is an *emitter*, not a trail graphic. The wake used to be a single
 * dotted gradient strip parented to the ship, so the dots were rigidly welded
 * to the hull and slid across the band with it — a pre-made trail the ship
 * happened to sit in front of. Here the ship and the water are separate
 * systems:
 *
 *   - The ship still sails on its own CSS loop (`.ship-sail-anim`). Nothing
 *     about its artwork, size or path changed.
 *   - This canvas is a *sibling* of that translating group, so it lives in the
 *     band's own coordinate space and never inherits the ship's transform.
 *   - Every frame it reads where the propeller actually is (from the ship
 *     element's box) and spawns a few new particles right at it. Once born, a
 *     particle owns its position and velocity: it keeps the small astern jet
 *     the propeller gave it, bleeds that off against the water (exponential
 *     drag), spreads sideways, and fades out continuously over its own
 *     lifetime.
 *
 * Because a particle's velocity settles near zero, it effectively *stays in
 * the water* while the hull pulls away from it — which is what makes the wake
 * read as generated rather than towed. Lifetimes, sizes, opacities, sway and
 * the sideways spread are all randomised per particle, so the trail frays and
 * never resolves into an evenly spaced row of dots, and the alpha curve runs
 * to exactly 0 so nothing ever pops out of existence.
 *
 * Rendering is one pre-rendered soft radial sprite blitted additively — that
 * buys the subtle bloom/blur without per-particle gradient work and without a
 * filter on the compositor.
 *
 * Costs and constraints, in keeping with the motion spec:
 *   - Decorative only (`aria-hidden`, no content gated on it): if JS never
 *     runs the ship simply sails without a wake.
 *   - The loop idles itself when the band is off-screen — the same condition
 *     `PauseOffscreen` uses on the ship — so the two freeze and resume
 *     together and nothing composites off-screen.
 *   - Under `prefers-reduced-motion` no loop runs at all. The simulation is
 *     stepped once, offline, behind a virtual ship travelling at the CSS
 *     loop's own speed, and the resulting single frame is painted behind the
 *     parked hull: a still wake, not an animated one.
 */

// Where the propeller sits inside the ship sprite (bow points right, so the
// stern is the left edge). Measured off public/images/exec-ship.png.
const PROP_X = 0.02;
const PROP_Y = 0.58;

// New particles per second. Enough that the churn at the stern reads as foam
// rather than as countable dots, few enough that the tail stays airy.
const EMIT_RATE = 54;

// Reference ship width (the `w-[96px]` sprite) that the particle sizes and
// speeds below are tuned against; everything scales off the measured width so
// the `lg:w-[112px]` ship gets a proportionally larger wake.
const REF_SHIP_W = 96;

// How fast the water bleeds a particle's velocity off, per second. High enough
// that the astern jet is spent within roughly a second, leaving the particle
// hanging in the water while the hull sails on.
const DRAG = 1.35;

// Longest life any particle can be given — also how far back the simulation
// has to be primed for the reduced-motion still frame.
const MAX_LIFE = 8;

// The band scrolls in and out of view; match PauseOffscreen's rootMargin so
// the wake and the ship freeze on the same boundary.
const OFFSCREEN_MARGIN = 128;

// The CSS loop in globals.css: translateX(-25vw → 112vw) over --sail-duration.
// Only needed to fake a moving ship for the reduced-motion still frame.
const SAIL_SPAN_VW = 137;
const SAIL_SECONDS = 34;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  /** Birth radius, in CSS px. */
  r: number;
  /** How much the particle swells as it dissipates, as a fraction of `r`. */
  grow: number;
  /** Peak alpha, reached just after birth. */
  a: number;
  /** Sway phase/rate/amplitude — a slow lateral wander so the trail is never a ruled line. */
  ph: number;
  fq: number;
  sw: number;
  /** Undamped lateral creep, so the wake keeps opening out into a V behind the hull. */
  sy: number;
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** One soft white disc, pre-rendered once and blitted per particle. */
function makeSprite() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  if (!g) return c;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  // A bright but small core with a long, very soft skirt: the skirt is what
  // reads as spray/blur once a few particles overlap, the core is what keeps a
  // fresh particle legible as a droplet rather than a smudge.
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.72)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.22)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/**
 * Spawn one particle at the propeller, with its own randomised character.
 *
 * Three populations, mixed: the boil right at the screw (wide, brief, thrown
 * hard astern), the droplets that make up the body of the trail, and the slow
 * foam patches that outlive them and dissolve into haze. Mixing them is what
 * keeps the wake from resolving into one repeated dot at one repeated spacing.
 */
function emit(list: Particle[], px: number, py: number, scale: number) {
  const roll = Math.random();
  const boil = roll < 0.22;
  const patch = !boil && roll > 0.87;

  list.push({
    x: px + rand(-3.5, 3.5) * scale,
    y: py + rand(-2.4, 2.4) * scale,
    // The astern jet: water thrown backwards by the screw, which the drag
    // above spends within about a second.
    vx: (boil ? rand(-74, -28) : rand(-46, -10)) * scale,
    vy: (boil ? rand(-26, 26) : rand(-16, 16)) * scale,
    age: 0,
    life: boil ? rand(0.45, 1.15) : patch ? rand(4.5, MAX_LIFE) : rand(2.6, 6.4),
    r: (boil ? rand(1.8, 3.4) : patch ? rand(2.4, 4.2) : rand(0.7, 2.2)) * scale,
    grow: boil ? rand(1.4, 2.4) : patch ? rand(0.9, 1.6) : rand(0.5, 1.2),
    a: boil ? rand(0.1, 0.2) : patch ? rand(0.06, 0.13) : rand(0.16, 0.4),
    ph: Math.random() * Math.PI * 2,
    fq: rand(0.5, 1.5),
    sw: rand(1, 3.4) * scale,
    sy: rand(-2.6, 2.6) * scale,
  });
}

/** Advance the whole field by `dt` seconds, dropping anything that has expired. */
function step(list: Particle[], dt: number) {
  const decay = Math.exp(-DRAG * dt);
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.age += dt;
    if (p.age >= p.life) {
      // Cheap unordered removal — draw order carries no meaning here.
      list[i] = list[list.length - 1];
      list.pop();
      continue;
    }
    p.x += p.vx * dt;
    // The jet dies against the water; the slow creep does not, so the trail
    // keeps opening out the further back it gets.
    p.y += (p.vy + p.sy) * dt;
    p.vx *= decay;
    p.vy *= decay;
  }
}

function draw(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  list: Particle[],
  w: number,
  h: number
) {
  ctx.clearRect(0, 0, w, h);
  // Additive: overlapping particles build brightness the way churned water
  // does, and a lone dying particle can never leave a dark edge behind.
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    const t = p.age / p.life;
    // Fast attack so a particle is at its brightest right at the propeller,
    // then a continuous ease-out to exactly zero — no cut-off frame.
    const attack = Math.min(1, p.age / 0.09);
    const alpha = p.a * attack * (1 - t) * (1 - t) * (1 - t * 0.35);
    if (alpha <= 0.002) continue;
    const r = p.r * (1 + p.grow * t);
    // The sprite's soft skirt needs several radii of room to fall off in.
    const d = r * 6.4;
    const y = p.y + Math.sin(p.ph + p.age * p.fq * Math.PI * 2) * p.sw * Math.min(1, p.age);
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, p.x - d / 2, y - d / 2, d, d);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

export function ShipWake({
  shipRef,
  sailSpanFraction,
  sailSeconds = SAIL_SECONDS,
}: {
  shipRef: React.RefObject<HTMLElement>;
  /**
   * How far the ship travels each loop, as a fraction of the *band's* own
   * width, for callers using the contained `.ship-sail-contained-anim` loop
   * instead of the viewport-unit one. Left unset, the still frame is primed
   * against the full-bleed loop's viewport-relative speed.
   *
   * This only affects the reduced-motion still frame — the live emitter reads
   * the ship's real box every frame and needs no notion of the path at all.
   */
  sailSpanFraction?: number;
  /** Seconds per loop, i.e. the `--sail-duration` the band is running. */
  sailSeconds?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const sprite = makeSprite();
    const particles: Particle[] = [];

    // CSS pixel size of the canvas box, kept in sync by the ResizeObserver.
    let w = 0;
    let h = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /**
     * Where the propeller is right now, in canvas-local CSS pixels, plus how
     * much to scale the particles by. Read from the live box of the sailing
     * ship, so the emitter tracks whatever the CSS loop is doing without this
     * file having to know the path.
     */
    const propeller = () => {
      const ship = shipRef.current;
      if (!ship) return null;
      const s = ship.getBoundingClientRect();
      if (!s.width) return null;
      const c = canvas.getBoundingClientRect();
      return {
        x: s.left - c.left + s.width * PROP_X,
        y: s.top - c.top + s.height * PROP_Y,
        scale: s.width / REF_SHIP_W,
      };
    };

    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Reduced motion: one still frame, no loop. --------------------------
    // The ship is parked by its inline transform, so there is no measurable
    // motion to emit against. Instead the field is primed offline behind a
    // virtual ship that sails at the CSS loop's own speed and arrives exactly
    // at the parked propeller, then painted once.
    if (reduce) {
      const settle = () => {
        resize();
        // Below `md` the whole vessel is display:none, so there is nothing to
        // paint into.
        if (!w || !h) return;
        const prop = propeller();
        if (!prop) return;
        particles.length = 0;
        const dt = 1 / 60;
        const speed =
          sailSpanFraction !== undefined
            ? (sailSpanFraction * w) / sailSeconds
            : (SAIL_SPAN_VW / sailSeconds) * (window.innerWidth / 100);
        let carry = 0;
        for (let t = MAX_LIFE; t > 0; t -= dt) {
          const x = prop.x - speed * t;
          carry += EMIT_RATE * dt;
          while (carry >= 1) {
            carry -= 1;
            emit(particles, x, prop.y, prop.scale);
          }
          step(particles, dt);
        }
        draw(ctx, sprite, particles, w, h);
      };

      settle();
      const ro = new ResizeObserver(settle);
      ro.observe(canvas);
      return () => ro.disconnect();
    }

    // ---- The live emitter. --------------------------------------------------
    let raf = 0;
    let last = 0;
    let carry = 0;
    // Last frame's propeller position, so a frame's worth of particles can be
    // laid down along the path it swept rather than all at one point.
    let prev: { x: number; y: number } | null = null;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);

      // Below `md` the whole vessel is display:none: no box, nothing to
      // simulate, and no reason to burn a frame on it.
      if (!w || !h) {
        last = now;
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const vh = window.innerHeight || 0;
      // Idle while the band is off-screen — the ship's own animation is paused
      // on the same boundary, so both resume from where they stopped.
      if (rect.bottom < -OFFSCREEN_MARGIN || rect.top > vh + OFFSCREEN_MARGIN) {
        last = now;
        prev = null;
        return;
      }

      // A generous clamp: after a background tab or a long frame, advance the
      // field a little rather than teleporting every particle.
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;

      const prop = propeller();
      if (prop) {
        // Only emit while the stern is anywhere near the band — the loop parks
        // the ship well off both edges for part of its cycle.
        const near = prop.x > -60 && prop.x < w + 60;
        carry += EMIT_RATE * dt;
        const n = Math.floor(carry);
        carry -= n;

        if (near && n > 0) {
          for (let i = 0; i < n; i++) {
            // Spread this frame's particles along the path the propeller
            // actually swept since the last frame. Without this the emission
            // is quantised to frame boundaries and beads up into visible rows
            // whenever the frame rate dips.
            const k = prev ? (i + 1) / n : 1;
            const x = prev ? prev.x + (prop.x - prev.x) * k : prop.x;
            const y = prev ? prev.y + (prop.y - prev.y) * k : prop.y;
            emit(particles, x, y, prop.scale);
          }
        }
        prev = near ? prop : null;
      } else {
        prev = null;
      }

      step(particles, dt);
      draw(ctx, sprite, particles, w, h);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [shipRef, sailSpanFraction, sailSeconds]);

  // A canvas is a replaced element, so `inset-x-0` alone loses to its
  // intrinsic 300x150 box — the size is set explicitly instead. The 2rem of
  // bleed above and below is room for the wake's vertical spread.
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute -inset-y-8 left-0 block h-[calc(100%+4rem)] w-full"
    />
  );
}
