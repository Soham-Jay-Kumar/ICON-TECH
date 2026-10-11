import { Container, Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';
import { ProductShowcase } from '@/components/products/product-showcase';

export function Products() {
  return (
    // No bottom padding here: the product panel below the tab bar carries its
    // own tinted background to the section's foot.
    <Section
      id="products"
      data-shot="products"
      className="relative overflow-hidden bg-white pb-0 pt-20 md:pb-0 md:pt-[96px]"
    >
      <Container>
        <div className="text-center">
          <Reveal variant="fade">
            <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-teal-500 md:text-[17.5px]">
              Products
            </p>
          </Reveal>
          <Reveal variant="rise-mask" delay={80}>
            <h2 className="mt-3 text-[2.25rem] font-semibold leading-[1.15] text-[#072637] md:mt-4 md:text-[46.6px]">
              The Sense Series<span className="text-[#FA8837]">.</span>
            </h2>
          </Reveal>
        </div>
      </Container>

      <Reveal variant="fade" duration="cinematic" delay={160} className="mt-[30px]">
        <ProductShowcase />
      </Reveal>
    </Section>
  );
}
