import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Nothing to index behind the form POST handler.
      disallow: '/api/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
