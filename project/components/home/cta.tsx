import Image from 'next/image';
import { Container } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';

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
        <Reveal className="flex flex-col items-center text-center">
          <h2 className="max-w-[1200px] text-[clamp(1.75rem,3.47vw,50px)] font-semibold leading-[1.15] tracking-[-0.01em] text-navy-900 md:whitespace-nowrap">
            Experience these agents working in real time
            <span className="text-brand-500">.</span>
          </h2>
          <p className="mt-[20px] max-w-4xl text-[clamp(1rem,1.39vw,20px)] leading-[1.5] text-[#486068]">
            See how these agents work to drive efficiency and smarter shipping.
          </p>
          <a
            href="#contact"
            className="mt-[40px] inline-flex h-[53px] items-center justify-center rounded-full bg-brand-500 px-[30px] text-[15px] font-semibold uppercase tracking-[0.04em] text-white shadow-[0_10px_24px_-6px_rgba(245,130,43,0.55)] transition duration-ui ease-standard hover:bg-brand-600 hover:shadow-pill active:opacity-90"
          >
            Book a Demo
          </a>
        </Reveal>

        <Reveal delay={200} duration="slow">
          <Image
            src="/images/cta-dashboard.png"
            alt="Fuel Sense playground showing Sense AI's fleet summary for today"
            width={2224}
            height={1066}
            sizes="(max-width: 1200px) 94vw, 1112px"
            className="mx-auto mt-[62px] h-auto w-full max-w-[1112px]"
            priority
          />
        </Reveal>
      </Container>
    </section>
  );
}
