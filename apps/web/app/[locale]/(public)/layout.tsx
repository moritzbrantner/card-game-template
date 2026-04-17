import { LocaleShell } from '@/components/locale-shell';
import { loadActiveApp } from '@/src/app-config/load-active-app';
import { I18nProvider } from '@/src/i18n';
import { getMessages } from '@/src/i18n/messages';
import { publicWebsiteNamespaces } from '@/src/i18n/namespaces';
import { loadAppContext } from '@/src/runtime.functions';
import { resolveLocale } from '@/src/server/page-guards';
import { getActiveAnnouncements, getPublicSiteConfig } from '@/src/site-config/service';

export default async function PublicLocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const activeApp = loadActiveApp();
  const [{ session, notificationCenter }, siteConfig, announcements] = await Promise.all([
    loadAppContext(),
    getPublicSiteConfig(),
    getActiveAnnouncements(locale),
  ]);
  const messages = getMessages(locale, publicWebsiteNamespaces);

  return (
    <I18nProvider locale={locale} messages={messages}>
      <LocaleShell
        locale={locale}
        session={session}
        notificationCenter={notificationCenter}
        siteName={activeApp.siteName || siteConfig.siteName}
        announcements={announcements}
        analyticsEnabled={siteConfig.flags['analytics.pageVisits']}
      >
        {children}
      </LocaleShell>
    </I18nProvider>
  );
}
