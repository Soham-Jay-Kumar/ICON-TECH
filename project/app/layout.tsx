import './globals.css';
import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import localFont from 'next/font/local';
import { SITE_URL } from '@/lib/site';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

// The hero's background wordmark is set in a heavy condensed face, not Poppins.
//
// SELF-HOSTED, not next/font/google, and that is deliberate. Fetched from
// Google this font silently failed to arrive: `next/font/google` could not
// reach fonts.googleapis.com, emitted ONLY the metric-fallback face
// (`__Anton_Fallback_*`, with no real `__Anton_*` alongside it), and logged
// nothing that stopped the build. Everything set in `font-display` then
// rendered in Impact — or in Times where Impact is absent — while the CSS
// still looked well-formed. Poppins happened to succeed in the same build,
// so the failure was invisible unless you diffed the emitted faces.
//
// The file is Anton's own latin woff2 (SIL Open Font License), so serving it
// ourselves is both permitted and deterministic: no build-time network call,
// identical output on every machine and CI host. The `--font-anton` variable
// name is unchanged, so tailwind.config.ts's `display` stack and every
// consumer of `font-display` keep working untouched.
const anton = localFont({
  src: './fonts/anton-400.woff2',
  weight: '400',
  style: 'normal',
  display: 'swap',
  variable: '--font-anton',
  // Matches the tail of tailwind.config.ts's `display` stack, so a failure to
  // load degrades to the same face the design already expected.
  fallback: ['Impact', 'sans-serif'],
});

const TITLE = 'Icon Technology — AI Agents for Shipping and Beyond';
const DESCRIPTION =
  'We help maritime enterprises transform data into intelligent and decisive action with AI agents built for shipping.';

export const metadata: Metadata = {
  // Without this, relative image paths below cannot be resolved to the
  // absolute URLs social scrapers require, and Next falls back to localhost.
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  // Was https://bolt.new/static/og_default.png — the starter template's
  // placeholder, which is what every shared link previewed as. Built by
  // scripts/build-og-image.py at the 1200x630 both networks expect.
  openGraph: {
    type: 'website',
    siteName: 'Icon Technology',
    title: TITLE,
    description: DESCRIPTION,
    url: '/',
    images: [
      {
        url: '/images/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Icon Technology — a cargo ship on a digital ocean',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/images/og-default.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: the inline script below adds a `js` class to
    // <html> before React hydrates, which would otherwise trip the "Extra
    // attributes from the server" mismatch warning. This is the documented
    // Next.js pattern for scripts that touch <html>/<body> pre-hydration.
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} ${anton.variable} font-sans`}>
        {/* Scroll-reveal content defaults to visible; this flags JS as
            available so Reveal's pre-animation hidden state can apply.
            Plain inline script (not next/script) so it runs synchronously
            during HTML parsing, before any Reveal content paints.

            The watchdog is what makes "content never depends on JS" actually
            true. The `js` class alone only proves scripts *run* — if React
            then fails to hydrate (a chunk 404 after a deploy, a CSP block, a
            third-party script throwing first), no IntersectionObserver ever
            starts and every <Reveal> stays at opacity:0 forever, i.e. a blank
            white page. Reveal stamps data-hydrated on <html> when it mounts;
            if that has not happened within 4s, the `js` class is withdrawn and
            all revealed content falls back to its visible resting state. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.add('js');" +
              'setTimeout(function(){var e=document.documentElement;' +
              "if(!e.hasAttribute('data-hydrated'))e.classList.remove('js');},4000);",
          }}
        />
        {children}
      </body>
    </html>
  );
}
