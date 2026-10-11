import { Reveal } from '@/components/site/reveal';
import { Container } from '@/components/site/section';
import { WhatWeDo as WhatWeDoInteractive } from '@/components/what-we-do/what-we-do';
import { RevealConsulting } from '@/components/what-we-do/reveal-consulting';
import { RevealProducts } from '@/components/what-we-do/reveal-products';

/**
 * The two halves of what the company sells, as a home-page section between
 * the hero and Who We Are.
 *
 * Eyebrow + heading follow the same pattern every other home section uses
 * (who-we-are.tsx, products.tsx): a small teal label, then the section's
 * real headline underneath it. Sized here to who-we-are.tsx's own eyebrow
 * and heading exactly, per request — this used to borrow the hero's h1 frame
 * when it lived at its own /what-we-do route; now that it is a section
 * alongside the others, it takes their type instead of the hero's.
 *
 * Each card carries its own content inside it, revealed on hover — see
 * box.tsx for the two-face mechanic and reveal-*.tsx for what each card
 * turns over to show. The interactive piece is imported here as
 * `WhatWeDoInteractive` to keep the two same-named components apart.
 */
export function WhatWeDo() {
  return (
    <section
      id="what-we-do"
      data-shot="what-we-do"
      className="relative overflow-hidden pt-40 md:pt-[200px]"
      style={{
        // One hard edge: the hero ends in pure white, this section begins in
        // navy, and the boundary is the section's own top edge with nothing
        // spanning it. There used to be a white-to-navy dissolve stacked over
        // this radial (a `linear-gradient` running #FFFFFF -> #06192A across
        // the first 176px) to carry the hero's water into the dark deck; it
        // was removed on request, because a soft ~80px ramp read as a blurry
        // seam rather than as continuous artwork. Do not reintroduce a
        // gradient, a feathered mask or a fade-in overlay across this join.
        //
        // The top padding below is unchanged by that removal — it is what
        // sets the space above the eyebrow, and it no longer has a dissolve
        // to reserve room for.
        backgroundImage:
          'radial-gradient(120% 70% at 50% 0%, #103C55 0%, #0A2537 55%, #06192A 100%)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-dots-dark opacity-50"
      />
      <Container className="relative text-center">
        <Reveal variant="fade">
          <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-teal-300 md:text-[17.5px]">
            What We Do
          </p>
        </Reveal>
        <Reveal variant="rise-mask" delay={80}>
          <h2 className="mt-4 text-[2.25rem] font-medium leading-[1.2] tracking-[-0.01em] text-white md:mt-[16px] md:text-[53.3px] md:leading-[69px]">
            From Strategy to Intelligence Execution
            <span className="text-[#FA8837]">.</span>
          </h2>
        </Reveal>
      </Container>

      <div className="relative mt-10 md:mt-16">
        <WhatWeDoInteractive
          consulting={<RevealConsulting />}
          products={<RevealProducts />}
        />
      </div>
    </section>
  );
}
