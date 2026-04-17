import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LocalizedLink } from '@/i18n/server-link';
import { routing } from '@/i18n/routing';
import { getAdjacentEntries, getContentEntry, listChangelogEntries, renderContentEntry } from '@/src/content/index';
import { notFoundUnlessFeatureEnabled, resolveLocale } from '@/src/server/page-guards';

export async function generateStaticParams() {
  const entries = await Promise.all(
    routing.locales.map(async (locale) => (
      await listChangelogEntries(locale)
    ).map((entry) => ({
      locale,
      slug: entry.slug,
    }))),
  );

  return entries.flat();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);
  const entry = await getContentEntry('changelog', locale, slug);

  if (!entry) {
    return {};
  }

  return {
    title: entry.seo.title ?? entry.title,
    description: entry.seo.description ?? entry.description,
    alternates: {
      canonical: entry.seo.canonicalUrl ?? entry.href,
    },
    openGraph: {
      title: entry.seo.title ?? entry.title,
      description: entry.seo.description ?? entry.description,
      images: entry.seo.ogImage ? [entry.seo.ogImage] : undefined,
    },
  };
}

export default async function ChangelogDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);
  notFoundUnlessFeatureEnabled('content.changelog');
  const entry = await getContentEntry('changelog', locale, slug);

  if (!entry) {
    notFound();
  }

  const Content = await renderContentEntry(entry);
  const adjacent = await getAdjacentEntries('changelog', locale, slug);

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <LocalizedLink href="/changelog" locale={locale} className="text-sm font-medium text-zinc-500">
          Back to changelog
        </LocalizedLink>
        <p className="text-sm text-zinc-500">{new Date(entry.publishedAt).toLocaleDateString(locale)}</p>
        <h1 className="text-4xl font-semibold tracking-tight">{entry.title}</h1>
        <p className="max-w-3xl text-zinc-600 dark:text-zinc-300">{entry.description}</p>
      </header>

      <div className="prose prose-zinc max-w-none dark:prose-invert">
        <Content />
      </div>

      <footer className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border p-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Previous</p>
          {adjacent.previous ? <LocalizedLink href={`/changelog/${adjacent.previous.slug}`} locale={locale}>{adjacent.previous.title}</LocalizedLink> : <p className="text-sm text-zinc-500">No older entry.</p>}
        </div>
        <div className="rounded-2xl border p-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Next</p>
          {adjacent.next ? <LocalizedLink href={`/changelog/${adjacent.next.slug}`} locale={locale}>{adjacent.next.title}</LocalizedLink> : <p className="text-sm text-zinc-500">No newer entry.</p>}
        </div>
      </footer>
    </article>
  );
}
