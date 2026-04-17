import type { MetadataRoute } from 'next';

import { routing } from '@/i18n/routing';
import { listBlogPosts, listChangelogEntries } from '@/src/content/index';
import { getPublicSiteConfig } from '@/src/site-config/service';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteConfig = await getPublicSiteConfig();
  const staticRoutes = ['', '/about', '/blog', '/changelog'];
  const entries = await Promise.all(
    routing.locales.map(async (locale) => {
      const [blogPosts, changelogEntries] = await Promise.all([
        listBlogPosts(locale),
        listChangelogEntries(locale),
      ]);

      return [
        ...staticRoutes.map((pathname) => ({
          url: `${siteConfig.siteUrl}/${locale}${pathname}`,
        })),
        ...blogPosts.map((entry) => ({
          url: `${siteConfig.siteUrl}${entry.href}`,
          lastModified: entry.updatedAt ?? entry.publishedAt,
        })),
        ...changelogEntries.map((entry) => ({
          url: `${siteConfig.siteUrl}${entry.href}`,
          lastModified: entry.updatedAt ?? entry.publishedAt,
        })),
      ];
    }),
  );

  return entries.flat();
}
