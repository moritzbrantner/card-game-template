import type { Metadata } from 'next';

import { LocalizedLink } from '@/i18n/server-link';
import { listBlogPosts } from '@/src/content/index';
import { notFoundUnlessFeatureEnabled, resolveLocale } from '@/src/server/page-guards';
import { getPublicSiteConfig } from '@/src/site-config/service';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const siteConfig = await getPublicSiteConfig();

  return {
    title: 'Blog',
    description: siteConfig.seo.defaultDescription,
    alternates: {
      canonical: `/${locale}/blog`,
    },
  };
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('content.blog');
  const posts = await listBlogPosts(locale);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Blog</p>
        <h1 className="text-4xl font-semibold tracking-tight">Repo-managed site content</h1>
        <p className="max-w-2xl text-zinc-600 dark:text-zinc-300">
          Canonical product and marketing content now lives in localized MDX under version control.
        </p>
      </header>

      <div className="grid gap-4">
        {posts.map((post) => (
          <article key={post.id} className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500">{new Date(post.publishedAt).toLocaleDateString(locale)}</p>
            <h2 className="mt-2 text-2xl font-semibold">
              <LocalizedLink href={`/blog/${post.slug}`} locale={locale}>{post.title}</LocalizedLink>
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-300">{post.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
