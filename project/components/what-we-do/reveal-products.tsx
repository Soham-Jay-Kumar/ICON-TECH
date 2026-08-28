import {
  CalendarCheck,
  ChevronUp,
  Compass,
  ScanSearch,
  Sparkles,
} from 'lucide-react';

// Same technique as the leader dashes in components/home/products.tsx.
const DASH_H =
  'repeating-linear-gradient(90deg, #F08A3E 0 5px, transparent 5px 12px)';
const DASH_V =
  'repeating-linear-gradient(180deg, #3FA6A0 0 5px, transparent 5px 12px)';

/**
 * The loop, and when each stage arrives. Delays are literal class strings for
 * the same reason as the consulting pills: Tailwind only generates what it can
 * see, and keeping them on the triggered state means the four leave together
 * instead of unwinding one by one as the cursor exits.
 */
const STAGES = [
  {
    label: 'Observe',
    Icon: ScanSearch,
    body: 'Monitor fleet operations continuously',
    delay:
      'group-hover:delay-[180ms] group-focus-visible:delay-[180ms] group-data-[on=true]:delay-[180ms]',
  },
  {
    label: 'Reason',
    Icon: Sparkles,
    body: 'Analyze data across multiple operational systems',
    delay:
      'group-hover:delay-[250ms] group-focus-visible:delay-[250ms] group-data-[on=true]:delay-[250ms]',
  },
  {
    label: 'Deliver',
    Icon: CalendarCheck,
    body: 'Provide the right insight to the right person at the right time',
    delay:
      'group-hover:delay-[320ms] group-focus-visible:delay-[320ms] group-data-[on=true]:delay-[320ms]',
  },
  {
    label: 'Empower',
    Icon: Compass,
    body: 'Enable faster, smarter operational decisions',
    delay:
      'group-hover:delay-[390ms] group-focus-visible:delay-[390ms] group-data-[on=true]:delay-[390ms]',
  },
];

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
 * showing all four is the only reading that leaves nothing unreachable. It
 * costs nothing visually because the space is reserved either way.
 */
function Stage({
  label,
  Icon,
  body,
  delay,
}: {
  label: string;
  Icon: typeof ScanSearch;
  body: string;
  delay: string;
}) {
  return (
    <span
      className={[
        // `justify-center`, not a top-anchored stack: the tile reserves room
        // for its longest sentence so the row never resizes, and anchoring to
        // the top left that reserve sitting as an obvious empty gap under
        // every label. Centred, the icon and label rest in the middle and
        // settle upward as the sentence opens — movement inside the tile,
        // which the row absorbs, rather than movement of the row itself.
        'group/mini relative flex flex-col items-center justify-center rounded-[3px] px-2.5 py-3 text-center',
        'min-h-[170px] bg-white/[0.05] ring-1 ring-inset ring-white/[0.08]',
        'transition duration-ui ease-premium hover:bg-white/[0.1]',
        'translate-y-3 opacity-0',
        'group-hover:translate-y-0 group-hover:opacity-100',
        'group-focus-visible:translate-y-0 group-focus-visible:opacity-100',
        'group-data-[on=true]:translate-y-0 group-data-[on=true]:opacity-100',
        delay,
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

export function RevealProducts() {
  return (
    <span className="relative block h-full w-full overflow-hidden">
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
          className={[
            'block text-center text-[11px] font-medium uppercase tracking-[0.14em] text-[#4FC3BC] lg:text-[12.5px]',
            'translate-y-3 opacity-0 transition duration-ui ease-premium delay-0',
            'group-hover:translate-y-0 group-hover:opacity-100 group-hover:delay-[60ms]',
            'group-focus-visible:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:delay-[60ms]',
            'group-data-[on=true]:translate-y-0 group-data-[on=true]:opacity-100 group-data-[on=true]:delay-[60ms]',
            'motion-reduce:transition-none',
          ].join(' ')}
        >
          Products
        </span>

        <span
          className={[
            'mt-2 block text-center text-[clamp(1.4rem,2vw,31px)] font-semibold leading-[1.15] text-white',
            'translate-y-3 opacity-0 transition duration-ui ease-premium delay-0',
            'group-hover:translate-y-0 group-hover:opacity-100 group-hover:delay-[110ms]',
            'group-focus-visible:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:delay-[110ms]',
            'group-data-[on=true]:translate-y-0 group-data-[on=true]:opacity-100 group-data-[on=true]:delay-[110ms]',
            'motion-reduce:transition-none',
          ].join(' ')}
        >
          The Sense Series<span className="text-[#FA8837]">.</span>
        </span>

        <span
          className={[
            'mx-auto mt-2.5 block max-w-[46ch] text-center text-[11.5px] leading-[1.55] text-white/75 lg:text-[13px]',
            'translate-y-3 opacity-0 transition duration-ui ease-premium delay-0',
            'group-hover:translate-y-0 group-hover:opacity-100 group-hover:delay-[150ms]',
            'group-focus-visible:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:delay-[150ms]',
            'group-data-[on=true]:translate-y-0 group-data-[on=true]:opacity-100 group-data-[on=true]:delay-[150ms]',
            'motion-reduce:transition-none',
          ].join(' ')}
        >
          We build AI-agentic platforms designed specifically for maritime
          operations.
        </span>

        <span className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4 lg:gap-2.5">
          {STAGES.map((s) => (
            <Stage key={s.label} {...s} />
          ))}
        </span>

        {/* The loop line: risers turning up into a dashed rule at both ends,
            with the label breaking the rule at its centre rather than sitting
            on an opaque chip, which would show a seam against the dot field. */}
        <span
          className={[
            'mb-1 mt-4 flex h-7 items-end gap-2',
            'opacity-0 transition-opacity duration-ui ease-premium delay-0',
            'group-hover:opacity-100 group-hover:delay-[450ms]',
            'group-focus-visible:opacity-100 group-focus-visible:delay-[450ms]',
            'group-data-[on=true]:opacity-100 group-data-[on=true]:delay-[450ms]',
            'motion-reduce:transition-none',
          ].join(' ')}
        >
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
  );
}
