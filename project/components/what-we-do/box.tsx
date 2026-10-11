'use client';

import { cn } from '@/lib/utils';
import { LearnArrow } from '@/components/site/learn-arrow';

export type Tone = 'teal' | 'copper';

/**
 * The two card grounds. `base`/`deep` set the tonal gradient; the striation
 * layers on top of them are shared, so both cards read as the same material
 * in two finishes rather than as two different treatments.
 */
const TONE: Record<Tone, { base: string; deep: string }> = {
  teal: { base: '#1B6E80', deep: '#0E4C60' },
  copper: { base: '#9C5D33', deep: '#7A421F' },
};

/**
 * Water in CSS: a fine diagonal striation crossed by a coarser one, under a
 * soft top-left light and over a tonal gradient. Four layers, painted back to
 * front by the browser in reverse source order.
 */
function ground(tone: Tone) {
  const { base, deep } = TONE[tone];
  return [
    'repeating-linear-gradient(101deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 9px)',
    'repeating-linear-gradient(78deg, rgba(0,0,0,0.055) 0px, rgba(0,0,0,0.055) 1px, transparent 1px, transparent 14px)',
    'radial-gradient(120% 90% at 18% 4%, rgba(255,255,255,0.15) 0%, transparent 58%)',
    `linear-gradient(158deg, ${base} 0%, ${deep} 100%)`,
  ].join(', ');
}

/**
 * One of the two "what we do" cards.
 *
 * The card is a window with two faces. At rest it shows its title, rule and
 * one-line summary; on hover the whole face turns over — the resting copy
 * lifts and fades, and the card's real content arrives in its place, inside
 * the same frame. Nothing opens below it, and no part of the page moves.
 *
 * This is the geoserve mechanic taken to its conclusion. Their tiles invite a
 * click purely by *giving you something* when the cursor lands: copy unfolds
 * out of nothing, the art pushes forward. Here what the card gives you is the
 * whole story it has to tell, so the micro-cues that used to stand in for that
 * (a widening rule, an unfolding "Explore" row) are gone. The reveal is the
 * payoff, and a static Explore mark at rest is all the affordance it needs.
 *
 * Three triggers drive the same reveal, written out longhand at every use
 * because Tailwind's scanner only sees class names that appear literally:
 *
 *   group-hover           the pointer case
 *   group-focus-visible   the keyboard case, identical treatment
 *   group-data-[on=true]  the touch case; a tap latches it, since a device
 *                         with no pointer never fires hover at all
 *
 * Below `md` the two faces are swapped outright (`hidden` / `block`) rather
 * than cross-faded, so the card sizes to whichever face is showing. A phone
 * has no hover, the reveal is a deliberate tap, and letting the card grow
 * there beats reserving desktop-sized empty space on every screen that will
 * never hover in the first place.
 */
export function Box({
  id,
  tone,
  title,
  body,
  open,
  onToggle,
  reveal,
  revealId,
}: {
  id: string;
  tone: Tone;
  title: React.ReactNode;
  body: string;
  open: boolean;
  onToggle: () => void;
  /** The card's real content, revealed inside this same frame. */
  reveal: React.ReactNode;
  revealId: string;
}) {
  return (
    <button
      type="button"
      id={id}
      data-on={open ? 'true' : 'false'}
      aria-expanded={open}
      aria-controls={revealId}
      onClick={onToggle}
      className={cn(
        't-learn group relative isolate block w-full overflow-hidden rounded-[3px] text-left',
        // Fixed height from `md` up, where both faces stack on top of each
        // other: the taller one (the products reveal) has to fit without the
        // card resizing as the cursor crosses it.
        'md:min-h-[484px]',
        'transition duration-ui ease-premium',
        'hover:-translate-y-1 hover:shadow-panel',
        'focus-visible:-translate-y-1 focus-visible:shadow-panel focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B2438]',
        'data-[on=true]:-translate-y-1 data-[on=true]:shadow-panel',
        'motion-reduce:transition-none'
      )}
    >
      {/* The ground. Behind both faces; the reveal paints over it. */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ backgroundImage: ground(tone) }}
      />

      {/* ---------- resting face ---------- */}
      <span
        className={cn(
          'flex flex-col items-center justify-center px-7 py-14 text-center',
          'group-data-[on=true]:hidden',
          'md:absolute md:inset-0 md:px-12 md:py-10',
          'md:group-data-[on=true]:flex',
          // Leaves through the same 2px cross-blur the revealed face arrives
          // through, so the swap reads as one motion (transitions.dev panel
          // reveal / skeleton reveal).
          'md:transition md:duration-ui md:ease-premium',
          'md:group-hover:-translate-y-3 md:group-hover:opacity-0 md:group-hover:[filter:blur(var(--blur-small))]',
          'md:group-focus-visible:-translate-y-3 md:group-focus-visible:opacity-0 md:group-focus-visible:[filter:blur(var(--blur-small))]',
          'md:group-data-[on=true]:-translate-y-3 md:group-data-[on=true]:opacity-0 md:group-data-[on=true]:[filter:blur(var(--blur-small))]',
          'motion-reduce:transition-none'
        )}
      >
        <span className="block text-[clamp(1.3rem,1.95vw,30px)] font-medium leading-[1.32] tracking-[-0.005em] text-white">
          {title}
        </span>

        <span aria-hidden className="mt-6 block h-px w-12 bg-white/75 md:mt-7" />

        {/* From `xl` the cards sit side by side, and each stack is centred on
            its own — so a longer summary would lift one card's title, rule and
            Explore above its neighbour's. Reserving three lines (3 × 1.75em
            leading) gives both stacks the same height, so they centre to the
            same lines. In `em`, it tracks the clamp()ed size and never sets it.
            The 46ch measure is what holds the longer (consulting) summary to
            those three lines; at 38ch it wrapped to four. */}
        <span className="mt-6 block max-w-[46ch] text-[clamp(0.86rem,1.02vw,15.5px)] leading-[1.75] text-white/80 md:mt-7 xl:min-h-[5.25em]">
          {body}
        </span>

        {/* Static, because this whole face is on its way out the moment
            anything happens — an animated cue here would compete with the
            reveal rather than lead into it. */}
        <span className="mt-7 inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-white/90 md:text-[13px]">
          Explore
          {/* transitions.dev learn-more hover, driven by the card's `t-learn`. */}
          <LearnArrow className="h-4 w-4" strokeWidth={2.2} />
        </span>
      </span>

      {/* ---------- revealed face ---------- */}
      <span
        id={revealId}
        className={cn(
          'hidden group-data-[on=true]:block',
          'md:absolute md:inset-0 md:block',
          'md:opacity-0 md:[filter:blur(var(--blur-small))] md:transition-[opacity,filter] md:duration-ui md:ease-premium',
          'md:group-hover:opacity-100 md:group-focus-visible:opacity-100 md:group-data-[on=true]:opacity-100',
          'md:group-hover:[filter:none] md:group-focus-visible:[filter:none] md:group-data-[on=true]:[filter:none]',
          'motion-reduce:transition-none'
        )}
      >
        {reveal}
      </span>
    </button>
  );
}
