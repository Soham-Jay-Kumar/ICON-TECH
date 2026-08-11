'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/site/logo';
import { cn } from '@/lib/utils';

const REF_W = 1560;
const vw = (px: number) => `${((px / REF_W) * 100).toFixed(4)}vw`;

const links = [
  { label: 'Home', href: '/', active: true },
  { label: 'Who We Are', href: '#about' },
  { label: 'Products', href: '#products' },
  { label: 'Team', href: '#team' },
  { label: 'Blogs', href: '#blogs' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, [open]);

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div
        className="flex items-center justify-between"
        style={{ paddingLeft: vw(52), paddingRight: vw(50), paddingTop: vw(17) }}
      >
        <Logo style={{ height: vw(59.5) }} />

        {/* The pill group is not centred in the reference: it sits hard against
            the Book a Demo button on the right. */}
        <div className="flex items-center" style={{ gap: vw(45) }}>
          <nav
            className="hidden items-center bg-[#FAFAFA] lg:flex"
            style={{ height: vw(69), borderRadius: vw(35) }}
          >
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  'flex items-center justify-center font-medium uppercase transition-colors duration-micro ease-standard',
                  link.active
                    ? 'bg-white text-[#FA8837]'
                    : 'text-[#0C3D59] hover:text-[#FA8837]'
                )}
                style={
                  link.active
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
              </Link>
            ))}
          </nav>

          <Link
            href="#contact"
            className="hidden items-center justify-center bg-[#072637] font-medium uppercase text-white transition duration-micro ease-standard hover:opacity-90 active:opacity-80 lg:flex"
            style={{
              width: vw(177),
              height: vw(54),
              borderRadius: vw(27),
              fontSize: vw(16.8),
            }}
          >
            Book a Demo
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
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'rounded-lg px-4 py-3 text-sm font-medium uppercase transition-colors duration-micro ease-standard hover:bg-[#FAFAFA]',
                  link.active ? 'text-[#FA8837]' : 'text-[#0C3D59]'
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="#contact"
              onClick={() => setOpen(false)}
              className="mt-3 flex h-12 items-center justify-center rounded-full bg-[#072637] text-sm font-medium uppercase text-white transition duration-micro ease-standard active:opacity-80"
            >
              Book a Demo
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
