'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type RevealVariant =
  | 'rise'
  | 'fade'
  | 'mask'
  | 'rise-mask'
  | 'left'
  | 'right'
  | 'rise-scale';

type RevealDuration = 'base' | 'slow' | 'cinematic' | 'epic';

type RevealProps = {
  className?: string;
  /** Delay before the reveal starts, once triggered. Used for stagger. */
  delay?: number;
  duration?: RevealDuration;
  variant?: RevealVariant;
  children: React.ReactNode;
};

// Hidden (pre-reveal) state per variant, scoped to `.js &` so the element is
// only ever hidden when JavaScript has confirmed it will animate back in.
// Without JS (or if it fails), the base classes below keep content visible.
//
// Every moving variant carries a cross-blur lane, transitions.dev's signature
// (app/transitions.css): type uses the texts-reveal values (12px rise, 3px
// blur), panels and media the softer panel-reveal blur (2px). `fade` and
// `mask` stay unblurred — blur softens a slide, never a plain fade or a clip.
const HIDDEN_STATE: Record<RevealVariant, string> = {
  // transitions.dev texts reveal: --distance-medium rise, --blur-medium.
  rise: '[.js_&]:opacity-0 [.js_&]:translate-y-[var(--stagger-distance)] [.js_&]:[filter:blur(var(--stagger-blur))]',
  fade: '[.js_&]:opacity-0',
  // Clip variant (applied on the inner wrapper; kept here so lookups are total).
  mask: '[.js_&]:opacity-0 [.js_&]:[clip-path:inset(0_0_100%_0)]',
  // Masked line-rise: the child sits fully below its own clipping frame and
  // slides up into view, resolving out of the texts-reveal blur as it does —
  // type rises from behind a hard edge. Applied on the inner wrapper (see the
  // branch below).
  'rise-mask':
    '[.js_&]:translate-y-full [.js_&]:opacity-0 [.js_&]:[filter:blur(var(--stagger-blur))]',
  // Directional entrances for side-by-side groups, so a pair reads as
  // converging on the layout rather than both rising identically.
  left: '[.js_&]:opacity-0 [.js_&]:-translate-x-8 [.js_&]:[filter:blur(var(--blur-small))]',
  right: '[.js_&]:opacity-0 [.js_&]:translate-x-8 [.js_&]:[filter:blur(var(--blur-small))]',
  // Media "develops" into place: rises a good distance and settles from
  // noticeably larger (1.06 → 1.0), a slow camera-settle rather than a slide.
  'rise-scale':
    '[.js_&]:opacity-0 [.js_&]:translate-y-10 [.js_&]:scale-[1.06] [.js_&]:[filter:blur(var(--blur-small))]',
};

const DURATION_CLASS: Record<RevealDuration, string> = {
  base: 'duration-reveal',
  slow: 'duration-hero',
  cinematic: 'duration-cinematic',
  epic: 'duration-epic',
};

// Entrance ease by tier: base/slow settle on `ease-premium` (transitions.dev's
// smooth-out); the cinematic
// tier uses the longer, gliding `ease-cine` — the visual split between how
// major elements arrive and how UI reacts (TRANSITIONS.md §3).
const EASE_CLASS: Record<RevealDuration, string> = {
  base: 'ease-premium',
  slow: 'ease-premium',
  cinematic: 'ease-cine',
  epic: 'ease-cine',
};

const MOTION_BASE =
  'transition-[opacity,transform,clip-path,filter] motion-reduce:transition-none';

// Avoids the "useLayoutEffect does nothing on the server" warning while
// still running before paint on the client, so reduced-motion users never
// see a hidden-then-visible flash.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Viewport-triggered entrance. Fires once, respects prefers-reduced-motion,
 * and degrades to fully visible if IntersectionObserver or JS is unavailable.
 *
 * `rise`/`fade`/`left`/`right`/`rise-scale` animate the observed node directly
 * — opacity/transform don't affect IntersectionObserver's geometry, and many
 * consumers rely on this node being the `position: relative` containing block
 * for their own absolutely-positioned children (e.g. media tiles), which an
 * extra wrapper would silently break.
 *
 * `mask` (clip-path) and `rise-mask` (overflow-clipped slide) are the two
 * exceptions: they need an unclipped observed OUTER wrapper with the animation
 * on an INNER child. For `mask`, clip-path would otherwise collapse the node's
 * visible area to zero and report a permanent 0% intersection; for `rise-mask`,
 * the outer wrapper is the `overflow-hidden` frame the child rises out of.
 */
export function Reveal({
  className,
  delay = 0,
  duration = 'base',
  variant = 'rise',
  children,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useIsomorphicLayoutEffect(() => {
    // Tells the watchdog in app/layout.tsx that React reached the client, so
    // it leaves the `js` class (and therefore the pre-reveal hidden state) in
    // place. If hydration never gets here, the watchdog withdraws `js` and
    // everything falls back to visible instead of staying at opacity:0.
    document.documentElement.setAttribute('data-hydrated', '');

    const node = ref.current;
    if (!node) return;

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -64px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const transitionDelay = visible && delay ? { transitionDelay: `${delay}ms` } : undefined;

  // clip-path reveal (hero ocean): outer observed, clip animates on inner.
  if (variant === 'mask') {
    return (
      <div ref={ref} className={className}>
        <div
          className={cn(
            'opacity-100 [clip-path:inset(0)]',
            MOTION_BASE,
            DURATION_CLASS[duration],
            EASE_CLASS[duration],
            !visible && HIDDEN_STATE.mask
          )}
          style={transitionDelay}
        >
          {children}
        </div>
      </div>
    );
  }

  // Masked line-rise: the inner child sits below the outer's clipped frame and
  // slides up out of it. `overflow-hidden` on the outer is the hard edge the
  // content emerges from.
  if (variant === 'rise-mask') {
    return (
      <div ref={ref} className={cn('overflow-hidden', className)}>
        <div
          className={cn(
            'translate-y-0 opacity-100',
            MOTION_BASE,
            DURATION_CLASS[duration],
            EASE_CLASS[duration],
            !visible && HIDDEN_STATE['rise-mask']
          )}
          style={transitionDelay}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        'opacity-100 translate-x-0 translate-y-0 scale-100',
        MOTION_BASE,
        DURATION_CLASS[duration],
        EASE_CLASS[duration],
        !visible && HIDDEN_STATE[variant],
        className
      )}
      style={transitionDelay}
    >
      {children}
    </div>
  );
}
