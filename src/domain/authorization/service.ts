import { unstable_cache } from 'next/cache';

import type { AppRole, AppPermissionKey, RolePermissionAssignments } from '@/lib/authorization';
import {
  appPermissionKeys,
  defaultRolePermissionAssignments,
  hasPermission,
  normalizeRolePermissionAssignments,
} from '@/lib/authorization';
import { getDb } from '@/src/db/client';
import { siteSettings } from '@/src/db/schema';
import { upsertSiteSetting } from '@/src/site-config/service';

const AUTHORIZATION_SITE_SETTING_KEY = 'authorization.rolePermissions';
const AUTHORIZATION_CACHE_TAG = 'site-config';
const AUTHORIZATION_CACHE_TTL_SECONDS = 60;

async function loadRolePermissionAssignments(): Promise<RolePermissionAssignments> {
  const row = await getDb().query.siteSettings.findFirst({
    where: (table, { eq }) => eq(table.key, AUTHORIZATION_SITE_SETTING_KEY),
  });

  if (!row?.value) {
    return defaultRolePermissionAssignments;
  }

  try {
    const parsed = JSON.parse(row.value) as Partial<Record<AppRole, readonly AppPermissionKey[]>>;
    return normalizeRolePermissionAssignments(parsed);
  } catch {
    return defaultRolePermissionAssignments;
  }
}

const getCachedRolePermissionAssignments = unstable_cache(
  loadRolePermissionAssignments,
  ['authorization-role-permissions'],
  {
    revalidate: AUTHORIZATION_CACHE_TTL_SECONDS,
    tags: [AUTHORIZATION_CACHE_TAG],
  },
);

export async function getRolePermissionAssignments(): Promise<RolePermissionAssignments> {
  return getCachedRolePermissionAssignments();
}

export async function getPermissionSetForRole(role: AppRole | null | undefined): Promise<Set<AppPermissionKey>> {
  if (!role) {
    return new Set<AppPermissionKey>();
  }

  const assignments = await getRolePermissionAssignments();
  return new Set(assignments[role]);
}

export async function hasPermissionForRole(
  role: AppRole | null | undefined,
  permission: AppPermissionKey,
): Promise<boolean> {
  const assignments = await getRolePermissionAssignments();
  return hasPermission(role, permission, assignments);
}

export async function saveRolePermissionAssignments(
  input: Partial<Record<AppRole, readonly AppPermissionKey[]>>,
): Promise<RolePermissionAssignments> {
  const normalized = normalizeRolePermissionAssignments(input);
  await upsertSiteSetting(AUTHORIZATION_SITE_SETTING_KEY, JSON.stringify(normalized));
  return normalized;
}

export function getAuthorizationPermissionCatalog() {
  return appPermissionKeys.map((key) => key);
}
