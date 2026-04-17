import { createAccessControl } from 'better-auth/plugins/access';

export type AppRole = 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'USER';

type BusinessAction =
  | 'viewDashboard'
  | 'editOwnProfile'
  | 'accessDataEntryWorkspace'
  | 'accessAdminArea'
  | 'viewReports'
  | 'manageUsers'
  | 'manageSystemSettings'
  | 'manageRoles';

const roleHierarchy: Record<AppRole, number> = {
  USER: 0,
  MANAGER: 1,
  ADMIN: 2,
  SUPERADMIN: 3,
};

const appAccessControl = createAccessControl({
  dashboard: ['view'],
  profile: ['update'],
  workspace: ['access'],
  admin: ['access'],
  reports: ['view'],
  users: ['manage'],
  system: ['manage'],
  roles: ['manage'],
});

const appRoles = {
  USER: appAccessControl.newRole({
    dashboard: ['view'],
    profile: ['update'],
    workspace: ['access'],
  }),
  MANAGER: appAccessControl.newRole({
    dashboard: ['view'],
    profile: ['update'],
    workspace: ['access'],
  }),
  ADMIN: appAccessControl.newRole({
    dashboard: ['view'],
    profile: ['update'],
    workspace: ['access'],
    admin: ['access'],
    reports: ['view'],
    users: ['manage'],
    system: ['manage'],
  }),
  SUPERADMIN: appAccessControl.newRole({
    dashboard: ['view'],
    profile: ['update'],
    workspace: ['access'],
    admin: ['access'],
    reports: ['view'],
    users: ['manage'],
    system: ['manage'],
    roles: ['manage'],
  }),
} as const;

type PermissionRequest = Parameters<(typeof appRoles)['SUPERADMIN']['authorize']>[0];

const actionPermissions: Record<BusinessAction, PermissionRequest> = {
  viewDashboard: {
    dashboard: ['view'],
  },
  editOwnProfile: {
    profile: ['update'],
  },
  accessDataEntryWorkspace: {
    workspace: ['access'],
  },
  accessAdminArea: {
    admin: ['access'],
  },
  viewReports: {
    reports: ['view'],
  },
  manageUsers: {
    users: ['manage'],
  },
  manageSystemSettings: {
    system: ['manage'],
  },
  manageRoles: {
    roles: ['manage'],
  },
};

export function hasRole(currentRole: AppRole | null | undefined, minimumRole: AppRole): boolean {
  if (!currentRole) {
    return false;
  }

  return roleHierarchy[currentRole] >= roleHierarchy[minimumRole];
}

export function isAdmin(role: AppRole | null | undefined): boolean {
  return hasRole(role, 'ADMIN');
}

export function isSuperAdmin(role: AppRole | null | undefined): boolean {
  return hasRole(role, 'SUPERADMIN');
}

function canPerform(role: AppRole | null | undefined, action: BusinessAction): boolean {
  if (!role) {
    return false;
  }

  return (appRoles[role] as (typeof appRoles)['SUPERADMIN']).authorize(actionPermissions[action]).success;
}

export function canViewDashboard(role: AppRole | null | undefined): boolean {
  return canPerform(role, 'viewDashboard');
}

export function canEditOwnProfile(role: AppRole | null | undefined): boolean {
  return canPerform(role, 'editOwnProfile');
}

export function canViewReports(role: AppRole | null | undefined): boolean {
  return canPerform(role, 'viewReports');
}

export function canAccessDataEntryWorkspace(role: AppRole | null | undefined): boolean {
  return canPerform(role, 'accessDataEntryWorkspace');
}

export function canAccessAdminArea(role: AppRole | null | undefined): boolean {
  return canPerform(role, 'accessAdminArea');
}

export function canManageUsers(role: AppRole | null | undefined): boolean {
  return canPerform(role, 'manageUsers');
}

export function canManageSystemSettings(role: AppRole | null | undefined): boolean {
  return canPerform(role, 'manageSystemSettings');
}

export function canManageRoles(role: AppRole | null | undefined): boolean {
  return canPerform(role, 'manageRoles');
}

export function forbidUnless(condition: unknown, message = 'Forbidden'): asserts condition {
  if (!condition) {
    const error = new Error(message) as Error & { status: 403 };
    error.name = 'AuthorizationError';
    error.status = 403;
    throw error;
  }
}
