import Link from 'next/link';
import { Container } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';

/**
 * Footer is the reference panel with transparent hit-areas over logo, nav, and socials.
 */
const hits = [
  { href: '/', label: 'Icon Technology home', left: '5.5%', top: '16%', width: '16%', height: '24%' },
  { href: '#about', label: 'Who We Are', left: '52%', top: '20%', width: '18%', height: '8%' },
  { href: '#products', label: 'Products', left: '52%', top: '30%', width: '14%', height: '8%' },
  { href: '#team', label: 'Team', left: '78%', top: '20%', width: '12%', height: '8%' },
  { href: '#blogs', label: 'Blogs', left: '78%', top: '30%', width: '12%', height: '8%' },
  { href: '#', label: 'Twitter', left: '5.8%', top: '54%', width: '3.2%', height: '7%' },
  { href: '#', label: 'LinkedIn', left: '9.5%', top: '54%', width: '3.2%', height: '7%' },
  { href: '#', label: 'Facebook', left: '13.2%', top: '54%', width: '3.2%', height: '7%' },
] as const;

export function Footer() {
  return (
    <div data-shot="footer" className="bg-[#E9F5F5]">
      <Container className="pb-10 pt-6 md:pb-12 md:pt-8">
        <Reveal variant="fade">
          <footer id="contact" className="relative overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/footer-panel.png"
              alt="Icon Technology — Flat No 502, 5th Floor, Sunrise Apartments, Plot 14, Sector 7, Dwarka, New Delhi, Delhi 110075. Who We Are. Products. Team. Blogs. © Icon Technology."
              width={3072}
              height={1170}
              className="block h-auto w-full select-none"
              draggable={false}
            />

            {hits.map((hit) => (
              <Link
                key={hit.label}
                href={hit.href}
                aria-label={hit.label}
                className="absolute z-10"
                style={{
                  left: hit.left,
                  top: hit.top,
                  width: hit.width,
                  height: hit.height,
                }}
              />
            ))}

            {/* Crisp vector copyright — covers soft raster text baked into the panel */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-[4.5%] top-[82.5%] z-10 h-[5.5%] w-[32%] bg-[#072638]"
            />
            <p className="pointer-events-none absolute left-[5.8%] top-[83.8%] z-20 flex items-center gap-[0.4em] whitespace-nowrap font-sans text-[13px] font-normal leading-none tracking-[0.015em] text-[#9AABB5] md:text-[15px]">
              <svg
                aria-hidden
                viewBox="0 0 14 14"
                className="h-[0.95em] w-[0.95em] shrink-0"
                fill="none"
              >
                <circle cx="7" cy="7" r="6.15" stroke="currentColor" strokeWidth="1.15" />
                <path
                  d="M9.05 5.15A2.85 2.85 0 1 0 9.05 8.85"
                  stroke="currentColor"
                  strokeWidth="1.15"
                  strokeLinecap="round"
                />
              </svg>
              <span>
                {new Date().getFullYear()} Icon Technology.
              </span>
            </p>
          </footer>
        </Reveal>
      </Container>
    </div>
  );
}
