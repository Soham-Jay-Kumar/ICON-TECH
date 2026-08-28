import Link from 'next/link';
import { Container } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';
import { CurrentYear } from '@/components/site/current-year';

const footerLinks = [
  { label: 'Home', href: '/' },
  { label: 'What We Do', href: '/#what-we-do' },
  { label: 'Who We Are', href: '/#about' },
  { label: 'Blogs', href: '/#blogs' },
] as const;

function FooterLink({ href, label }: (typeof footerLinks)[number]) {
  const className =
    'w-fit text-[clamp(0.95rem,1.45vw,1.35rem)] text-white transition-colors duration-micro ease-standard hover:text-brand-400';

  // Keep cross-page anchors as ordinary browser navigations. This mirrors the
  // header and ensures that the links also work from /schedule-demo.
  return href.startsWith('/#') ? (
    <a href={href} className={className}>
      {label}
      <span className="text-brand-400">.</span>
    </a>
  ) : (
    <Link href={href} className={className}>
      {label}
      <span className="text-brand-400">.</span>
    </Link>
  );
}

export function Footer() {
  return (
    <div data-shot="footer" className="bg-[#E9F5F5]">
      <Container className="pb-10 pt-6 md:pb-12 md:pt-8">
        <Reveal variant="fade">
          <footer
            id="contact"
            className="relative overflow-hidden rounded-[10px] bg-[#072638] px-7 pb-7 pt-9 text-white sm:px-10 md:min-h-[470px] md:px-14 md:pb-9 md:pt-12"
          >
            {/* Maritime detail retained from the original footer artwork. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/footer-ship-nav.png"
              alt=""
              aria-hidden
              className="pointer-events-none absolute right-[17%] top-[9%] hidden h-[70%] w-auto select-none opacity-80 md:block"
              draggable={false}
            />

            <div className="relative z-10 grid gap-12 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:gap-20">
              <div>
                <Link
                  href="/"
                  aria-label="Icon Technology home"
                  className="inline-flex"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/footer-logo-v2.png"
                    alt="Icon Technology"
                    width={1672}
                    height={941}
                    className="h-auto w-[170px] sm:w-[205px]"
                  />
                </Link>

                <address className="mt-7 max-w-[34rem] text-[clamp(0.9rem,1.15vw,1.05rem)] not-italic leading-[1.65] text-white/95">
                  <span className="block">10 Anson Road,</span>
                  <span className="block">#1605 International Plaza,</span>
                  <span className="block">Singapore 079903</span>
                </address>

                <a
                  href="#"
                  aria-label="LinkedIn"
                  className="mt-7 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-colors duration-micro ease-standard hover:border-brand-400 hover:text-brand-400"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="currentColor"
                  >
                    <path d="M6.5 8.25H3.25V21H6.5V8.25ZM4.88 3A1.88 1.88 0 1 0 4.88 6.75 1.88 1.88 0 0 0 4.88 3ZM21 13.69c0-3.84-2.05-5.63-4.79-5.63a4.14 4.14 0 0 0-3.76 2.06V8.25H9.2V21h3.25v-6.31c0-1.66.32-3.27 2.38-3.27 2.03 0 2.05 1.9 2.05 3.38V21H21v-7.31Z" />
                  </svg>
                </a>
              </div>

              <nav
                aria-label="Footer navigation"
                className="grid grid-cols-2 content-start gap-x-8 gap-y-5 md:pt-5"
              >
                {footerLinks.map((link) => (
                  <FooterLink key={link.label} {...link} />
                ))}
                <Link
                  href="/schedule-demo"
                  className="col-span-2 mt-2 inline-flex h-11 w-fit items-center justify-center rounded-full border border-white/25 px-6 text-xs font-medium uppercase tracking-[0.04em] text-white transition-colors duration-micro ease-standard hover:border-brand-400 hover:bg-brand-500"
                >
                  Schedule a Demo
                </Link>
              </nav>
            </div>

            <div className="relative z-10 mt-12 md:absolute md:inset-x-14 md:bottom-9 md:mt-0">
              <div className="relative h-8 overflow-hidden" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/footer-bottom-full.png"
                  alt=""
                  className="absolute inset-x-0 top-1/2 h-auto min-w-full -translate-y-1/2 select-none"
                  draggable={false}
                />
              </div>
              <p className="mt-2 flex items-center gap-[0.4em] text-[12px] font-normal tracking-[0.015em] text-[#9AABB5] sm:text-[13px]">
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
                  <CurrentYear initial={new Date().getFullYear()} /> Icon
                  Technology.
                </span>
              </p>
            </div>
          </footer>
        </Reveal>
      </Container>
    </div>
  );
}
