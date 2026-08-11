import { Reveal } from '@/components/site/reveal';

const RINGS = [104, 80, 54];
const ICON_CY = 188;

function VisionRings() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 240"
      className="pointer-events-none absolute left-1/2 h-[240px] w-[240px] -translate-x-1/2"
      style={{ top: ICON_CY - 120 }}
      fill="none"
    >
      {RINGS.map((r) => (
        <circle
          key={r}
          cx="120"
          cy="120"
          r={r}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="1"
        />
      ))}
      <path
        d="M120 16 V224 M16 120 H224"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1"
      />
    </svg>
  );
}

function MissionRings() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 240"
      className="pointer-events-none absolute left-1/2 h-[240px] w-[240px] -translate-x-1/2"
      style={{ top: ICON_CY - 120 }}
      fill="none"
    >
      <circle cx="120" cy="120" r="104" stroke="#E9F1F2" strokeWidth="1" />
      <circle
        cx="120"
        cy="120"
        r="84"
        stroke="#DCEBEC"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="150 60"
        strokeDashoffset="40"
      />
      <circle
        cx="120"
        cy="120"
        r="62"
        stroke="#DCEBEC"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="105 55"
        strokeDashoffset="150"
      />
    </svg>
  );
}

// A few grid cells are tinted in the reference; these are their positions
// within a 780px-wide panel.
const VISION_CELLS = [
  [145, 119, 53, 49],
  [353, 168, 40, 45],
  [73, 256, 46, 49],
  [414, 271, 43, 34],
  [27, 411, 42, 38],
];
const MISSION_CELLS = [
  [225, 210, 46, 46],
  [545, 271, 46, 41],
  [637, 434, 68, 38],
  [134, 381, 61, 61],
];

function Panel({
  dark,
  glyph,
  title,
  subtitle,
  body,
  cells,
  delay,
}: {
  dark?: boolean;
  glyph: string;
  title: React.ReactNode;
  subtitle: string;
  body: string;
  cells: number[][];
  delay?: number;
}) {
  return (
    <div
      className={`relative overflow-hidden px-8 py-20 text-center md:h-[702px] md:py-0 ${
        dark ? 'bg-[#072637]' : 'bg-[#F7F8F9]'
      }`}
      style={{
        backgroundImage: dark
          ? 'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)'
          : 'linear-gradient(rgba(12,61,89,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(12,61,89,0.035) 1px, transparent 1px)',
        backgroundSize: '52px 52px',
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {cells.map(([x, y, w, h]) => (
          <span
            key={`${x}-${y}`}
            className="absolute block"
            style={{
              left: `${(x / 780) * 100}%`,
              top: y,
              width: `${(w / 780) * 100}%`,
              height: h,
              background: dark
                ? 'rgba(255,255,255,0.028)'
                : 'rgba(45,150,150,0.045)',
            }}
          />
        ))}
      </div>

      {dark ? <VisionRings /> : <MissionRings />}
      <img
        src={glyph}
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 h-[60px] w-[60px] -translate-x-1/2"
        style={{ top: ICON_CY - 30 }}
      />

      <Reveal delay={delay} className="relative mx-auto md:pt-[357px]">
        <h3
          className={`text-[2rem] font-medium leading-[1.15] md:text-[42.5px] ${
            dark ? 'text-white' : 'text-[#072637]'
          }`}
        >
          {title}
          <span className="text-[#FA8837]">.</span>
        </h3>
        <p
          className={`mx-auto mt-6 max-w-[680px] text-lg font-medium md:mt-[49px] md:text-[23.6px] ${
            dark ? 'text-white' : 'text-[#0C3D59]'
          }`}
        >
          {subtitle}
        </p>
        <p
          className={`mx-auto mt-4 max-w-[560px] text-[15px] leading-[1.75] md:mt-[22px] md:max-w-[660px] md:text-[19px] md:leading-[30.5px] ${
            dark ? 'text-[#E0E4E6]' : 'text-[#466C81]'
          }`}
        >
          {body}
        </p>
      </Reveal>
    </div>
  );
}

export function VisionMission() {
  return (
    <section data-shot="vision-mission" className="grid lg:grid-cols-2">
      <Panel
        dark
        cells={VISION_CELLS}
        glyph="/images/vision-glyph.png"
        title="Our Vision"
        subtitle="Powering autonomous maritime decision-making"
        body="We go beyond dashboards and alerts. Our AI agents continuously validate, connect, and act on data reducing friction and enabling faster, more confident decisions."
      />
      {/* "Mision" is spelled this way in the reference design. */}
      <Panel
        delay={120}
        cells={MISSION_CELLS}
        glyph="/images/mission-glyph.png"
        title="Our Mision"
        subtitle="Turning shipping data into decisive action"
        body="We transform fragmented data into decision-ready intelligence. Our AI agents work alongside teams in the background so decisions are faster, outcomes are measurable, and operations are smarter."
      />
    </section>
  );
}
