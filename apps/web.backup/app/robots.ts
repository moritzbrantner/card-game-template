import type { MetadataRoute } from 'next';

import { getPublicSiteConfig } from '@/src/site-config/service';

export const dynamic = 'force-static';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteConfig = await getPublicSiteConfig();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${siteConfig.siteUrl}/sitemap.xml`,
  };
}
