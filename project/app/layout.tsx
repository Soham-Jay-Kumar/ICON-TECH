import './globals.css';
import type { Metadata } from 'next';
import { Poppins, Anton } from 'next/font/google';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

// The hero's background wordmark is set in a heavy condensed face, not Poppins.
const anton = Anton({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-anton',
});

export const metadata: Metadata = {
  title: 'Icon Technology — AI Agents for Shipping and Beyond',
  description:
    'We help maritime enterprises transform data into intelligent and decisive action with AI agents built for shipping.',
  openGraph: {
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
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
            Content never depends on JS to become visible. Plain inline
            script (not next/script) so it runs synchronously during HTML
            parsing, before any Reveal content paints. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js');",
          }}
        />
        {children}
      </body>
    </html>
  );
}
