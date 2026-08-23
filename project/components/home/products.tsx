import Image from 'next/image';
import { Anchor } from 'lucide-react';
import { Container, Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';

const CARD =
  'relative overflow-hidden rounded-[20px] bg-white shadow-[0_18px_50px_-24px_rgba(12,44,64,0.16)] transition duration-ui ease-standard hover:-translate-y-1 hover:shadow-panel';

function FuelSenseLogo({ className }: { className?: string }) {
  return (
    <img
      src="/images/fuelsense-logo.png"
      alt="FuelSense"
      className={className}
      width={230}
      height={62}
    />
  );
}

function Card({
  title,
  body,
  mock,
  mockW,
  mockH,
  mockTop,
  mockAlt,
  mockDisplayW,
  delay,
}: {
  title: React.ReactNode;
  body: string;
  mock: string;
  mockW: number;
  mockH: number;
  mockTop: number;
  mockAlt: string;
  /** CSS px width to render the mock at; defaults to full card width. */
  mockDisplayW?: number;
  delay?: number;
}) {
  const displayW = mockDisplayW ?? 631;
  return (
    // rise-scale on the cinematic tier: the card "develops" into place (settles
    // from a hair larger) rather than sliding, so the product mocks read as the
    // section's primary media, not another fade-up.
    <Reveal variant="rise-scale" duration="cinematic" delay={delay}>
      <div className={`${CARD} md:h-[822px]`}>
        <div className="p-7 md:px-11 md:pb-0 md:pt-[42px]">
          <FuelSenseLogo className="h-[46px] w-auto md:ml-[5px] md:h-[62px]" />
          <h3 className="mt-6 text-2xl font-semibold leading-snug text-[#072637] md:mt-[34px] md:text-[29px] md:leading-[39px]">
            {title}
          </h3>
          <p className="mt-3 text-base leading-relaxed text-[#0C3D59] md:mt-[19px] md:text-[18.4px] md:leading-[31px]">
            {body}
          </p>
        </div>
        <Image
          src={mock}
          alt={mockAlt}
          width={mockW}
          height={mockH}
          sizes="(max-width: 768px) 100vw, 631px"
          className="mx-auto mt-6 block w-full max-w-full md:absolute md:inset-x-0 md:mt-0 md:w-auto"
          style={{ top: mockTop, height: 'auto', width: displayW }}
        />
      </div>
    </Reveal>
  );
}

function AssetLifecycleCard() {
  return (
    <Reveal variant="rise-scale" duration="cinematic" delay={200}>
      <div className={`${CARD} mt-6 md:mt-[34px] md:h-[451px]`}>
        <div className="relative z-10 p-7 md:px-11 md:pb-0 md:pt-[44px]">
          <FuelSenseLogo className="h-[46px] w-auto md:ml-[5px] md:h-[62px]" />
          <h3 className="mt-6 text-2xl font-semibold leading-snug text-[#151515] md:mt-[33px] md:text-[29px] md:leading-[39px]">
            AI agentic platform that enhance the
            <br className="hidden md:block" /> asset lifecycle
          </h3>
          <p className="mt-3 text-base leading-relaxed text-[#98A2B2] md:mt-[12px] md:text-[18.6px] md:leading-[32px]">
            Improving asset reliability, reducing
            <br className="hidden md:block" /> costs and downtime
          </p>

          <div className="mt-7 flex items-center md:ml-[143px] md:mt-[30px]">
            <span className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#E8722A] shadow-[0_0_26px_rgba(0,0,0,0.11)] md:h-[60px] md:gap-[19px] md:py-0 md:pl-[19px] md:pr-[35px] md:text-[19px]">
              <Anchor className="h-[18px] w-[18px] md:h-[24px] md:w-[24px]" strokeWidth={2.2} />
              Anchor Change Suggested
            </span>
            {/* Meets the dashes baked into the ship plate on the right. */}
            <span
              aria-hidden
              className="hidden h-px flex-1 md:ml-[12px] md:block"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, #F08A3E 0 5px, transparent 5px 12px)',
              }}
            />
          </div>
        </div>

        <img
          src="/images/product-asset-ship.png"
          alt="Cargo ship with an anchor change alert pinned to its hull"
          className="mt-6 w-full md:absolute md:bottom-0 md:right-0 md:mt-0 md:w-[657px]"
        />
      </div>
    </Reveal>
  );
}

export function Products() {
  return (
    <Section
      id="products"
      data-shot="products"
      className="relative overflow-hidden bg-[#FEF9F5] py-24 md:pb-[120px] md:pt-[143px]"
      style={{
        backgroundImage:
          'radial-gradient(115% 85% at 12% 105%, rgba(228,243,240,0.95) 0%, rgba(228,243,240,0) 62%)',
      }}
    >
      <Container>
        <div className="text-center">
          {/* Layered heading: the label fades, then the headline rises out of
              a mask on the cinematic tier — a deliberate sequence. */}
          <Reveal variant="fade">
            <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-[#249495] md:text-[16.4px]">
              Products
            </p>
          </Reveal>
          <Reveal variant="rise-mask" duration="cinematic" delay={120}>
            <h2 className="mt-4 text-[2.25rem] font-semibold leading-[1.15] text-[#072637] md:mt-[19px] md:text-[47.5px]">
              The Sense Series<span className="text-[#FA8837]">.</span>
            </h2>
          </Reveal>
        </div>

        <div className="mt-10 grid gap-6 md:mt-[84px] md:grid-cols-2 md:gap-[34px]">
          <Card
            title={
              <>
                AI Native
                <br className="hidden md:block" /> ERP &amp; Fleet Data
                Foundation
              </>
            }
            body="Ensures accurate, validated data capture, creating a trusted foundation for faster decisions across fleet operations."
            mock="/images/product-erp-mock.png"
            mockW={2048}
            mockH={1570}
            mockTop={320}
            mockAlt="FuelSense card and a daily fuel consumption dashboard with savings and emissions callouts"
          />
          <Card
            delay={100}
            title={
              <>
                AI agentic platform that automates
                <br className="hidden md:block" /> the fuel efficiency lifecycle
              </>
            }
            body="Enabling faster decisions, higher productivity, and maximise fuel savings"
            mock="/images/product-agents-mock.png"
            mockW={1896}
            mockH={2048}
            mockTop={290}
            mockDisplayW={560}
            mockAlt="Network of AI agents surfacing a fuel anomaly on MV Blue Ocean"
          />
        </div>

        <AssetLifecycleCard />
      </Container>
    </Section>
  );
}
