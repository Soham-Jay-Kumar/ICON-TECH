import { Container, Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';

const stats = [
  { value: '24/7', label: 'AI-Driven Fleet Monitoring' },
  { value: '30%', label: 'Faster operational decision-making' },
  { value: '50%', label: 'Reduction in manual reporting & analysis' },
];

export function Results() {
  return (
    <Section
      data-shot="results"
      className="relative overflow-hidden bg-navy-950"
    >
      <div className="pointer-events-none absolute inset-0 bg-dots-dark opacity-70" />
      <Container className="relative">
        <Reveal>
          <p className="eyebrow mb-4 text-teal-400">Results &amp; Impact</p>
          <h2 className="max-w-2xl text-display-md font-semibold text-white">
            The improvements delivered measurable and immediate results
            <span className="text-brand-400">.</span>
          </h2>
        </Reveal>
        <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
          {stats.map((stat, i) => (
            <Reveal key={stat.value} delay={i * 100}>
              <p className="text-6xl font-semibold text-brand-500 md:text-7xl">
                {stat.value}
              </p>
              <p className="mt-4 max-w-[220px] text-base leading-relaxed text-white/70">
                {stat.label}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
