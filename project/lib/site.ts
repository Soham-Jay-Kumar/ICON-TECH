/**
 * Absolute base URL for this deployment.
 *
 * Needed by `metadataBase` (so Open Graph/Twitter image paths resolve to
 * absolute URLs — social scrapers cannot follow relative ones), and by
 * robots.txt/sitemap.xml.
 *
 * `URL` is set automatically by Netlify at build time to the site's primary
 * address, so a normal deploy needs no configuration; NEXT_PUBLIC_SITE_URL
 * overrides it if the canonical domain ever differs from the Netlify one.
 * The localhost fallback only applies to local builds.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.URL ||
  'http://localhost:3000';
