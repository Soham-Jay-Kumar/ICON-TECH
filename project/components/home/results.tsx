'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatedStat } from '@/components/home/animated-stat';
import { Container, Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';
import { Parallax } from '@/components/site/scroll';

const stats = [
  { value: '24/7', label: 'AI-Driven Fleet Monitoring' },
  { value: '30%', label: 'Faster operational decision-making' },
  { value: '50%', label: 'Reduction in manual reporting & analysis' },
];

export function Results() {
  const gridRef = useRef<HTMLDivElement>(null);
  // -1 = nothing has started yet; each stat bumps this two-thirds of the way
  // through its own count, so 30% starts while 24/7 is still finishing its
  // last third, and 50% starts while 30% is still finishing its last third.
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const node = gridRef.current;
    if (!node) return;

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      setActiveIndex(0);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setActiveIndex(0);
      },
      { threshold: 0.15, rootMargin: '0px 0px -64px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Section
      data-shot="results"
      className="relative overflow-hidden bg-navy-950"
    >
      {/* Dot field drifts against the scroll, giving the flat navy panel depth. */}
      <Parallax distance={-56} className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 -top-16 -bottom-16 bg-dots-dark opacity-70" />
      </Parallax>
      <Container className="relative">
        <Reveal variant="fade">
          <p className="eyebrow mb-4 text-teal-400">Results &amp; Impact</p>
        </Reveal>
        <Reveal variant="rise-mask" duration="cinematic" delay={120}>
          <h2 className="max-w-2xl text-display-md font-semibold text-white">
            The improvements delivered measurable and immediate results
            <span className="text-brand-400">.</span>
          </h2>
        </Reveal>
        <div
          ref={gridRef}
          className="mt-16 grid gap-12 md:grid-cols-3 md:gap-8"
        >
          {stats.map((stat, i) => (
            <Reveal key={stat.value} delay={i * 100}>
              <p className="text-6xl font-semibold text-brand-500 md:text-7xl">
                <AnimatedStat
                  value={stat.value}
                  active={activeIndex >= i}
                  onTwoThirds={() => setActiveIndex(i + 1)}
                />
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
