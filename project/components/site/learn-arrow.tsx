import { cn } from '@/lib/utils';

/**
 * transitions.dev "learn more hover" (app/transitions.css, `.t-learn-*`) on
 * the site's own arrow. The trigger element carries `t-learn`; on its hover
 * the arrow shifts forward and its head opens, and hover-out returns it.
 *
 * Drawn with lucide's ArrowRight geometry, split so the two arms of the head
 * can rotate apart about the tip (19, 12) — at rest it is the same icon as
 * the `<ArrowRight>` it replaces, so DESIGN.md's frame is unchanged. Two
 * per-use departures from the recipe, both inline: the rotation origin is
 * this path's tip rather than the recipe's 16px chevron apex, and
 * `vector-effect` is reset so the arms keep the shaft's (scaled) stroke
 * weight instead of rendering heavier than it.
 */
export function LearnArrow({
  className,
  strokeWidth = 2,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  const arm = { transformOrigin: '19px 12px', vectorEffect: 'none' } as const;
  return (
    <span aria-hidden className="t-learn-chevron shrink-0">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('block', className)}
      >
        <path d="M5 12h14" />
        <path className="t-learn-arm t-learn-arm-top" style={arm} d="M12 5l7 7" />
        <path className="t-learn-arm t-learn-arm-bot" style={arm} d="M19 12l-7 7" />
      </svg>
    </span>
  );
}
