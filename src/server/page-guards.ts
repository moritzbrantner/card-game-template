import { notFound, redirect } from 'next/navigation';

import type { AppPermissionKey } from '@/lib/authorization';
import { canAccessDataEntryWorkspace } from '@/lib/authorization';
import { type AppLocale, hasLocale, withLocalePath } from '@/i18n/routing';
import type { AppSessionUser } from '@/src/auth';
import type { FoundationFeatureKey } from '@/src/app-config/feature-keys';
import { getAuthSession } from '@/src/auth.server';
import { hasPermissionForRole } from '@/src/domain/authorization/service';
import { isFeatureEnabledForUser, isSiteFeatureEnabled } from '@/src/foundation/features/access';
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
  return requirePermission(locale, 'admin.access');
}

export async function requirePermission(locale: AppLocale, permission: AppPermissionKey) {
  const session = await requireAuth(locale);

  if (!await hasPermissionForRole(session.user.role, permission)) {
    redirectToLocaleHome(locale);
  }

  return session;
}

export async function notFoundUnlessFeatureEnabled(featureKey: FoundationFeatureKey) {
  if (!await isSiteFeatureEnabled(featureKey)) {
    notFound();
  }
}

export async function notFoundUnlessFeatureEnabledForUser(
  featureKey: FoundationFeatureKey,
  user: Pick<AppSessionUser, 'id' | 'role'> | null | undefined,
) {
  if (!await isFeatureEnabledForUser(featureKey, user ? { id: user.id, role: user.role } : null)) {
    notFound();
  }
}
