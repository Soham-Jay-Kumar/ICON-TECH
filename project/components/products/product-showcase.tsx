'use client';

import { Fragment, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Ship } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LearnArrow } from '@/components/site/learn-arrow';
import { AgentOrb } from './agent-orb';
import { AssetRadar } from './asset-radar';
import { OperationsArt } from './operations-art';
import { OrbitArt } from './orbit-art';
import {
  PRODUCTS,
  type Product,
  type Segments,
  type ProductAlert,
} from './products-data';

/**
 * Sizing. Every size here is a pixel value read off the Products design, which
 * was drawn at a 1066px content width, written as `calc(N*var(--u))` so that
 * --u is one design pixel. Below lg --u is plain 1px and the layout reflows;
 * from lg the content spans the window less a narrow gutter (--g) and --u
 * grows with it, so the whole composition scales up to fill wide screens
 * instead of leaving empty margins. It stops growing at 1.7x.
 *
 * The root is a size container so `cqw` measures the section, not the page.
 */
const SCALE =
  '[container-type:inline-size] [--u:1px] lg:[--g:clamp(20px,2.5cqw,40px)] lg:[--u:min(calc((100cqw_-_2*var(--g))/1066),1.7px)]';

/** The content column: 1066 design px wide from lg, centred. */
const CONTENT = 'mx-auto w-full px-5 sm:px-8 lg:w-[calc(1066*var(--u))] lg:px-0';

function SegmentedText({ value, emClassName }: { value: Segments; emClassName: string }) {
  return (
    <>
      {value.map((part, i) =>
        typeof part === 'string' ? (
          <Fragment key={i}>{part}</Fragment>
        ) : (
          <span key={i} className={emClassName}>
            {part.em}
          </span>
        )
      )}
    </>
  );
}

function AlertCard({ alert }: { alert: ProductAlert }) {
  return (
    <div className="mt-[calc(18*var(--u))] w-full max-w-[calc(460*var(--u))] rounded-[calc(12*var(--u))] bg-white px-[calc(16*var(--u))] pb-[calc(11*var(--u))] pt-[calc(16*var(--u))] shadow-[0_6px_24px_rgba(7,38,54,0.12)]">
      <div className="flex items-center justify-between gap-[calc(12*var(--u))] leading-[calc(18*var(--u))]">
        <span className="flex items-center gap-[calc(10*var(--u))]">
          <Ship aria-hidden className="h-[calc(17*var(--u))] w-[calc(17*var(--u))] shrink-0 text-[#3EA49D]" strokeWidth={1.6} />
          <span className="text-[calc(14*var(--u))] font-medium text-[#072636]">{alert.vessel}</span>
        </span>
        {alert.date && (
          <span className="whitespace-nowrap text-[calc(12*var(--u))] text-[#668394]">
            Date: {alert.date}
          </span>
        )}
      </div>

      <div className="mt-[calc(11*var(--u))] flex min-h-[calc(20*var(--u))] flex-wrap items-center gap-y-[calc(6*var(--u))] text-[calc(12*var(--u))] text-[#648293]">
        <span className="mr-[calc(10*var(--u))]">Agent:</span>
        {alert.agents.map((agent, i) => (
          <Fragment key={agent.name}>
            {i > 0 && (
              <span aria-hidden className="mx-[calc(9*var(--u))]">
                +
              </span>
            )}
            <span className="flex items-center gap-[calc(9*var(--u))] whitespace-nowrap">
              <AgentOrb tone={agent.tone} className="h-[calc(20*var(--u))] w-[calc(20*var(--u))] shrink-0" />
              <span className="font-medium text-[#072636]">{agent.name}</span>
            </span>
          </Fragment>
        ))}
      </div>

      <div className="mt-[calc(10*var(--u))] h-px bg-[#D6E5EB]" />

      <p className="mt-[calc(8*var(--u))] text-[calc(11.7*var(--u))] leading-[calc(19*var(--u))] text-[#2A5168]">
        <SegmentedText value={alert.message} emClassName="font-semibold text-[#C25E1A]" />
      </p>
    </div>
  );
}

function ScheduleDemoButton({ productName }: { productName: string }) {
  return (
    <Link
      href="/schedule-demo"
      aria-label={`Schedule a demo for ${productName}`}
      className="t-learn group relative mt-[calc(18*var(--u))] inline-flex h-[calc(34*var(--u))] items-center gap-[calc(10*var(--u))] overflow-hidden rounded-full bg-[#207A7B] px-[calc(19*var(--u))] text-[calc(11*var(--u))] font-medium text-white transition-colors duration-ui ease-standard hover:bg-[#1A6667] active:opacity-90"
    >
      Schedule A Demo
      <LearnArrow className="h-[calc(12*var(--u))] w-[calc(12*var(--u))]" />
    </Link>
  );
}

function ProductContent({ product }: { product: Product }) {
  const isOperationsSense = product.id === 'operations-sense';
  const isAssetSense = product.id === 'asset-sense';

  return (
    <div className="relative overflow-hidden rounded-[calc(16*var(--u))] border border-[#E3EDF1] bg-white shadow-[0_16px_32px_-6px_rgba(7,38,54,0.19)] lg:min-h-[calc(445*var(--u))]">
      <div className={cn(
        'relative z-10 px-[calc(24*var(--u))] pb-[calc(28*var(--u))] pt-[calc(28*var(--u))] sm:px-[calc(40*var(--u))]',
        isAssetSense ? 'lg:w-1/2' : 'lg:w-[calc(640*var(--u))]'
      )}>
        <Image
          src={product.logo.src}
          width={product.logo.width}
          height={product.logo.height}
          alt={`${product.name} logo`}
          className="block h-[calc(56*var(--u))] w-auto"
        />
        <h4 className="mt-[calc(18*var(--u))] max-w-[calc(560*var(--u))] text-[calc(21*var(--u))] font-semibold leading-[calc(25*var(--u))] text-[#072636] [text-wrap:balance]">
          {product.cardHeading}
        </h4>
        <p className="mt-[calc(8*var(--u))] max-w-[calc(560*var(--u))] text-[calc(14*var(--u))] leading-[calc(22*var(--u))] text-[#3E5E72] [text-wrap:balance] whitespace-pre-line">
          {product.cardSubtext}
        </p>
        <AlertCard alert={product.alert} />
        <ScheduleDemoButton productName={product.name} />
      </div>
      {/* Below lg the artwork gets its own band under the copy. */}
      <div className={cn(
        'relative lg:absolute lg:h-auto',
        isAssetSense ? 'lg:inset-y-0 lg:right-0 lg:w-1/2' : 'h-[calc(300*var(--u))] lg:inset-0'
      )}>
        {isAssetSense ? (
          <AssetRadar />
        ) : isOperationsSense ? (
          <OperationsArt className="pointer-events-none absolute bottom-0 left-1/2 h-[calc(296*var(--u))] w-[calc(360*var(--u))] -translate-x-1/2 sm:h-[calc(460*var(--u))] sm:w-[calc(560*var(--u))] lg:left-auto lg:right-0 lg:translate-x-0" />
        ) : (
          <OrbitArt className="pointer-events-none absolute -right-[calc(2*var(--u))] bottom-0 h-[calc(460*var(--u))] w-[calc(560*var(--u))]" />
        )}
      </div>
    </div>
  );
}

/**
 * The Sense Series: a full-width bar of three product tabs over a panel that
 * renders the selected product from PRODUCTS. Every tab shares one layout.
 */
export function ProductShowcase() {
  const [active, setActive] = useState(0);
  // Content animates on a switch only; first paint is the section's Reveal.
  // `dir` is the side the next panel enters from (transitions.dev page
  // side-by-side): moving right through the tabs brings it in from the right.
  const [switched, setSwitched] = useState<'prev' | 'next' | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const product = PRODUCTS[active];

  const select = (i: number, focus = false, dir?: 'prev' | 'next') => {
    if (i !== active) setSwitched(dir ?? (i > active ? 'next' : 'prev'));
    setActive(i);
    if (focus) tabRefs.current[i]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = PRODUCTS.length - 1;
    const next =
      e.key === 'ArrowRight' ? (active === last ? 0 : active + 1)
      : e.key === 'ArrowLeft' ? (active === 0 ? last : active - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    // Arrow keys wrap, but the panel still enters from the key's side.
    select(
      next,
      true,
      e.key === 'ArrowRight' ? 'next' : e.key === 'ArrowLeft' ? 'prev' : undefined
    );
  };

  return (
    <div className={SCALE}>
      <div className="border-y border-[#EBF2F5] bg-white">
        <div className={CONTENT}>
          <div
            role="tablist"
            aria-label="Sense Series products"
            onKeyDown={onKeyDown}
            className="relative grid grid-cols-3"
          >
            {/* transitions.dev tabs sliding: one indicator that travels between
                tabs instead of each tab growing its own. The recipe measures
                the active tab's offsetLeft/offsetWidth in JS; here the tabs are
                three equal grid columns, so the same position is exact in CSS
                (a third of the bar, translated by whole widths) and is already
                right in the server-rendered first paint — no snap-into-place,
                and it still renders without JavaScript. The recipe's pill
                geometry is overridden inline into this bar's 2-unit underline. */}
            <span
              aria-hidden
              className="t-tabs-pill"
              style={{
                top: 'auto',
                bottom: 0,
                height: 'calc(2*var(--u))',
                width: `${100 / PRODUCTS.length}%`,
                borderRadius: 0,
                background: '#F98840',
                transform: `translateX(${active * 100}%)`,
              }}
            />
            {PRODUCTS.map((p, i) => {
              const selected = i === active;
              return (
                <button
                  key={p.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`product-tab-${p.id}`}
                  aria-selected={selected}
                  aria-controls="product-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(i)}
                  className={cn(
                    'relative z-[1] h-[calc(39*var(--u))] truncate pl-1 pr-1 text-left text-[calc(12*var(--u))] font-semibold sm:pr-2 sm:text-[calc(13.3*var(--u))] transition-colors duration-ui ease-standard',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F98840]/50',
                    selected ? 'text-[#072636]' : 'text-[#0D3D59] hover:text-[#072636]'
                  )}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        id="product-panel"
        role="tabpanel"
        aria-labelledby={`product-tab-${product.id}`}
        className="bg-[#F7FAFB] pb-16 pt-[calc(28*var(--u))]"
      >
        <div className={CONTENT}>
          <div
            key={product.id}
            data-dir={switched ?? undefined}
            className={cn(switched && 't-page-enter')}
          >
            <ProductContent product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}
