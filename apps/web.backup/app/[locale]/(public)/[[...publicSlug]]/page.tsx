import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { routing } from '@/i18n/routing';
import { I18nProvider } from '@/src/i18n';
import { getMessages } from '@/src/i18n/messages';
import { loadActiveApp } from '@/src/app-config/load-active-app';
import { generatePublicRouteParams, resolveEnabledPublicRoute } from '@/src/app-config/public-route-resolver';
import { resolveLocale } from '@/src/server/page-guards';

export function generateStaticParams() {
  return generatePublicRouteParams(routing.locales, loadActiveApp());
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; publicSlug?: string[] }>;
}): Promise<Metadata> {
  const { locale: rawLocale, publicSlug } = await params;
  const locale = resolveLocale(rawLocale);
  const manifest = loadActiveApp();
  const resolvedRoute = resolveEnabledPublicRoute(manifest, publicSlug);

  if (!resolvedRoute) {
    return {};
  }

  return resolvedRoute.page.generateMetadata?.({
    locale,
    pageId: resolvedRoute.page.id,
    matchedSlug: resolvedRoute.matchedSlug,
    pathname: resolvedRoute.pathname,
  }) ?? {};
}

export default async function PublicPageResolver({
  params,
}: {
  params: Promise<{ locale: string; publicSlug?: string[] }>;
}) {
  const { locale: rawLocale, publicSlug } = await params;
  const locale = resolveLocale(rawLocale);
  const manifest = loadActiveApp();
  const resolvedRoute = resolveEnabledPublicRoute(manifest, publicSlug);

  if (!resolvedRoute) {
    notFound();
  }

  const pageMessages = getMessages(locale, [resolvedRoute.page.namespace]);
  const renderedPage = await resolvedRoute.page.render({
    locale,
    pageId: resolvedRoute.page.id,
    matchedSlug: resolvedRoute.matchedSlug,
    pathname: resolvedRoute.pathname,
  });

  return (
    <I18nProvider locale={locale} messages={pageMessages}>
      {renderedPage}
    </I18nProvider>
  );
}
