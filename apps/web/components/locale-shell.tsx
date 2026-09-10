import type { ReactNode } from 'react';

import { NavigationBar } from '@/components/navigation-bar';
import type { AppLocale } from '@/i18n/routing';
import type { AppSession } from '@/src/auth';
import type { NotificationPreview } from '@/src/domain/notifications/use-cases';

type LocaleShellProps = {
  children: ReactNode;
  locale: AppLocale;
  siteName: string;
  session?: AppSession | null;
  notificationCenter?: NotificationPreview | null;
  announcements?: Array<{
    id: string;
    title: string;
    body: string;
    href: string | null;
  }>;
  analyticsEnabled?: boolean;
};

export function LocaleShell({ children, locale, siteName }: LocaleShellProps) {
  return (
    <>
      <NavigationBar locale={locale} siteName={siteName} />
      <main className="app-shell mx-auto min-h-[calc(100vh-4rem)] w-full max-w-5xl px-4 py-8 sm:py-10">
        {children}
      </main>
    </>
  );
}
