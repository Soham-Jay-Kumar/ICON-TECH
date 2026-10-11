import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';
import { LearnArrow } from '@/components/site/learn-arrow';

/*
 * Geometry from cta-fleet-map.png (1024 CSS → ×1.40625 → 1440 design grid):
 *   headline ~50px / single line (~1125px wide)
 *   sub→button 40px
 *   button→card chrome ~77px (asset includes ~74px top pad/glow)
 * Dashboard asset carries its own shadow, top glow and bottom fade.
 */
export function Cta() {
  return (
    <section
      data-shot="cta"
      className="relative overflow-hidden bg-[#E9F5F5] pt-16 pb-12 md:pt-[139px] md:pb-[83px]"
    >
      {/* Soft concentric rings — edge darkening matched to reference (~#DBE9EA) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 420px,
            rgba(27, 72, 70, 0) 250px,
            rgba(27, 72, 70, 0.055) 310px,
            rgba(27, 72, 70, 0) 370px,
            rgba(27, 72, 70, 0) 430px,
            rgba(27, 72, 70, 0.065) 500px,
            rgba(27, 72, 70, 0) 570px,
            rgba(27, 72, 70, 0) 700px,
            rgba(27, 72, 70, 0.07) 780px,
            rgba(27, 72, 70, 0) 860px,
            rgba(27, 72, 70, 0) 1000px,
            rgba(27, 72, 70, 0.055) 1100px,
            rgba(27, 72, 70, 0) 1200px)`,
        }}
      />

      <Container className="relative">
        <div className="flex flex-col items-center text-center">
          <Reveal variant="rise-mask">
            <h2 className="max-w-[1200px] text-[clamp(1.75rem,3.47vw,50px)] font-semibold leading-[1.15] tracking-[-0.01em] text-navy-900 md:whitespace-nowrap">
              Experience these agents working in real time
              <span className="text-brand-500">.</span>
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="mt-[20px] max-w-4xl text-[clamp(1rem,1.39vw,20px)] leading-[1.5] text-[#486068]">
              See how these agents work to drive efficiency and smarter shipping.
            </p>
          </Reveal>
          {/* Was `#contact`, which scrolled to the footer artwork — a dead end
              with no contact form on it. The demo page is the destination both
              navbar CTAs already use. */}
          {/* Fill-sweep: a darker fill wipes across left→right on hover (a
              transform-only `before` layer, clipped to the pill), the label and
              arrow riding above it; the arrow is transitions.dev's learn-more
              hover (`t-learn`), shifting forward as its head opens. */}
          <Reveal delay={160}>
            <Link
              href="/schedule-demo"
              className="t-learn group relative mt-[40px] inline-flex h-[53px] items-center justify-center overflow-hidden rounded-full bg-brand-500 px-[30px] text-[15px] font-semibold uppercase tracking-[0.04em] text-white shadow-[0_10px_24px_-6px_rgba(245,130,43,0.55)] transition-shadow duration-ui ease-standard hover:shadow-pill active:opacity-90 before:absolute before:inset-0 before:origin-left before:scale-x-0 before:bg-brand-600 before:transition-transform before:duration-ui before:ease-standard hover:before:scale-x-100"
            >
              <span className="relative z-[1] inline-flex items-center gap-2">
                Schedule a Demo
                <LearnArrow className="h-[18px] w-[18px]" />
              </span>
            </Link>
          </Reveal>
        </div>

        <Reveal delay={240} duration="epic" variant="rise-scale">
          <Image
            src="/images/cta-dashboard.png"
            alt="Fuel Sense playground showing Sense AI's fleet summary for today"
            width={2224}
            height={1066}
            sizes="(max-width: 1200px) 94vw, 1112px"
            // No `priority`: this sits at the very foot of the page, so
            // preloading it only competed for bandwidth with the hero, which
            // is the real LCP candidate.
            className="mx-auto mt-[62px] h-auto w-full max-w-[1112px]"
          />
        </Reveal>
      </Container>
    </section>
  );
}
