import type { Metadata } from 'next';

import { LocalizedLink } from '@/i18n/server-link';
import { listChangelogEntries } from '@/src/content/index';
import {
  notFoundUnlessFeatureEnabled,
  resolveLocale,
} from '@/src/server/page-guards';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);

  return {
    title: 'Changelog',
    alternates: {
      canonical: `/${locale}/changelog`,
    },
  };
}

export default async function ChangelogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('content.changelog');
  const entries = await listChangelogEntries(locale);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Changelog
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Operational changes and platform updates
        </h1>
      </header>

      <div className="space-y-4">
        {entries.map((entry) => (
          <article
            key={entry.id}
            className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="text-sm text-zinc-500">
              {new Date(entry.publishedAt).toLocaleDateString(locale)}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              <LocalizedLink href={`/changelog/${entry.slug}`} locale={locale}>
                {entry.title}
              </LocalizedLink>
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-300">
              {entry.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
