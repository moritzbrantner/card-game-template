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

  const links = [
    { href: '/', label: labels.games },
    { href: '/uno', label: labels.uno },
    { href: '/phase-10', label: labels.phase10 },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/88 backdrop-blur-xl dark:border-white/8 dark:bg-zinc-950/88">
      <nav className="mx-auto flex min-h-16 w-full max-w-[90rem] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <LocalizedLink
          href="/"
          locale={locale}
          className="flex min-w-0 items-center gap-3 text-zinc-950 dark:text-zinc-50"
        >
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-zinc-300 bg-zinc-950 text-sm font-black text-white shadow-sm dark:border-white/14 dark:bg-white dark:text-zinc-950"
          >
            C
          </span>
          <span className="truncate text-sm font-semibold tracking-[-0.01em] sm:text-base">
            {siteName}
          </span>
        </LocalizedLink>

        <div className="flex items-center gap-5 sm:gap-7" aria-label={labels.games}>
          {links.map((link) => (
            <LocalizedLink
              key={link.href}
              href={link.href}
              locale={locale}
              className="text-sm font-medium text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
            >
              {link.label}
            </LocalizedLink>
          ))}
        </div>
      </nav>
    </header>
  );
}
