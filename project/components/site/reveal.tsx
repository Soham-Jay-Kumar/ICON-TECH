'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type RevealVariant = 'rise' | 'fade' | 'mask';

type RevealProps = {
  className?: string;
  /** Delay before the reveal starts, once triggered. Used for stagger. */
  delay?: number;
  duration?: 'base' | 'slow';
  variant?: RevealVariant;
  children: React.ReactNode;
};

// Hidden (pre-reveal) state per variant, scoped to `.js &` so the element is
// only ever hidden when JavaScript has confirmed it will animate back in.
// Without JS (or if it fails), the base classes below keep content visible.
const HIDDEN_STATE: Record<RevealVariant, string> = {
  rise: '[.js_&]:opacity-0 [.js_&]:translate-y-6',
  fade: '[.js_&]:opacity-0',
  mask: '[.js_&]:opacity-0 [.js_&]:[clip-path:inset(0_0_100%_0)]',
};

const DURATION_CLASS: Record<'base' | 'slow', string> = {
  base: 'duration-reveal',
  slow: 'duration-hero',
};

const MOTION_BASE =
  'transition-[opacity,transform,clip-path] ease-premium motion-reduce:transition-none';

// Avoids the "useLayoutEffect does nothing on the server" warning while
// still running before paint on the client, so reduced-motion users never
// see a hidden-then-visible flash.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Viewport-triggered entrance. Fires once, respects prefers-reduced-motion,
 * and degrades to fully visible if IntersectionObserver or JS is unavailable.
 *
 * `rise`/`fade` animate the observed node directly — opacity/transform don't
 * affect IntersectionObserver's geometry, and many consumers rely on this
 * node being the `position: relative` containing block for their own
 * absolutely-positioned children (e.g. team tiles), which an extra wrapper
 * would silently break (any element with a transform, even an identity
 * translateY(0), becomes a new containing block).
 *
 * `mask` is the one exception: it must NOT go on the observed node, because
 * clip-path collapses the node's visible area to zero, so the browser
 * reports permanent 0% intersection and it can never cross the reveal
 * threshold. That variant gets a plain observed outer wrapper with the
 * clip-path animation on an inner child instead.
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

  if (variant === 'mask') {
    return (
      <div ref={ref} className={className}>
        <div
          className={cn(
            'opacity-100 [clip-path:inset(0_0_0%_0)]',
            MOTION_BASE,
            DURATION_CLASS[duration],
            !visible && HIDDEN_STATE.mask
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
        'opacity-100 translate-y-0',
        MOTION_BASE,
        DURATION_CLASS[duration],
        !visible && HIDDEN_STATE[variant],
        className
      )}
      style={transitionDelay}
    >
      {children}
    </div>
  );
}
