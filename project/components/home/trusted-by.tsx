import { Reveal } from '@/components/site/reveal';

const partners = [
  'crunchbase',
  'isolved',
  'workato',
  'ramp',
  'signeasy',
  'attentive',
  'chargebee',
  'gorgias',
];

export function TrustedBy() {
  return (
    <section data-shot="trusted-by" className="bg-teal-500">
      <Reveal variant="fade">
        <div className="container-site flex flex-col items-center gap-6 py-8 md:flex-row md:gap-10">
          <p className="shrink-0 text-lg font-semibold text-white md:border-r md:border-white/25 md:pr-10">
            Trusted by the best
          </p>
          <div className="group relative w-full overflow-hidden">
            <div className="flex w-max animate-marquee items-center group-hover:[animation-play-state:paused] motion-reduce:animate-none">
              {[...partners, ...partners].map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  className="mx-10 whitespace-nowrap text-xl font-semibold lowercase tracking-tight text-white/70"
                >
                  {name}
                </span>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-teal-500 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-teal-500 to-transparent" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
