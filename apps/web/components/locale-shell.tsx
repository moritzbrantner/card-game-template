import type { ReactNode } from 'react';
import { Suspense } from 'react';

import { NavigationBar } from '@/components/navigation-bar';
import { DeferredConsentBanner } from '@/components/deferred-consent-banner';
import { NavigationAnalyticsTracker } from '@/components/navigation-analytics-tracker';
import { SiteAnnouncementStack } from '@/components/site-announcement-stack';
import type { AppLocale } from '@/i18n/routing';
import type { AppSession } from '@/src/auth';
import type { NotificationPreview } from '@/src/domain/notifications/use-cases';
import { SiteAnnouncementBanner } from '@/components/site-announcement-banner';

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

export function LocaleShell({
  children,
  locale,
  siteName,
  session,
  notificationCenter,
  announcements,
  analyticsEnabled = false,
}: LocaleShellProps) {
  return (
    <>
      <Suspense fallback={null}>
        <NavigationAnalyticsTracker enabled={analyticsEnabled} />
      </Suspense>
      <NavigationBar
        locale={locale}
        siteName={siteName}
        session={session}
        notificationCenter={notificationCenter}
      />
      <main className="app-shell mx-auto min-h-[calc(100vh-4rem)] w-full max-w-5xl px-4 py-10">
        <div className="space-y-4">
          <DeferredConsentBanner />
          {announcements ? (
            announcements.map((announcement) => (
              <SiteAnnouncementBanner key={announcement.id} announcement={announcement} locale={locale} />
            ))
          ) : (
            <Suspense fallback={null}>
              <SiteAnnouncementStack locale={locale} />
            </Suspense>
          )}
        </div>
        {children}
      </main>
    </>
  );
}
