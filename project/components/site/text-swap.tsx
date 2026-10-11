'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * transitions.dev text states swap (`.t-text-swap`, app/transitions.css): when
 * `value` changes, the old label exits up through a 2px blur, the new one is
 * swapped in below, out of sight, and rises back to rest — the recipe's three
 * phases, with the class toggles done on the node directly so React's own
 * renders never interrupt them.
 *
 * `children` renders the label, for callers that wrap it (the demo form's
 * "Sending…" shimmer). It receives the value currently on screen, which lags
 * `value` by one --text-swap-dur while the old label leaves.
 */
export function TextSwap({
  value,
  children,
}: {
  value: string;
  children?: (shown: string) => React.ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  const entering = useRef(false);

  useEffect(() => {
    const el = ref.current;
    // Back to the label already on screen before the swap finished (a submit
    // that fails validation flips isSubmitting on and off within one exit):
    // cancel the exit and let the same label settle back in.
    if (value === shown) {
      el?.classList.remove('is-exit');
      return;
    }
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!el || reduce) {
      setShown(value);
      return;
    }
    el.classList.add('is-exit');
    const dur =
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--text-swap-dur')
      ) || 150;
    const t = window.setTimeout(() => {
      entering.current = true;
      setShown(value);
    }, dur);
    return () => window.clearTimeout(t);
  }, [value, shown]);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!entering.current || !el) return;
    entering.current = false;
    el.classList.remove('is-exit');
    el.classList.add('is-enter-start');
    void el.offsetHeight; // force reflow so the next change transitions
    el.classList.remove('is-enter-start');
  }, [shown]);

  return (
    <span ref={ref} className="t-text-swap">
      {children ? children(shown) : shown}
    </span>
  );
}
