'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  { label: 'What We Do', href: '/#what-we-do' },
  { label: 'Who We Are', href: '/#about' },
  { label: 'Blogs', href: '/#blogs' },
];

// The hero is the home destination; every tracked section lives on the same
// route. `#products` remains tracked even without a visible nav link, so its
// content keeps its anchor URL without incorrectly highlighting a neighbour.
const sectionTargets = [
  { href: '/', selector: '[data-shot="hero"]', hash: '' },
  { href: '/#what-we-do', selector: '#what-we-do', hash: '#what-we-do' },
  { href: '/#products', selector: '#products', hash: '#products' },
  { href: '/#about', selector: '#about', hash: '#about' },
  { href: '/#blogs', selector: '#blogs', hash: '#blogs' },
] as const;

const NAVIGATE_SETTLE_MS = 1200;

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Mobile menu lifecycle for the transitions.dev dropdown (see below). */
type MenuState = 'closed' | 'opening' | 'open' | 'closing';

function readMs(name: string, fallback: number) {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
}

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
  const pathname = usePathname();
  const [menu, setMenu] = useState<MenuState>('closed');
  const open = menu === 'opening' || menu === 'open';
  const menuTimerRef = useRef<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const pillTargetRef = useRef('');
  // Until the sliding pill has measured itself the active link keeps its own
  // white background, so the first paint (and a page without JS) still shows
  // the DESIGN.md active state.
  const [pillReady, setPillReady] = useState(false);
  const [activeHref, setActiveHref] = useState<string | null>(
    pathname === '/' ? '/' : null
  );
  const condensed = useScrolledPast(CONDENSE_AT);
  const headerRef = useRef<HTMLElement>(null);
  const pendingHrefRef = useRef<string | null>(null);
  const pendingTimerRef = useRef<number | null>(null);

  const clearPending = useCallback(() => {
    if (pendingTimerRef.current !== null) {
      window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    pendingHrefRef.current = null;
  }, []);

  /** Light the destination at click time, before a smooth anchor scroll ends. */
  const activateLink = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    // Let modified clicks keep their normal browser meaning (for example,
    // opening a destination in another tab) without changing this tab's state.
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    clearPending();
    setActiveHref(href);
    pendingHrefRef.current = href;
    // Native same-page anchor scrolling is smooth. Hold the clicked item while
    // it settles, then let the scroll spy take back over. Direct user input
    // clears this state immediately in the effect below.
    pendingTimerRef.current = window.setTimeout(() => {
      clearPending();
      window.dispatchEvent(new Event('scroll'));
    }, NAVIGATE_SETTLE_MS);
  };

  // transitions.dev menu dropdown. Mounted in its pre-open state, reflowed,
  // then flipped to `.is-open` so the scale/opacity tween runs; on close it
  // plays `.is-closing` for --dropdown-close-dur before unmounting, so the
  // panel never leaves the header's flow mid-animation.
  const setOpen = useCallback((next: boolean | ((cur: boolean) => boolean)) => {
    setMenu((cur) => {
      const isOpen = cur === 'opening' || cur === 'open';
      const want = typeof next === 'function' ? next(isOpen) : next;
      if (want === isOpen) return cur;
      if (menuTimerRef.current !== null) {
        window.clearTimeout(menuTimerRef.current);
        menuTimerRef.current = null;
      }
      return want ? 'opening' : 'closing';
    });
  }, []);

  const menuRef = useRef<HTMLDivElement>(null);
  useIsomorphicLayoutEffect(() => {
    if (menu === 'opening') {
      void menuRef.current?.offsetHeight; // commit the pre-open frame first
      setMenu('open');
    } else if (menu === 'closing') {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      menuTimerRef.current = window.setTimeout(
        () => {
          menuTimerRef.current = null;
          setMenu('closed');
        },
        reduce ? 0 : readMs('--dropdown-close-dur', 150)
      );
    }
  }, [menu]);

  useEffect(
    () => () => {
      if (menuTimerRef.current !== null) window.clearTimeout(menuTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, [open, setOpen]);

  // transitions.dev tabs sliding, on the desktop pill nav: one white pill
  // travels to the active link instead of each link painting its own. The
  // active link's offsetLeft/offsetWidth are written onto the pill (CSS owns
  // the tween). Anything that moves the links without a change of section —
  // first paint, a resize, Poppins swapping in — snaps it instead
  // (`transition: none`, reflow, restore), so it never slides in from 0.
  const placePill = useCallback((animate: boolean) => {
    const nav = navRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;
    const link = nav.querySelector<HTMLElement>('[aria-current="page"]');
    if (!link) {
      pill.style.opacity = '0';
      pillTargetRef.current = '';
      return;
    }
    const target = `${link.offsetLeft}:${link.offsetWidth}`;
    if (target === pillTargetRef.current && pill.style.opacity === '1') return;
    const write = () => {
      pill.style.transform = `translateX(${link.offsetLeft}px)`;
      pill.style.width = `${link.offsetWidth}px`;
      pill.style.opacity = '1';
    };
    // A pill that was hidden (no active section) appears in place.
    if (!animate || pill.style.opacity !== '1') {
      const prev = pill.style.transition;
      pill.style.transition = 'none';
      write();
      void pill.offsetWidth;
      pill.style.transition = prev;
    } else {
      write();
    }
    pillTargetRef.current = target;
    setPillReady(true);
  }, []);

  useIsomorphicLayoutEffect(() => {
    placePill(pillReady);
  }, [activeHref, pathname, pillReady, placePill]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === 'undefined') return;
    // Fires on resize and on font swap; an unchanged target is a no-op, so
    // the width change a section switch itself causes never cuts its slide.
    const ro = new ResizeObserver(() => placePill(false));
    ro.observe(nav);
    return () => ro.disconnect();
  }, [placePill]);

  useEffect(() => {
    if (pathname !== '/') {
      clearPending();
      setActiveHref(null);
      return;
    }

    let frame = 0;
    const targetForHash = () =>
      sectionTargets.find((target) => target.hash === window.location.hash) ??
      sectionTargets[0];

    const syncFromScroll = () => {
      // Read the section that occupies the reading area just below the fixed
      // header, rather than whichever section only touches the viewport edge.
      const headerBottom = headerRef.current?.getBoundingClientRect().bottom ?? 0;
      const marker = headerBottom + Math.min(window.innerHeight * 0.32, 260);
      let next: (typeof sectionTargets)[number] = sectionTargets[0];

      for (const target of sectionTargets.slice(1)) {
        const section = document.querySelector<HTMLElement>(target.selector);
        if (section && section.getBoundingClientRect().top <= marker) {
          next = target;
        }
      }

      // Keep the destination lit during the browser's own smooth anchor
      // scroll, but hand control back as soon as it reaches that section. A
      // wheel, touch, pointer, or scroll-key interruption clears this pending
      // state below, so manual navigation always reflects the viewed section.
      const pendingHref = pendingHrefRef.current;
      if (pendingHref && pendingHref !== next.href) {
        setActiveHref(pendingHref);
        return;
      }
      if (pendingHref) clearPending();

      setActiveHref((current) => (current === next.href ? current : next.href));

      // Section changes are navigation state too. Replace rather than push so
      // ordinary scrolling does not fill the browser history with every label.
      const nextUrl = `${window.location.pathname}${window.location.search}${next.hash}`;
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextUrl !== currentUrl) {
        window.history.replaceState(window.history.state, '', nextUrl);
      }
    };

    const scheduleSync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncFromScroll);
    };

    const syncFromLocation = () => {
      const target = targetForHash();
      if (pendingHrefRef.current && pendingHrefRef.current !== target.href) {
        clearPending();
      }
      setActiveHref(target.href);
      scheduleSync();
    };

    const interruptPending = () => {
      clearPending();
      scheduleSync();
    };
    const interruptForScrollKey = (event: KeyboardEvent) => {
      if (
        [' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(
          event.key
        )
      ) {
        clearPending();
        scheduleSync();
      }
    };

    window.addEventListener('scroll', scheduleSync, { passive: true });
    window.addEventListener('resize', scheduleSync);
    window.addEventListener('hashchange', syncFromLocation);
    window.addEventListener('popstate', syncFromLocation);
    window.addEventListener('wheel', interruptPending, { passive: true });
    window.addEventListener('touchstart', interruptPending, { passive: true });
    window.addEventListener('pointerdown', interruptPending, { passive: true });
    window.addEventListener('keydown', interruptForScrollKey);
    // Wait a frame for initial anchor navigation and the fixed header's layout.
    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(syncFromLocation);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleSync);
      window.removeEventListener('resize', scheduleSync);
      window.removeEventListener('hashchange', syncFromLocation);
      window.removeEventListener('popstate', syncFromLocation);
      window.removeEventListener('wheel', interruptPending);
      window.removeEventListener('touchstart', interruptPending);
      window.removeEventListener('pointerdown', interruptPending);
      window.removeEventListener('keydown', interruptForScrollKey);
      clearPending();
    };
  }, [clearPending, pathname]);

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
    <header
      ref={headerRef}
      className="fixed inset-x-0 top-0 z-50 border-b border-[#E8EDF0] bg-white shadow-[0_1px_0_0_rgba(12,37,55,0.05),0_8px_24px_-16px_rgba(12,37,55,0.14)]"
    >
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
            ref={navRef}
            className="relative hidden items-center bg-[#FAFAFA] transition-[height] duration-ui ease-standard lg:flex"
            style={{
              height: size(69, 52, condensed),
              borderRadius: size(35, 26, condensed),
            }}
          >
            {/* The recipe's pill, sized to the reference's active-link pill
                and centred on the bar however tall the condense makes it. */}
            <span
              ref={pillRef}
              aria-hidden
              className="t-tabs-pill"
              style={{
                top: `calc(50% - ${vw(19)})`,
                height: vw(38),
                borderRadius: vw(19),
                opacity: 0,
              }}
            />
            {links.map((link) => {
              const active = pathname === '/' && activeHref === link.href;
              const className = cn(
                'relative z-[1] flex items-center justify-center font-medium uppercase transition-colors duration-micro ease-standard',
                active
                  ? cn('text-[#FA8837]', !pillReady && 'bg-white')
                  : 'text-[#0C3D59] hover:text-[#FA8837]'
              );
              const style = active
                ? {
                    height: vw(38),
                    borderRadius: vw(19),
                    marginLeft: vw(1),
                    paddingLeft: vw(14),
                    paddingRight: vw(31),
                    fontSize: vw(14.8),
                  }
                : {
                    paddingLeft: vw(25.5),
                    paddingRight: vw(25.5),
                    fontSize: vw(14.8),
                  };

              return link.href ? (
                <NavLink
                  key={link.label}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={className}
                  style={style}
                  onClick={(event) => activateLink(event, link.href)}
                >
                  {link.label}
                </NavLink>
              ) : (
                <span key={link.label} className={className} style={style}>
                  {link.label}
                </span>
              );
            })}
          </nav>

          {/* Match the nav-label type size and keep proportional pill padding. */}
          <Link
            href="/schedule-demo"
            className="hidden items-center justify-center whitespace-nowrap bg-[#072637] font-medium uppercase text-white transition duration-ui ease-standard hover:bg-[#0C3D59] hover:opacity-100 active:opacity-80 lg:flex"
            style={{
              width: size(200, 170, condensed),
              height: size(50, 40, condensed),
              borderRadius: size(25, 20, condensed),
              fontSize: vw(14.8),
            }}
          >
            Schedule a Demo
          </Link>

          <button
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#072637] transition-colors duration-micro ease-standard active:bg-black/5 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {/* transitions.dev icon swap: the two glyphs share one grid cell
                and cross-fade through blur + scale. */}
            <span className="t-icon-swap" data-state={open ? 'b' : 'a'}>
              <Menu className="t-icon h-6 w-6" data-icon="a" />
              <X className="t-icon h-6 w-6" data-icon="b" />
            </span>
          </button>
        </div>
      </div>

      {menu !== 'closed' && (
        <div
          ref={menuRef}
          data-origin="top-right"
          className={cn(
            't-dropdown mx-5 mt-3 rounded-2xl border border-[#E6EDF1] bg-white px-5 pb-5 pt-3 shadow-lg lg:hidden',
            menu === 'open' && 'is-open',
            menu === 'closing' && 'is-closing'
          )}
        >
          <nav className="flex flex-col">
            {links.map((link) => {
              const active = pathname === '/' && activeHref === link.href;
              return link.href ? (
                <NavLink
                  key={link.label}
                  href={link.href}
                  onClick={(event) => {
                    activateLink(event, link.href);
                    setOpen(false);
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-lg px-4 py-3 text-xs font-medium uppercase transition-colors duration-micro ease-standard hover:bg-[#FAFAFA]',
                    active ? 'text-[#FA8837]' : 'text-[#0C3D59]'
                  )}
                >
                  {link.label}
                </NavLink>
              ) : (
                <span
                  key={link.label}
                  className="rounded-lg px-4 py-3 text-xs font-medium uppercase text-[#0C3D59]"
                >
                  {link.label}
                </span>
              );
            })}
            <Link
              href="/schedule-demo"
              onClick={() => setOpen(false)}
              className="mt-3 flex h-12 items-center justify-center rounded-full bg-[#072637] text-xs font-medium uppercase text-white transition duration-micro ease-standard active:opacity-80"
            >
              Schedule a Demo
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
