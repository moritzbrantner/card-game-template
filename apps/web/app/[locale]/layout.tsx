import { routing } from '@/i18n/routing';
import { I18nProvider } from '@/src/i18n';
import { resolveLocale } from '@/src/server/page-guards';

import { DocumentLanguage } from './document-language';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);

  return (
    <I18nProvider locale={locale} messages={{}}>
      <DocumentLanguage locale={locale} />
      {children}
    </I18nProvider>
  );
}
