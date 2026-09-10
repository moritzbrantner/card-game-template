import type { AppLocale } from '@moritzbrantner/app-pack';
import { buttonVariants } from '@moritzbrantner/ui/button-variants';

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
  const foundationSections = [
    {
      title: t('foundation.engine.title'),
      description: t('foundation.engine.description'),
    },
    {
      title: t('foundation.rules.title'),
      description: t('foundation.rules.description'),
    },
    {
      title: t('foundation.sessions.title'),
      description: t('foundation.sessions.description'),
    },
  ] as const;

  return (
    <section className="space-y-16 pb-8">
      <header className="border-b border-zinc-200 pb-12 pt-4 dark:border-zinc-800">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
          {t('eyebrow')}
        </p>
        <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-zinc-950 sm:text-6xl dark:text-zinc-50">
          {t('title')}
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
          {t('description')}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#games" className={buttonVariants({ variant: 'default' })}>
            {t('browseGames')}
          </a>
          <a
            href="https://github.com/moritzbrantner/card-game-template"
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'ghost' })}
          >
            {t('viewSource')}
          </a>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          {[t('pills.engine'), t('pills.rules'), t('pills.delivery')].map(
            (pill) => (
              <span
                key={pill}
                className="rounded-full border border-zinc-200 px-3 py-1.5 dark:border-zinc-800"
              >
                {pill}
              </span>
            ),
          )}
        </div>
      </header>

      <section id="games" aria-labelledby="games-heading">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            {t('gamesEyebrow')}
          </p>
          <h2
            id="games-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
          >
            {t('gamesTitle')}
          </h2>
          <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-300">
            {t('gamesDescription')}
          </p>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
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
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {game.title}
                </h3>
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

      <section
        aria-labelledby="foundation-heading"
        className="border-t border-zinc-200 pt-10 dark:border-zinc-800"
      >
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            {t('foundationEyebrow')}
          </p>
          <h2
            id="foundation-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
          >
            {t('foundationTitle')}
          </h2>
          <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-300">
            {t('foundationDescription')}
          </p>
        </div>

        <div className="mt-7 grid gap-8 md:grid-cols-3">
          {foundationSections.map((section) => (
            <article key={section.title}>
              <h3 className="font-semibold text-zinc-950 dark:text-zinc-50">
                {section.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {section.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
