import type { Metadata } from 'next';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { Container } from '@/components/site/section';
import { PauseOffscreen } from '@/components/site/pause-offscreen';
import { Reveal } from '@/components/site/reveal';
import { DemoForm } from '@/components/demo/demo-form';
import { DemoShip } from '@/components/demo/demo-ship';

export const metadata: Metadata = {
  title: 'Schedule a Demo — Icon Technology',
  description:
    'Book a demo with a maritime AI specialist, map your highest-impact workflows, and explore a low-risk pilot.',
};

const STEPS = [
  'Get a demo with a maritime AI specialist',
  'Identify and map your highest-impact workflows',
  'Explore a low-risk pilot',
];

/**
 * The lead-capture page, staged as a dark command deck rather than a white
 * form page.
 *
 * It uses the site's shared dark maritime deck language: a deep-navy radial
 * ground, a faint dot field, a signature radar sweep and sonar rings, a white
 * statement with a single orange full stop, and — down the left column — a
 * vessel sailing past on its slow loop, laying a particle wake.
 *
 * The form itself deliberately stays a white card. It is the one thing on the
 * page a visitor has to *do*, and a bright surface on a dark ground is what
 * points at it — the ambient layers all sit behind and to the left of it.
 */
export default function ScheduleDemo() {
  return (
    <main>
      <Navbar />

      {/* Navbar is fixed and overlays the page, so this page owns the top
          padding that clears it: vw(17) top pad + vw(59.5) logo ≈ 4.9vw on
          desktop, ~60px of fixed-height chrome on mobile. */}
      <section
        data-shot="schedule-demo"
        className="relative overflow-hidden bg-navy-950 pb-20 pt-[104px] md:pb-28 md:pt-[calc(4.9vw+72px)]"
        style={{
          // Mirrors the site's dark deck ground, flipped: the glow sits over
          // the copy column so the type has the light behind it and the form
          // card lands on the darkest part of the field.
          backgroundImage:
            'radial-gradient(120% 120% at 14% 8%, #12324a 0%, #0b2438 46%, #081b29 100%)',
        }}
      >
        {/* Dot field — the faint texture shared by every dark surface. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-dots-dark opacity-70"
        />

        {/* The signature radar sweep + sonar rings, anchored off the left edge
            behind the copy. Ambient loop, so it sits inside PauseOffscreen and
            freezes off-screen and under reduced motion. Hidden on small
            screens where it would crowd the heading. */}
        <PauseOffscreen
          aria-hidden
          className="pointer-events-none absolute left-[-30%] top-[34%] hidden -translate-y-1/2 md:block lg:left-[-16%]"
        >
          <div className="relative h-[760px] w-[760px]">
            <div
              className="radar-sweep-anim absolute inset-0 rounded-full opacity-[0.12]"
              style={
                {
                  '--radar-duration': '20s',
                  background:
                    'conic-gradient(from 0deg, transparent 0deg, transparent 296deg, rgba(47,160,152,0) 316deg, rgba(47,160,152,0.6) 360deg)',
                  WebkitMaskImage:
                    'radial-gradient(closest-side, #000 38%, transparent 76%)',
                  maskImage:
                    'radial-gradient(closest-side, #000 38%, transparent 76%)',
                } as React.CSSProperties
              }
            />
            <div className="absolute inset-[6%] rounded-full border border-teal-400/10" />
            <div className="absolute inset-[24%] rounded-full border border-teal-400/[0.08]" />
            <div className="absolute inset-[42%] rounded-full border border-teal-400/[0.06]" />
            <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400/40" />
          </div>
        </PauseOffscreen>

        {/* Hairline into the light footer below, so the dark deck ends on a
            deliberate seam rather than a hard cut. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-navy-100/12 to-transparent"
        />

        <Container className="relative">
          {/* `items-stretch` (not `items-start`) so the copy column is as tall
              as the form card and the ship can sit on its floor, level with
              the bottom of the card. */}
          <div className="grid gap-12 lg:grid-cols-[1fr_minmax(0,540px)] lg:items-stretch lg:gap-16">
            <div className="flex flex-col">
              <Reveal duration="cinematic">
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-300">
                  <span
                    aria-hidden
                    className="h-px w-8 bg-teal-300/50"
                  />
                  Schedule a demo
                </p>

                {/* Base tone is pure white; the terminal full stop keeps the
                    page's one orange accent. */}
                <h1 className="mt-6 text-[clamp(2rem,3.6vw,56px)] font-medium leading-[1.2] tracking-[-0.01em] text-white">
                  See how AI agents can close your execution gap
                  <span className="text-[#FA8837]">.</span>
                </h1>
              </Reveal>

              <Reveal delay={110}>
                <ol className="mt-10 space-y-7 md:mt-12">
                  {STEPS.map((step, i) => (
                    <li
                      key={step}
                      className="flex gap-3 text-[clamp(1.05rem,1.55vw,22px)] leading-[1.5] text-navy-100"
                    >
                      {/* Fixed-width marker: Poppins has no tabular-figure
                          feature, so "1." is narrower than "2." and the copy
                          would step out of alignment down the list. */}
                      <span className="w-[1.4em] shrink-0 text-navy-300">
                        {i + 1}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </Reveal>

              {/* The shared maritime vessel sails along the foot of this
                  column. `mt-auto` drops it to the bottom of the
                  stretched cell once the layout goes side-by-side; below `lg`
                  it just follows the list at a fixed remove. No padding here —
                  the band is a fixed-height box and padding would eat the hull. */}
              <DemoShip className="mt-10 lg:mt-auto" />
            </div>

            <Reveal delay={160} variant="right">
              <DemoForm />
            </Reveal>
          </div>
        </Container>
      </section>

      <Footer />
    </main>
  );
}
