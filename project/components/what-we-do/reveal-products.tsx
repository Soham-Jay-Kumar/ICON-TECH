import {
  CalendarCheck,
  ChevronUp,
  ScanSearch,
  Sparkles,
} from 'lucide-react';

// Same technique as the leader dashes in components/home/products.tsx.
const DASH_H =
  'repeating-linear-gradient(90deg, #F08A3E 0 5px, transparent 5px 12px)';
const DASH_V =
  'repeating-linear-gradient(180deg, #3FA6A0 0 5px, transparent 5px 12px)';

/**
 * The loop. Each stage's place in the face's texts-reveal order (`line`, see
 * RevealProducts): the three tiles follow the heading block one
 * --stagger-stagger beat apart.
 */
const STAGES = [
  {
    label: 'Detect',
    Icon: ScanSearch,
    body: 'Continuously monitor operational signals, risks and opportunities',
    line: 3,
  },
  {
    label: 'Decide',
    Icon: Sparkles,
    body: 'Connect context investigate and recommend the next action',
    line: 4,
  },
  {
    label: 'Deliver',
    Icon: CalendarCheck,
    body: 'Coordinate, follow up and verify execution',
    line: 5,
  },
];

/** `--t-line` is this element's index in the face's staggered entrance. */
const lineStyle = (line: number) => ({ '--t-line': line }) as React.CSSProperties;

/**
 * One stage of the loop.
 *
 * Two levels of hover live here at once, which is why the inner one is a
 * *named* group. `group/mini` scopes the sentence reveal to the tile the
 * cursor is actually over, while the bare `group-hover:` / `group-focus-visible:`
 * / `group-data-[on=true]:` variants still refer to the outer card — so the
 * tile arrives with the rest of the face, then gives up its sentence
 * individually.
 *
 * The keyboard and touch cases open every sentence at once, deliberately.
 * The tiles sit inside the card's own <button> and cannot be focused
 * separately, so there is no "which tile" for a keyboard user to express;
 * showing all three is the only reading that leaves nothing unreachable. It
 * costs nothing visually because the space is reserved either way.
 */
function Stage({
  label,
  Icon,
  body,
  line,
}: {
  label: string;
  Icon: typeof ScanSearch;
  body: string;
  line: number;
}) {
  return (
    // The entrance rides on this block wrapper (the recipe's `.t-stagger-line`
    // is `display: block`, which would flatten the tile's own flex column).
    <span className="t-stagger-line" style={lineStyle(line)}>
    <span
      className={[
        // `justify-center`, not a top-anchored stack: the tile reserves room
        // for its longest sentence so the row never resizes, and anchoring to
        // the top left that reserve sitting as an obvious empty gap under
        // every label. Centred, the icon and label rest in the middle and
        // settle upward as the sentence opens — movement inside the tile,
        // which the row absorbs, rather than movement of the row itself.
        'group/mini relative flex h-full flex-col items-center justify-center rounded-[3px] px-2.5 py-3 text-center',
        'min-h-[170px] bg-white/[0.05] ring-1 ring-inset ring-white/[0.08]',
        'transition-colors duration-ui ease-premium hover:bg-white/[0.1]',
        'motion-reduce:transition-none',
      ].join(' ')}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2FA098] text-white shadow-[0_0_22px_rgba(47,160,152,0.5)] transition-transform duration-ui ease-premium group-hover/mini:scale-110 motion-reduce:transition-none">
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>

      <span className="mt-2.5 block text-[13px] font-medium leading-tight text-white lg:text-[14px]">
        {label}
      </span>

      {/* Unfolds into space the tile already reserves (min-h above), so the
          row never changes height as the cursor moves along it. */}
      <span
        className={[
          // Match the tile's background-light transition exactly, so its
          // sentence opens in sync with the hovered illumination.
          'grid w-full grid-rows-[0fr] transition-[grid-template-rows] duration-ui ease-premium',
          'group-hover/mini:grid-rows-[1fr]',
          'group-focus-visible:grid-rows-[1fr] group-data-[on=true]:grid-rows-[1fr]',
          'motion-reduce:transition-none',
        ].join(' ')}
      >
        <span className="overflow-hidden">
          <span className="mt-2 block text-[10.5px] leading-[1.5] text-white/70 lg:text-[11.5px]">
            {body}
          </span>
        </span>
      </span>
    </span>
    </span>
  );
}

/** The dashed riser that closes the loop back to the start of the row. */
function Riser() {
  return (
    <span
      aria-hidden
      className="relative block h-7 w-px shrink-0"
      style={{ backgroundImage: DASH_V }}
    >
      <ChevronUp
        className="absolute -left-[6px] -top-[6px] h-3 w-3 text-[#3FA6A0]"
        strokeWidth={2.6}
      />
    </span>
  );
}

/**
 * Everything on this face enters as one transitions.dev texts reveal
 * (`t-stagger-hover`, app/transitions.css): each line rises 12px out of a 3px
 * blur, --stagger-stagger (40ms) after the one before — eyebrow, heading,
 * summary, three tiles, then the loop line, 280ms end to end. Leaving the
 * card is the recipe's quiet exit: one 200ms fade, no reverse stagger.
 */
export function RevealProducts() {
  return (
    <span className="t-stagger-hover relative block h-full w-full overflow-hidden">
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(125% 130% at 50% 0%, #14425C 0%, #0B2A3F 52%, #071E2F 100%)',
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-dots-dark opacity-60"
      />

      <span className="relative flex h-full flex-col justify-center px-6 py-8 lg:px-8">
        {/* Type repeats the measured classes from components/home/products.tsx
            rather than importing <Products />: the home section keeps its
            FuelSense cards, this face runs straight into the loop, and neither
            should move when the other does. */}
        <span
          className="t-stagger-line text-center text-[11px] font-medium uppercase tracking-[0.14em] text-[#4FC3BC] lg:text-[12.5px]"
          style={lineStyle(0)}
        >
          Products
        </span>

        <span
          className="t-stagger-line mt-2 text-center text-[clamp(1.4rem,2vw,31px)] font-semibold leading-[1.15] text-white"
          style={lineStyle(1)}
        >
          The Sense Series<span className="text-[#FA8837]">.</span>
        </span>

        <span
          className="t-stagger-line mx-auto mt-2.5 max-w-[46ch] text-center text-[11.5px] leading-[1.55] text-white/75 lg:text-[13px]"
          style={lineStyle(2)}
        >
          We build AI-agentic platforms designed specifically for maritime
          operations.
        </span>

        <span className="mt-5 grid grid-cols-3 gap-2 lg:gap-2.5">
          {STAGES.map((s) => (
            <Stage key={s.label} {...s} />
          ))}
        </span>

        {/* The loop line: risers turning up into a dashed rule at both ends,
            with the label breaking the rule at its centre rather than sitting
            on an opaque chip, which would show a seam against the dot field. */}
        <span className="t-stagger-line mb-1 mt-4" style={lineStyle(7)}>
        <span className="flex h-7 items-end gap-2">
          <Riser />
          {/* `items-end` lands this row's BOTTOM on the risers' feet;
              translating it down by half its own height lands its CENTRE
              there instead, which is where the rule and label both sit. */}
          <span className="flex flex-1 translate-y-1/2 items-center gap-2.5">
            <span
              aria-hidden
              className="hidden h-px flex-1 sm:block"
              style={{ backgroundImage: DASH_H }}
            />
            <span className="whitespace-nowrap text-[10px] text-[#F08A3E] lg:text-[11.5px]">
              360° Continuous feedback loop
            </span>
            <span
              aria-hidden
              className="hidden h-px flex-1 sm:block"
              style={{ backgroundImage: DASH_H }}
            />
          </span>
          <Riser />
        </span>
        </span>
      </span>
    </span>
  );
}
