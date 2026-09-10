import { LocalizedLink } from '@/i18n/server-link';
import type { AppLocale } from '@/i18n/routing';
import type { AppSession } from '@/src/auth';
import type { NotificationPreview } from '@/src/domain/notifications/use-cases';

type NavigationBarProps = {
  locale: AppLocale;
  siteName: string;
  session?: AppSession | null;
  notificationCenter?: NotificationPreview | null;
};

export function NavigationBar({ locale, siteName }: NavigationBarProps) {
  const labels =
    locale === 'de'
      ? { games: 'Spiele', phase10: 'Phase 10', uno: 'UNO' }
      : { games: 'Games', phase10: 'Phase 10', uno: 'UNO' };

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <LocalizedLink
          href="/"
          locale={locale}
          className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
        >
          {siteName}
        </LocalizedLink>

        <div className="flex flex-wrap items-center gap-1" aria-label={labels.games}>
          <LocalizedLink
            href="/"
            locale={locale}
            className="rounded-full px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
          >
            {labels.games}
          </LocalizedLink>
          <LocalizedLink
            href="/uno"
            locale={locale}
            className="rounded-full px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
          >
            {labels.uno}
          </LocalizedLink>
          <LocalizedLink
            href="/phase-10"
            locale={locale}
            className="rounded-full px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
          >
            {labels.phase10}
          </LocalizedLink>
        </div>
      </nav>
    </header>
  );
}
