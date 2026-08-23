'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Container, Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';

const testimonials = [
  {
    quote:
      'FuelSense flagged an anomaly our own team had missed for weeks. Within one quarter we cut avoidable fuel waste across the fleet by double digits.',
    name: 'Anthony Nava',
    role: 'Sr. Sales Development Manager',
    avatar:
      'https://images.pexels.com/photos/13801445/pexels-photo-13801445.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    quote:
      'The agents feel like an extra operations team that never sleeps. Voyage decisions that used to take hours of back-and-forth now happen in minutes.',
    name: 'Elena Kovács',
    role: 'COO, Meridian Lines',
    avatar:
      'https://images.pexels.com/photos/1367269/pexels-photo-1367269.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    quote:
      'Finally, a maritime data platform our captains actually trust. Clean data in, decisive action out — it has changed how we run every voyage.',
    name: 'Thomas Berg',
    role: 'Head of Performance, Nordic Marine',
    avatar:
      'https://images.pexels.com/photos/36712861/pexels-photo-36712861.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
];

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const current = testimonials[index];
  const prev = () =>
    setIndex((i) => (i - 1 + testimonials.length) % testimonials.length);
  const next = () => setIndex((i) => (i + 1) % testimonials.length);

  return (
    <Section data-shot="testimonials" className="bg-mist-100">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <div>
            <Reveal variant="fade">
              <p className="eyebrow mb-4">Testimonials</p>
            </Reveal>
            <Reveal variant="rise-mask" duration="cinematic" delay={120}>
              <h2 className="text-display-md font-semibold text-navy-900">
                What Our
                <br />
                Customers Saying<span className="text-brand-500">.</span>
              </h2>
            </Reveal>
          </div>

          <Reveal delay={120}>
            <div key={index}>
              <span
                aria-hidden
                className="block text-7xl font-bold leading-none text-brand-500"
              >
                &ldquo;
              </span>
              <p className="mt-2 text-xl font-medium leading-relaxed text-navy-800 md:text-2xl md:leading-relaxed">
                {current.quote}
              </p>
              <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
                <div className="flex items-center gap-4">
                  <img
                    src={current.avatar}
                    alt={`Portrait of ${current.name}`}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-navy-900">
                      {current.name}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-navy-400">
                      {current.role}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={prev}
                    aria-label="Previous testimonial"
                    className="group flex h-12 w-12 items-center justify-center rounded-xl border border-navy-200 text-navy-900 transition-colors duration-micro ease-standard hover:border-navy-900"
                  >
                    <ArrowLeft className="h-5 w-5 transition-transform duration-micro ease-standard group-hover:-translate-x-0.5" />
                  </button>
                  <button
                    onClick={next}
                    aria-label="Next testimonial"
                    className="group flex h-12 w-12 items-center justify-center rounded-xl bg-navy-950 text-white transition-colors duration-micro ease-standard hover:bg-navy-800"
                  >
                    <ArrowRight className="h-5 w-5 transition-transform duration-micro ease-standard group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
