import { notFound, redirect } from 'next/navigation';

import { canAccessDataEntryWorkspace, isAdmin } from '@/lib/authorization';
import { type AppLocale, hasLocale, withLocalePath } from '@/i18n/routing';
import type { FoundationFeatureKey } from '@/src/app-config/feature-keys';
import { getAuthSession } from '@/src/auth.server';
import { isFeatureEnabled } from '@/src/foundation/features/runtime';
import { isGithubPagesBuild } from '@/src/runtime/build-target';

export function resolveLocale(locale: string): AppLocale {
  if (!hasLocale(locale)) {
    notFound();
  }

  return locale;
}

export function redirectToLocaleHome(locale: AppLocale): never {
  redirect(withLocalePath('/', locale));
}

export async function requireGuest(locale: AppLocale) {
  if (isGithubPagesBuild) {
    return null;
  }

  const session = await getAuthSession();

  if (session?.user?.id) {
    redirect(withLocalePath('/profile', locale));
  }

  return session;
}

export async function requireAuth(locale: AppLocale) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirectToLocaleHome(locale);
  }

  return session;
}

export async function requireWorkspaceAccess(locale: AppLocale) {
  const session = await requireAuth(locale);

  if (!canAccessDataEntryWorkspace(session.user.role)) {
    redirectToLocaleHome(locale);
  }

  return session;
}

export async function requireAdmin(locale: AppLocale) {
  const session = await requireAuth(locale);

  if (!isAdmin(session.user.role)) {
    redirectToLocaleHome(locale);
  }

  return session;
}

export function notFoundUnlessFeatureEnabled(featureKey: FoundationFeatureKey) {
  if (!isFeatureEnabled(featureKey)) {
    notFound();
  }
}
