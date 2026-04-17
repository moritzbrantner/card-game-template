import { loadActiveApp } from '@/src/app-config/load-active-app';
import type { AppManifest } from '@/src/app-config/contracts';
import type { FoundationFeatureKey } from '@/src/app-config/feature-keys';
import { isFeatureEnabled } from '@/src/foundation/features/runtime';

export const adminPageDefinitions = [
  { key: 'overview', href: '/admin', featureKey: 'admin.workspace' },
  { key: 'content', href: '/admin/content', featureKey: 'admin.content' },
  { key: 'reports', href: '/admin/reports', featureKey: 'admin.reports' },
  { key: 'users', href: '/admin/users', featureKey: 'admin.users' },
  { key: 'systemSettings', href: '/admin/system-settings', featureKey: 'admin.systemSettings' },
  { key: 'dataStudio', href: '/admin/data-studio', featureKey: 'admin.dataStudio' },
] as const satisfies readonly {
  key: string;
  href: string;
  featureKey: FoundationFeatureKey;
}[];

export type AdminPageKey = (typeof adminPageDefinitions)[number]['key'];

export const adminWorkspacePageDefinitions = adminPageDefinitions.filter((page) => page.key !== 'overview');

export function getEnabledAdminPageDefinitions(manifest: AppManifest = loadActiveApp()) {
  return adminPageDefinitions.filter((page) => isFeatureEnabled(page.featureKey, manifest));
}

export function getEnabledAdminWorkspacePageDefinitions(manifest: AppManifest = loadActiveApp()) {
  return adminWorkspacePageDefinitions.filter((page) => isFeatureEnabled(page.featureKey, manifest));
}
