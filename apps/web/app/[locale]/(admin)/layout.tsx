import { LocaleShell } from '@/components/locale-shell';
import { getPermissionSetForRole } from '@/src/domain/authorization/service';
import { loadActiveApp } from '@/src/app-config/load-active-app';
import { I18nProvider } from '@/src/i18n';
import { getMessages } from '@/src/i18n/messages';
import { adminWebsiteNamespaces } from '@/src/i18n/namespaces';
import { loadAppContext } from '@/src/runtime.functions';
import { notFoundUnlessFeatureEnabled, redirectToLocaleHome, resolveLocale } from '@/src/server/page-guards';
import { getActiveAnnouncements, getPublicSiteConfig } from '@/src/site-config/service';

export default async function AdminLocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('admin.workspace');
  const activeApp = loadActiveApp();
  const [appContext, siteConfig, announcements] = await Promise.all([
    loadAppContext(),
    getPublicSiteConfig(),
    getActiveAnnouncements(locale),
  ]);

  const permissionSet = await getPermissionSetForRole(appContext.session?.user.role);

  if (!appContext.session?.user?.id || !permissionSet.has('admin.access')) {
    redirectToLocaleHome(locale);
  }

  const messages = getMessages(locale, adminWebsiteNamespaces);

  return (
    <I18nProvider locale={locale} messages={messages}>
      <LocaleShell
        locale={locale}
        session={appContext.session}
        notificationCenter={appContext.notificationCenter}
        siteName={activeApp.siteName || siteConfig.siteName}
        announcements={announcements}
        analyticsEnabled={siteConfig.flags['analytics.pageVisits']}
      >
        {children}
      </LocaleShell>
    </I18nProvider>
  );
}
