'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Freezes CSS animations inside its subtree while that subtree is outside the
 * viewport.
 *
 * The site's ambient loops — the hero's water layers, the marquee, the panel
 * glyphs — are `infinite`, so without this they keep compositing for the whole
 * session no matter where the reader has scrolled to. The hero alone stacks
 * eleven of them on the largest above-the-fold element.
 *
 * Deliberately a wrapper that takes `children` rather than a hook: children
 * passed in from a server component stay server-rendered, so gating the hero's
 * ~400 lines of wave configuration costs only this file's JavaScript rather
 * than shipping the whole layer generator to the browser.
 *
 * `animation-play-state` resumes from the frame it stopped on, so nothing
 * jumps when the subtree scrolls back into view. Under reduced motion the
 * animations are already off and this is simply inert.
 */
export function PauseOffscreen({
  className,
  children,
  ...rest
}: React.ComponentPropsWithoutRef<'div'>) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setPaused(!entry.isIntersecting),
      // A margin so the loop is already running by the time it is actually
      // visible, rather than starting the instant the edge appears.
      { rootMargin: '128px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn(className, paused && 'anim-paused')} {...rest}>
      {children}
    </div>
  );
}
