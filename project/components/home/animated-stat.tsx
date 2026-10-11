'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

// Runs before paint on the client, no-ops on the server — so the switch to
// the waiting reels happens before the browser ever paints the hydrated final
// value (no flash of the finished number before the spin starts).
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type AnimatedStatProps = {
  value: string;
  className?: string;
  /** Runs the spin once this flips true; ignored after the first spin starts. */
  active: boolean;
  /** Fired two-thirds of the way through this stat's own run (see below). */
  onTwoThirds?: () => void;
  /** Fired the instant the last reel lands. */
  onComplete?: () => void;
};

/** Full turns each reel makes before landing — the recipe's "several". */
const SPINS = 3;

function parseStat(value: string): { digits: number[]; suffix: string } {
  const match = value.match(/^(\d+)(.*)$/);
  if (!match) return { digits: [], suffix: value };
  return { digits: match[1].split('').map(Number), suffix: match[2] };
}

function readMs(name: string, fallback: number): number {
  const parsed = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name)
  );
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * transitions.dev spinning counter (app/transitions.css, `.t-reel-*`): each
 * digit of the stat's leading integer is a clipped reel of 0–9 cells that
 * spins up through SPINS full turns and lands on its digit, the columns
 * --reel-stagger apart, under a vertical-only motion blur that decays as each
 * reel settles. "24/7" spins "2" and "4" and keeps "/7" still; "30%" spins
 * "3" and "0".
 *
 * Three states, so the stat is always readable:
 *   - server / no JS / reduced motion: the plain final string;
 *   - hydrated, waiting its turn in the cascade: reels resting on 0;
 *   - landed: the plain final string again. The reels are a vehicle for the
 *     spin only, so the resting number is exactly the DESIGN.md text, with
 *     its own kerning, rather than glyphs centred in measured columns.
 *
 * Each column is sized by an invisible copy of its *final* digit and the
 * strip is centred over it, so the landing frame already sits where the
 * plain text will, and the swap back to text does not move a pixel.
 *
 * Sequencing several stats (the next starting while this one finishes) is
 * the caller's job via `active` / `onTwoThirds` — this component only knows
 * how to run its own spin once told to.
 */
export function AnimatedStat({
  value,
  className,
  active,
  onTwoThirds,
  onComplete,
}: AnimatedStatProps) {
  const { digits, suffix } = parseStat(value);
  const [phase, setPhase] = useState<'text' | 'reels' | 'done'>('text');
  const started = useRef(false);
  const stripRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const colRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const blurRefs = useRef<(SVGFEGaussianBlurElement | null)[]>([]);
  const onTwoThirdsRef = useRef(onTwoThirds);
  onTwoThirdsRef.current = onTwoThirds;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const filterId = useId().replace(/:/g, '');

  const reduceMotion = () =>
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useIsomorphicLayoutEffect(() => {
    if (!reduceMotion() && digits.length > 0) setPhase('reels');
    // Parsed from `value`, which is the only input that matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;

    if (phase !== 'reels') {
      onTwoThirdsRef.current?.();
      onCompleteRef.current?.();
      return;
    }

    const dur = readMs('--reel-dur', 1400);
    const stagger = readMs('--reel-stagger', 90);
    const total = dur + stagger * (digits.length - 1);
    const timers: number[] = [];
    let raf = 0;

    // The recipe tunes its blur against a 30px cell; scale it to this one.
    const cellPx = stripRefs.current[0]?.firstElementChild?.getBoundingClientRect().height ?? 30;
    const spinBlur = readMs('--reel-spin-blur', 3) * (cellPx / 30);

    digits.forEach((digit, i) => {
      const strip = stripRefs.current[i];
      if (!strip) return;
      colRefs.current[i]?.classList.add('is-spinning');
      strip.style.filter = `url(#${filterId}-${i})`;
      strip.style.transition = `transform var(--reel-dur) var(--reel-ease) ${i * stagger}ms`;
      strip.style.transform = `translateY(calc(var(--reel-cell) * -${SPINS * 10 + digit}))`;
    });

    // Decay each column's vertical blur over its own window, steepest at the
    // start where the eased reel moves fastest.
    const t0 = performance.now();
    const tick = (now: number) => {
      let moving = false;
      digits.forEach((_, i) => {
        const p = Math.min(1, Math.max(0, (now - t0 - i * stagger) / dur));
        if (p < 1) moving = true;
        const y = p === 0 ? spinBlur : spinBlur * Math.pow(1 - p, 3);
        blurRefs.current[i]?.setAttribute('stdDeviation', `0 ${y.toFixed(2)}`);
      });
      if (moving) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    timers.push(
      window.setTimeout(() => onTwoThirdsRef.current?.(), (total * 2) / 3),
      window.setTimeout(() => {
        setPhase('done');
        onCompleteRef.current?.();
      }, total)
    );

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
    };
    // `phase` is read once, at the moment the spin is asked for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (phase !== 'reels') return <span className={className}>{value}</span>;

  return (
    <span className={className}>
      <span className="sr-only">{value}</span>
      <span
        aria-hidden
        className="t-reel"
        // A 1em cell is the stat's own line box (its line-height is 1), and
        // top alignment keeps the clipped columns from sitting on their
        // synthesized bottom-edge baselines — together, the digits land on
        // exactly the line the plain text occupies.
        style={{ '--reel-cell': '1em', verticalAlign: 'top' } as React.CSSProperties}
      >
        <svg width="0" height="0" className="absolute">
          <defs>
            {digits.map((_, i) => (
              <filter key={i} id={`${filterId}-${i}`} x="0" y="-50%" width="100%" height="200%">
                <feGaussianBlur
                  ref={(el) => {
                    blurRefs.current[i] = el;
                  }}
                  stdDeviation="0 0"
                />
              </filter>
            ))}
          </defs>
        </svg>
        {digits.map((digit, i) => (
          <span
            key={i}
            ref={(el) => {
              colRefs.current[i] = el;
            }}
            className="t-reel-col"
          >
            <span className="invisible block leading-none">{digit}</span>
            <span
              ref={(el) => {
                stripRefs.current[i] = el;
              }}
              className="t-reel-strip absolute inset-x-0 top-0"
            >
              {Array.from({ length: (SPINS + 1) * 10 }, (_, n) => (
                <span key={n} className="t-reel-digit leading-none">
                  {n % 10}
                </span>
              ))}
            </span>
          </span>
        ))}
        {suffix && <span className="leading-none">{suffix}</span>}
      </span>
    </span>
  );
}
