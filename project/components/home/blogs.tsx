'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Container, Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';

const posts = [
  {
    title: 'How AI Agents Are Rewriting The Economics Of Fuel Efficiency',
    date: 'October 7, 2026',
    image:
      'https://images.pexels.com/photos/12530465/pexels-photo-12530465.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    title: 'Cdc Issues Health Alert Notice For Travel',
    date: 'October 7, 2026',
    image:
      'https://images.pexels.com/photos/14616108/pexels-photo-14616108.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
];

function BlogCard({
  post,
  tall = false,
}: {
  post: (typeof posts)[number];
  tall?: boolean;
}) {
  return (
    <a href="#" className="group block">
      <div className="overflow-hidden rounded-3xl">
        <img
          src={post.image}
          alt={post.title}
          className={`w-full object-cover transition-transform duration-ui ease-standard group-hover:scale-[1.03] ${
            tall ? 'h-64 md:h-72' : 'h-52'
          }`}
        />
      </div>
      <h3 className="mt-5 text-lg font-semibold leading-snug text-navy-900 transition-colors duration-micro ease-standard group-hover:text-brand-600">
        {post.title}
      </h3>
      <p className="mt-2 text-sm text-navy-400">
        Article <span className="mx-2">·</span> {post.date}
      </p>
    </a>
  );
}

export function Blogs() {
  const [offset, setOffset] = useState(0);
  // `%` keeps the sign of its left operand, so stepping `offset` down without
  // normalising walks unbounded negative and eventually indexes off the front
  // of `posts` (undefined -> crash on `post.title`). Normalising in the setter
  // keeps `offset` inside [0, posts.length) for every future read.
  const rotate = (step: number) =>
    setOffset((o) => (o + step + posts.length) % posts.length);
  const rotated = posts.map((_, i) => posts[(i + offset) % posts.length]);

  return (
    <Section id="blogs" data-shot="blogs" className="bg-white md:pb-[159px]">
      <Container>
        <div className="flex items-end justify-between gap-6">
          <div>
            <Reveal variant="fade">
              <p className="eyebrow mb-4">Blogs and Articles</p>
            </Reveal>
            <Reveal variant="rise-mask" duration="cinematic" delay={120}>
              <h2 className="max-w-xl text-display-md font-semibold text-navy-900">
                Stay updated with latest industry insights
                <span className="text-brand-500">.</span>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={100} className="hidden shrink-0 gap-3 md:flex">
            <button
              onClick={() => rotate(-1)}
              aria-label="Previous articles"
              className="group flex h-12 w-12 items-center justify-center rounded-xl border border-navy-200 text-navy-900 transition-colors duration-micro ease-standard hover:border-navy-900"
            >
              <ArrowLeft className="h-5 w-5 transition-transform duration-micro ease-standard group-hover:-translate-x-0.5" />
            </button>
            <button
              onClick={() => rotate(1)}
              aria-label="Next articles"
              className="group flex h-12 w-12 items-center justify-center rounded-xl bg-navy-950 text-white transition-colors duration-micro ease-standard hover:bg-navy-800"
            >
              <ArrowRight className="h-5 w-5 transition-transform duration-micro ease-standard group-hover:translate-x-0.5" />
            </button>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-x-6 gap-y-12 md:grid-cols-2">
          {rotated.slice(0, 2).map((post, i) => (
            <Reveal key={post.title} delay={i * 100}>
              <BlogCard post={post} tall />
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
