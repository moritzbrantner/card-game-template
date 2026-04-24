import type { MetadataRoute } from 'next';

import { loadActiveApp } from '@/src/app-config/load-active-app';
import { getPublicSiteConfig } from '@/src/site-config/service';

export const dynamic = 'force-static';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const activeApp = loadActiveApp();
  const siteConfig = await getPublicSiteConfig();

  return {
    name: activeApp.siteName,
    short_name: activeApp.siteName,
    description:
      activeApp.defaultLocaleMetadata.description ||
      siteConfig.seo.defaultDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#111827',
  };
}
