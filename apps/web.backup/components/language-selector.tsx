'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { useLocale, useTranslations } from '@/src/i18n';

type LanguageSelectorProps = {
  className?: string;
};

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const t = useTranslations('LanguageSelector');
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div
      aria-label={t('label')}
      className={[
        'inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white/80 p-1 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-950/80',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="group"
    >
      {routing.locales.map((targetLocale) => {
        const isActive = locale === targetLocale;

        return (
          <Link
            key={targetLocale}
            href={pathname}
            locale={targetLocale}
            aria-current={isActive ? 'true' : undefined}
            className={[
              'rounded-full px-2.5 py-1 transition-colors',
              isActive
                ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50',
            ].join(' ')}
          >
            {t(`locales.${targetLocale}`)}
          </Link>
        );
      })}
    </div>
  );
}
