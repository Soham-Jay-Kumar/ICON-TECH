'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Runs before paint on the client, no-ops on the server — so the reset to 0
// happens before the browser ever paints the hydrated final value (no flash of
// the finished number before the count starts).
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type AnimatedStatProps = {
  value: string;
  className?: string;
  /** Runs the count once this flips true; ignored after the first count starts. */
  active: boolean;
  /** Fired two-thirds of the way through this count's own run (see below). */
  onTwoThirds?: () => void;
  /** Fired the instant the count reaches its final value. */
  onComplete?: () => void;
};

function parseStat(value: string): { end: number; suffix: string } {
  const match = value.match(/^(\d+)(.*)$/);
  if (!match) return { end: 0, suffix: value };
  return { end: Number(match[1]), suffix: match[2] };
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Fraction of the nominal duration (0–1) at which the *rounded* displayed
 * integer reaches `end`. Because of rounding this happens before t=1 — e.g.
 * for end=30 it lands at t≈0.744 — so it's the right reference point for
 * "N% of the way through this count", not the nominal duration itself.
 */
function completionFraction(end: number) {
  if (end <= 0) return 0;
  return 1 - Math.cbrt(0.5 / end);
}

function readDurationMs(): number {
  if (typeof window === 'undefined') return 1600;
  // The count is a headline moment, so it runs on the epic tier — a slow,
  // clearly-legible tick rather than a blink. Under reduced motion this var is
  // ~0 and the caller snaps straight to the final value.
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--motion-duration-epic')
    .trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 1600;
}

/**
 * Counts from 0 to the leading integer in `value` once `active` is true.
 * "24/7" → 0…24 then "/7"; "30%" → 0…30 then "%".
 * Falls back to the final string immediately under reduced motion.
 *
 * Sequencing multiple stats (one waiting for the previous to finish before
 * it starts) is the caller's job via `active`/`onComplete` — this component
 * only knows how to run its own count once told to.
 */
export function AnimatedStat({
  value,
  className,
  active,
  onTwoThirds,
  onComplete,
}: AnimatedStatProps) {
  const { end, suffix } = parseStat(value);
  const [display, setDisplay] = useState(value);
  const started = useRef(false);
  const onTwoThirdsRef = useRef(onTwoThirds);
  onTwoThirdsRef.current = onTwoThirds;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Reset to 0 before the first client paint, so the first visible frame is the
  // start of the count — never a flash of the final value that then jumps back
  // to 0 to count up. Runs before paint (layout effect), and only when JS is
  // present, so no-JS/SSR still renders the final value.
  useIsomorphicLayoutEffect(() => {
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) setDisplay(`0${suffix}`);
  }, [suffix]);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      setDisplay(value);
      onTwoThirdsRef.current?.();
      onCompleteRef.current?.();
      return;
    }

    const duration = readDurationMs();
    // Near-zero CSS override (reduced motion) → snap to final value.
    if (duration < 1) {
      setDisplay(value);
      onTwoThirdsRef.current?.();
      onCompleteRef.current?.();
      return;
    }

    // Trigger point for onTwoThirds: two-thirds of the way to this count's
    // own completion (see completionFraction), not two-thirds of the
    // nominal duration — so the next stat starts while this one is still
    // visibly finishing its last third, overlapping by design.
    const tTrigger = completionFraction(end) * (2 / 3);
    let triggeredTwoThirds = false;

    const start = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      // rAF's `now` can land fractionally before `start` on the very first
      // frame; clamp so the eased curve never dips negative (was flashing
      // e.g. "-1/7" for one frame).
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const current = Math.round(easeOutCubic(t) * end);
      setDisplay(`${current}${suffix}`);

      if (!triggeredTwoThirds && t >= tTrigger) {
        triggeredTwoThirds = true;
        onTwoThirdsRef.current?.();
      }

      // Rounding means the displayed integer reaches `end` before t hits 1
      // (e.g. for end=30, at ~74% of the duration) — the ease-out curve
      // spends its last stretch converging asymptotically on a value
      // that's already on screen. Waiting for t===1 to settle left it
      // visibly frozen for that whole stretch, so we finish here instead.
      if (current >= end) {
        setDisplay(value);
        if (!triggeredTwoThirds) {
          triggeredTwoThirds = true;
          onTwoThirdsRef.current?.();
        }
        onCompleteRef.current?.();
        return;
      }
      raf = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(raf);
  }, [active, value, end, suffix]);

  return <span className={className}>{display}</span>;
}
