'use client';

import type { ReactNode } from 'react';

import { Link, usePathname } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from '@/src/i18n';

export type AdminPageNavigationItem = {
  key: string;
  href: string;
};

type AdminPageShellProps = {
  title: string;
  description: string;
  adminPages: readonly AdminPageNavigationItem[];
  children: ReactNode;
};

export function AdminPageShell({
  title,
  description,
  adminPages,
  children,
}: AdminPageShellProps) {
  const pathname = usePathname();
  const t = useTranslations('AdminPage');

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <Badge
            variant="outline"
            className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
          >
            {t('accessBadge')}
          </Badge>
        </div>
        <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">
          {description}
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 rounded-3xl border border-zinc-200 bg-white/70 p-2 dark:border-zinc-800 dark:bg-zinc-950/60">
        {adminPages.map((page) => {
          const isActive =
            pathname === page.href ||
            (page.href !== '/admin' && pathname.startsWith(`${page.href}/`));

          return (
            <Link
              key={page.key}
              href={page.href}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900',
              ].join(' ')}
            >
              {t(`navigation.${page.key}`)}
            </Link>
          );
        })}
      </nav>

      {children}
    </section>
  );
}
