import Image from 'next/image';
import { Container, Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';

export function Products() {
  return (
    <Section
      id="products"
      data-shot="products"
      className="relative overflow-hidden bg-white py-24 md:pb-[120px] md:pt-[143px]"
    >
      <Container>
        <div className="text-center">
          <Reveal variant="fade">
            <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-teal-500 md:text-[17.5px]">
              Products
            </p>
          </Reveal>
          <Reveal variant="rise-mask" duration="cinematic" delay={120}>
            <h2 className="mt-3 text-[2.25rem] font-semibold leading-[1.15] text-[#072637] md:mt-4 md:text-[47.5px]">
              The Sense Series<span className="text-[#FA8837]">.</span>
            </h2>
          </Reveal>
        </div>

        <Reveal variant="fade" duration="cinematic" delay={180}>
          <Image
            src="/images/sense-series-fuelsense-v2.png"
            alt="FuelSense AI agentic platform automating the fuel efficiency lifecycle"
            width={1536}
            height={1024}
            sizes="(max-width: 1360px) calc(100vw - 40px), 1296px"
            className="mt-12 block h-auto w-full rounded-[24px] border-[3px] border-[#FA8837] shadow-[0_18px_50px_-24px_rgba(12,44,64,0.16)] md:mt-16"
          />
        </Reveal>
      </Container>
    </Section>
  );
}
