import type { AppLocale } from '@moritzbrantner/app-pack';

import type { AppLocale as RoutingLocale } from '@/i18n/routing';
import { LocalizedLink } from '@/i18n/server-link';
import { createTranslator } from '@/src/i18n/messages';

export default async function HomePage({ locale }: { locale: AppLocale }) {
  const t = createTranslator(locale, 'HomePage');
  const routingLocale = locale as RoutingLocale;
  const games = [
    {
      href: '/uno',
      category: t('games.uno.category'),
      title: t('games.uno.title'),
      description: t('games.uno.description'),
      cta: t('games.uno.cta'),
    },
    {
      href: '/phase-10',
      category: t('games.phase10.category'),
      title: t('games.phase10.title'),
      description: t('games.phase10.description'),
      cta: t('games.phase10.cta'),
    },
  ] as const;

  return (
    <section id="games" aria-label={t('gamesLabel')} className="pb-8 pt-4">
      <h1 className="sr-only">{t('gamesLabel')}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {games.map((game) => (
          <LocalizedLink
            key={game.href}
            href={game.href}
            locale={routingLocale}
            prefetch={false}
            className="group flex min-h-64 flex-col justify-between rounded-3xl border border-zinc-200 bg-zinc-50 p-6 transition hover:-translate-y-0.5 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                {game.category}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {game.title}
              </h2>
              <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-300">
                {game.description}
              </p>
            </div>
            <span className="mt-8 font-semibold text-zinc-950 group-hover:underline dark:text-zinc-50">
              {game.cta} →
            </span>
          </LocalizedLink>
        ))}
      </div>
    </section>
  );
}
