'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/site/logo';
import { useScrolledPast } from '@/components/site/scroll';
import { cn } from '@/lib/utils';

const REF_W = 1560;
const vw = (px: number) => `${((px / REF_W) * 100).toFixed(4)}vw`;

// Past this much scroll the header leaves the hero and needs its own surface
// to stay legible over section content.
const CONDENSE_AT = 90;

/** Reference size → condensed size, chosen so the bar loses ~28% of its height. */
const size = (full: number, condensed: number, on: boolean) =>
  vw(on ? condensed : full);

/**
 * `size` with a px floor. Anything that stays visible below `lg` needs one: a
 * bare vw() keeps shrinking with the viewport all the way down, which took the
 * logo to ~14px tall (a ~24px-wide brand mark) on a 375px phone. The pill nav
 * and the desktop CTA are `hidden lg:flex`, so they can stay on plain `size`.
 */
const sizeMin = (
  full: number,
  condensed: number,
  on: boolean,
  floor: number
) => `max(${size(full, condensed, on)}, ${floor}px)`;

// Root-absolute (`/#about`, not `#about`): a bare fragment resolves against
// the *current* route, so on /schedule-demo these pointed at
// /schedule-demo#about — an id that only exists on the home page — and did
// nothing. These sections all live on `/`, so name that explicitly.
const links = [
  { label: 'Home', href: '/' },
  { label: 'Who We Are', href: '/#about' },
  { label: 'Products', href: '/#products' },
  { label: 'Team', href: '/#team' },
  { label: 'Blogs', href: '/#blogs' },
];

/**
 * Routes a link through next/link, except for the `/#section` anchors, which
 * use a plain <a>.
 *
 * Those anchors have to work from both pages, and the two cases pull in
 * opposite directions. From the home page they are same-document fragment
 * navigations, which the browser scrolls natively (honouring the global
 * `scroll-behavior: smooth`); handing them to the App Router instead leaves
 * the *first* hash click after a page load without any scroll at all on Next
 * 13.5 — the URL updates and the page stays put. From /schedule-demo a plain
 * <a> is an ordinary cross-page navigation that lands on the anchor.
 *
 * The cost is that a section link followed from /schedule-demo is a full page
 * load rather than a client transition, which is a fair trade on a two-page
 * site for navigation that actually works from both of them.
 */
function NavLink({
  href,
  children,
  ...rest
}: { href: string } & React.ComponentPropsWithoutRef<'a'>) {
  if (href.startsWith('/#')) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const condensed = useScrolledPast(CONDENSE_AT);
  // Derived, not hard-coded: `active: true` used to be baked into the Home
  // link, so /schedule-demo rendered the Home pill in its current-page
  // treatment while the visitor was somewhere else entirely. Only the section
  // anchors' own page counts as "Home"; they all live on `/`.
  const pathname = usePathname();
  const onHome = pathname === '/';

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, [open]);

  return (
    // Fixed rather than absolute so the bar persists past the hero. Both are
    // out of flow, so this does not shift any section's resting layout.
    //
    // Solid at every scroll position, deliberately: this used to be
    // transparent over the hero and only picked up a blurred bg-white/70 once
    // scrolled past CONDENSE_AT, so the hero's waves and ship showed straight
    // through the bar for the first 90px of scroll. A backdrop-filter is a
    // GPU cost on the page's largest animated element for effectively no
    // visual gain once the bar is opaque underneath it anyway — bg-white
    // alone reads exactly as sharp over the hero as it does over the dark
    // sections further down, with none of the blur's softness. `condensed`
    // still drives the height/padding shrink below; it no longer touches the
    // surface itself.
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#E8EDF0] bg-white shadow-[0_1px_0_0_rgba(12,37,55,0.05),0_8px_24px_-16px_rgba(12,37,55,0.14)]">
      <div
        className="flex items-center justify-between transition-[padding] duration-ui ease-standard"
        style={{
          paddingLeft: vw(52),
          paddingRight: vw(50),
          // The row's own height is its tallest child (the 69px nav pill,
          // vw(69) at rest) plus this top/bottom padding — the logo and CTA
          // are both shorter and just sit centred by `items-center`. At the
          // reference-measured 17/0 the bar came out to ~87px, well past the
          // ~72-76px a premium B2B bar should read at; 5/0 lands it at ~74px
          // without touching the pill, the logo, or any font size. Keeps the
          // original's asymmetry (top-heavy at rest, evening out to 9/9 once
          // condensed) rather than flattening it to a plain symmetric pad.
          paddingTop: size(5, 9, condensed),
          paddingBottom: size(0, 9, condensed),
        }}
      >
        {/* Logo styles its inner <Image> via `style`, so the transition rides
            there too — still reading the shared tokens, never a raw ms value. */}
        <Logo
          style={{
            height: sizeMin(59.5, 42, condensed, condensed ? 30 : 34),
            transition:
              'height var(--motion-duration-ui) var(--motion-ease-standard)',
          }}
        />

        {/* The pill group is not centred in the reference: it sits hard against
            the demo CTA on the right. */}
        <div className="flex items-center" style={{ gap: vw(45) }}>
          <nav
            className="hidden items-center bg-[#FAFAFA] transition-[height] duration-ui ease-standard lg:flex"
            style={{
              height: size(69, 52, condensed),
              borderRadius: size(35, 26, condensed),
            }}
          >
            {links.map((link) => {
              const active = link.href === '/' && onHome;
              return (
              <NavLink
                key={link.label}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex items-center justify-center font-medium uppercase transition-colors duration-micro ease-standard',
                  active
                    ? 'bg-white text-[#FA8837]'
                    : // Underline traces in from the left on hover — a
                      // transform-only micro-interaction (no layout), the one
                      // restrained flourish on the nav.
                      'text-[#0C3D59] after:pointer-events-none after:absolute after:inset-x-[26%] after:bottom-[24%] after:h-px after:origin-left after:scale-x-0 after:bg-[#FA8837] after:transition-transform after:duration-micro after:ease-standard hover:text-[#FA8837] hover:after:scale-x-100'
                )}
                style={
                  active
                    ? {
                        height: vw(38),
                        borderRadius: vw(19),
                        marginLeft: vw(1),
                        paddingLeft: vw(14),
                        paddingRight: vw(31),
                        fontSize: vw(16.8),
                      }
                    : {
                        paddingLeft: vw(25.5),
                        paddingRight: vw(25.5),
                        fontSize: vw(16.8),
                      }
                }
              >
                {link.label}
              </NavLink>
              );
            })}
          </nav>

          {/* Reference measures this pill at 177px wide for "BOOK A DEMO"
              (~119px of caps + ~29px padding a side). "SCHEDULE A DEMO" sets
              ~161px at the same size, so the box grows to 219px to keep the
              reference's side padding rather than crowding the label. */}
          <Link
            href="/schedule-demo"
            className="hidden items-center justify-center whitespace-nowrap bg-[#072637] font-medium uppercase text-white transition duration-ui ease-standard hover:bg-[#0C3D59] hover:opacity-100 active:opacity-80 lg:flex"
            style={{
              width: size(219, 186, condensed),
              height: size(54, 42, condensed),
              borderRadius: size(27, 21, condensed),
              fontSize: size(16.8, 14.6, condensed),
            }}
          >
            Schedule a Demo
          </Link>

          <button
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#072637] transition-colors duration-micro ease-standard active:bg-black/5 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mx-5 mt-3 animate-menu-in rounded-2xl border border-[#E6EDF1] bg-white px-5 pb-5 pt-3 shadow-lg motion-reduce:animate-none lg:hidden">
          <nav className="flex flex-col">
            {links.map((link) => {
              const active = link.href === '/' && onHome;
              return (
                <NavLink
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-lg px-4 py-3 text-sm font-medium uppercase transition-colors duration-micro ease-standard hover:bg-[#FAFAFA]',
                    active ? 'text-[#FA8837]' : 'text-[#0C3D59]'
                  )}
                >
                  {link.label}
                </NavLink>
              );
            })}
            <Link
              href="/schedule-demo"
              onClick={() => setOpen(false)}
              className="mt-3 flex h-12 items-center justify-center rounded-full bg-[#072637] text-sm font-medium uppercase text-white transition duration-micro ease-standard active:opacity-80"
            >
              Schedule a Demo
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
