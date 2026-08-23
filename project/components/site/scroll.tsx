'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Shared scroll plumbing for the site's scroll-linked motion (TRANSITIONS.md §16).
 *
 * Everything scroll-driven on the site subscribes here rather than adding its
 * own listener, for two reasons:
 *
 *  1. One passive, rAF-throttled `scroll` listener for the whole page, no
 *     matter how many parallax layers are mounted.
 *  2. Reads and writes are phase-separated. Every subscriber's `read` (which
 *     may call getBoundingClientRect) runs before any subscriber's `write`
 *     (which sets style.transform), so a frame can never interleave them into
 *     a read → write → read layout thrash.
 */

type Phase = () => void;

const readers = new Set<Phase>();
const writers = new Set<Phase>();
let frame = 0;

function flush() {
  frame = 0;
  readers.forEach((fn) => fn());
  writers.forEach((fn) => fn());
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(flush);
}

function attach() {
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
}

function detach() {
  window.removeEventListener('scroll', schedule);
  window.removeEventListener('resize', schedule);
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}

/**
 * Registers a scroll subscriber. `read` may measure layout; `write` may mutate
 * style. Returns an unsubscribe function. Runs once immediately so an element
 * mounted mid-page is correct before the user scrolls.
 */
export function subscribeScroll(read: Phase, write?: Phase) {
  const first = readers.size === 0 && writers.size === 0;
  readers.add(read);
  if (write) writers.add(write);
  if (first) attach();

  read();
  write?.();

  return () => {
    readers.delete(read);
    if (write) writers.delete(write);
    if (readers.size === 0 && writers.size === 0) detach();
  };
}

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * True once the page has scrolled past `threshold` px. Used by the navbar's
 * condensed state. Hysteresis keeps it from flickering when the user parks the
 * scroll position exactly on the boundary.
 */
export function useScrolledPast(threshold: number, hysteresis = 12) {
  const [past, setPast] = useState(false);
  const pastRef = useRef(false);

  useEffect(() => {
    return subscribeScroll(() => {
      const y = window.scrollY;
      const next = pastRef.current
        ? y > threshold - hysteresis
        : y > threshold + hysteresis;
      if (next !== pastRef.current) {
        pastRef.current = next;
        setPast(next);
      }
    });
  }, [threshold, hysteresis]);

  return past;
}

/**
 * Progress of an element across the viewport, 0 → 1.
 *
 * 0 when the element's top edge is entering at the bottom of the viewport,
 * 1 when its bottom edge has left through the top. Drives both `Parallax` and
 * the scroll-linked stat counters.
 */
function viewportProgress(rect: DOMRect) {
  const vh = window.innerHeight || 1;
  return Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
}

/**
 * Translates its children on a scroll-linked curve. `distance` is the total
 * travel in px across the full viewport pass, centred on the element's midpoint
 * so the resting frame (element centred in the viewport) is exactly the
 * DESIGN.md position — parallax pulls away from it symmetrically, never
 * displaces it.
 *
 * Negative `distance` moves against the scroll direction (drifts up as you
 * scroll down), which is what reads as "further away".
 *
 * transform-only: never triggers layout, and is a no-op under reduced motion.
 */
export function Parallax({
  distance = 60,
  axis = 'y',
  anchor = 'center',
  className,
  style,
  children,
}: {
  distance?: number;
  axis?: 'x' | 'y';
  /**
   * Where the drift is zero — i.e. where the element sits exactly on its
   * DESIGN.md frame.
   *
   * `center` — zero when the element is centred in the viewport. Fine for
   * background textures, but it means the element is *offset* at page load,
   * so never use it on anything whose resting position was measured against
   * a reference screenshot.
   *
   * `top` — zero at scroll position 0. The first painted frame is always the
   * exact design frame; drift only accumulates as the user scrolls. This is
   * what above-the-fold (hero) layers must use.
   */
  anchor?: 'center' | 'top';
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return;

    let offset = 0;
    return subscribeScroll(
      () => {
        if (anchor === 'top') {
          // Rate chosen so the drift reaches `distance` after ~1000px of
          // scroll, then holds rather than sliding indefinitely.
          const raw = window.scrollY * (distance / 1000);
          offset = Math.min(Math.abs(distance), Math.abs(raw)) * Math.sign(raw || 1);
        } else {
          offset =
            (viewportProgress(node.getBoundingClientRect()) - 0.5) * distance;
        }
      },
      () => {
        node.style.transform =
          axis === 'y'
            ? `translate3d(0, ${offset.toFixed(2)}px, 0)`
            : `translate3d(${offset.toFixed(2)}px, 0, 0)`;
      }
    );
  }, [distance, axis, anchor]);

  return (
    <div ref={ref} className={className} style={{ willChange: 'transform', ...style }}>
      {children}
    </div>
  );
}

// NOTE: the Results stat counters are deliberately NOT scroll-linked. They use
// the self-timed count-up cascade in `animated-stat.tsx` (triggered once on
// viewport entry), which is the intended behaviour — a scroll-linked counter
// tracks the scrollbar instead of animating, and loses the count-up entirely
// for anyone who lands with the section already in view.
