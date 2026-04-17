import { loadActiveApp } from '@/src/app-config/load-active-app';
import type { AppManifest } from '@/src/app-config/contracts';
import type { FoundationFeatureKey } from '@/src/app-config/feature-keys';
import { isFeatureEnabled } from '@/src/foundation/features/runtime';
import type { AppPermissionKey, AppRole } from '@/lib/authorization';
import { hasPermissionForRole } from '@/src/domain/authorization/service';

export const adminPageDefinitions = [
  { key: 'overview', href: '/admin', featureKey: 'admin.workspace', permission: 'admin.access' },
  { key: 'content', href: '/admin/content', featureKey: 'admin.content', permission: 'admin.content.read' },
  { key: 'reports', href: '/admin/reports', featureKey: 'admin.reports', permission: 'admin.reports.read' },
  { key: 'users', href: '/admin/users', featureKey: 'admin.users', permission: 'admin.users.read' },
  { key: 'systemSettings', href: '/admin/system-settings', featureKey: 'admin.systemSettings', permission: 'admin.systemSettings.read' },
  { key: 'dataStudio', href: '/admin/data-studio', featureKey: 'admin.dataStudio', permission: 'admin.dataStudio.read' },
] as const satisfies readonly {
  key: string;
  href: string;
  featureKey: FoundationFeatureKey;
  permission: AppPermissionKey;
}[];

export type AdminPageKey = (typeof adminPageDefinitions)[number]['key'];

export const adminWorkspacePageDefinitions = adminPageDefinitions.filter((page) => page.key !== 'overview');

export function getEnabledAdminPageDefinitions(manifest: AppManifest = loadActiveApp()) {
  return adminPageDefinitions.filter((page) => isFeatureEnabled(page.featureKey, manifest));
}

export function getEnabledAdminWorkspacePageDefinitions(manifest: AppManifest = loadActiveApp()) {
  return adminWorkspacePageDefinitions.filter((page) => isFeatureEnabled(page.featureKey, manifest));
}

export async function getAuthorizedAdminPageDefinitions(role: AppRole | null | undefined, manifest: AppManifest = loadActiveApp()) {
  const enabledPages = getEnabledAdminPageDefinitions(manifest);
  const checks = await Promise.all(enabledPages.map((page) => hasPermissionForRole(role, page.permission)));

  return enabledPages.filter((_, index) => checks[index]);
}

export async function getAuthorizedAdminWorkspacePageDefinitions(role: AppRole | null | undefined, manifest: AppManifest = loadActiveApp()) {
  const enabledPages = getEnabledAdminWorkspacePageDefinitions(manifest);
  const checks = await Promise.all(enabledPages.map((page) => hasPermissionForRole(role, page.permission)));

  return enabledPages.filter((_, index) => checks[index]);
}
