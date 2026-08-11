import { Reveal } from '@/components/site/reveal';

const FAN_LINES = 58;

/** Fine lines converging just off the top-right corner and sweeping down-left. */
function RayFan({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 700 950"
      fill="none"
      preserveAspectRatio="xMaxYMin slice"
    >
      {Array.from({ length: FAN_LINES }).map((_, i) => {
        const t = i / (FAN_LINES - 1);
        // Ends run up the left edge for the first slice of the fan, then
        // travel along the bottom edge for the rest.
        const [ex, ey] =
          t < 0.36
            ? [-40, -60 + (t / 0.36) * 580]
            : [-40 + ((t - 0.36) / 0.64) * 740, 990];
        const ox = 700;
        const oy = -90;
        const cx = ox + (ex - ox) * 0.58;
        const cy = oy + (ey - oy) * 0.5;
        return (
          <path
            key={i}
            d={`M ${ox} ${oy} Q ${cx} ${cy}, ${ex} ${ey}`}
            stroke="rgba(120, 170, 190, 0.30)"
            strokeWidth="0.9"
          />
        );
      })}
    </svg>
  );
}

export function WhoWeAre() {
  return (
    <section
      id="about"
      data-shot="who-we-are"
      className="relative overflow-hidden bg-white pb-24 pt-10 md:pb-[206px] md:pt-14"
    >
      <RayFan className="pointer-events-none absolute right-0 top-0 h-full w-[45%]" />

      {/* Ship watermark: centered under the copy, y 382 within the section,
          126x586. Multiply drops its white plate. */}
      <img
        src="/images/who-we-are-ship.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 w-[86px] -translate-x-1/2 mix-blend-multiply md:w-[126px]"
        style={{ top: 382 }}
      />

      <div className="relative z-10 px-5 sm:px-8 lg:px-12">
        <Reveal className="text-center">
          <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-[#249495] md:text-[17.5px]">
            Who We Are
          </p>
          <h2 className="mt-4 text-[2.25rem] font-medium leading-[1.2] tracking-[-0.01em] text-[#072637] md:mt-[16px] md:text-[53.3px] md:leading-[69px]">
            Redefining
            <br />
            shipping with AI
            <span className="text-[#FA8837]">.</span>
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <p className="relative mx-auto mt-[8.5rem] max-w-none text-center text-[1.75rem] font-medium leading-[1.55] text-[#0C3D59] md:mt-[303px] md:text-[41.4px] md:leading-[66px]">
            We&apos;re building AI agents for shipping which are designed
            <br className="hidden md:block" />
            to turn untapped data into real decisions.
            <br className="hidden md:block" />
            We help the industry move faster,{' '}
            <span className="text-[#FA8837]">
              operate smarter, and
              <br className="hidden md:block" />
              become future ready<span className="text-[#072637]">.</span>
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
