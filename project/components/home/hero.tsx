import { Reveal } from '@/components/site/reveal';

// Reference 01-hero.png is 1560px wide, so 1px there == (100/1560)vw here and
// the layout resolves to the reference exactly at that width.
const REF_W = 1560;
const vw = (px: number) => `${((px / REF_W) * 100).toFixed(4)}vw`;

// Callout labels sit on the illustration; their leader lines and dot markers
// are part of the raster, so these positions have to track the image.
const ILLUS_H = 630;
const pctY = (px: number) => `${((px / ILLUS_H) * 100).toFixed(3)}%`;
const pctX = (px: number) => `${((px / REF_W) * 100).toFixed(3)}%`;

function Callout({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
}) {
  return (
    <span
      className="absolute whitespace-nowrap font-medium uppercase leading-none text-[#072637]"
      style={{ left: pctX(x), top: pctY(y), fontSize: vw(21.4) }}
    >
      {children}
    </span>
  );
}

export function Hero() {
  return (
    <section data-shot="hero" className="relative overflow-hidden bg-white">
      <div className="text-center" style={{ paddingTop: vw(170) }}>
        <Reveal>
          <h1
            className="font-semibold uppercase text-[#072637]"
            style={{
              fontSize: `clamp(2.25rem, ${vw(70.7)}, 5.5rem)`,
              lineHeight: vw(86),
              letterSpacing: '-0.053em',
            }}
          >
            Building <span className="text-[#FA8837]">AI Agents</span>
            <br />
            For Shipping and Beyond
            <span className="text-[#FA8837]">.</span>
          </h1>
        </Reveal>
        <Reveal delay={100}>
          <p
            className="text-[#54778A]"
            style={{
              fontSize: `clamp(0.95rem, ${vw(23.6)}, 1.6rem)`,
              letterSpacing: '-0.008em',
              marginTop: vw(16),
            }}
          >
            We help enterprises transform data into intelligent and decisive
            action.
          </p>
        </Reveal>
      </div>

      <Reveal
        delay={220}
        duration="slow"
        variant="mask"
        className="relative w-full"
      >
        <div
          className="relative w-full"
          style={{ aspectRatio: `${REF_W} / ${ILLUS_H}`, marginTop: vw(-1) }}
        >
          <span
            aria-hidden
            className="absolute whitespace-nowrap font-display uppercase leading-none text-[#FEEDE0]"
            style={{
              left: pctX(26),
              top: pctY(220),
              fontSize: vw(145.1),
              letterSpacing: vw(11.9),
            }}
          >
            AI Driven Shipping
          </span>

          <Callout x={114} y={310}>
            Anchor Change Suggested
          </Callout>
          <Callout x={1213} y={217}>
            Fuel Anomaly Detected
          </Callout>

          {/* White background of the plate is dropped by multiply, letting the
              wordmark and labels above show through while the ship occludes them
              exactly as it does in the reference. */}
          <img
            src="/images/hero-ocean.png"
            alt="Cargo ship on a digital ocean, annotated with AI-detected fuel and anchor alerts"
            className="absolute inset-0 h-full w-full mix-blend-multiply"
          />
        </div>
      </Reveal>
    </section>
  );
}
