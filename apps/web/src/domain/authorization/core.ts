import { createAccessControl } from 'better-auth/plugins/access';

export type AppRole = 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'USER';

export const appPermissionKeys = [
  'dashboard.view',
  'account.updateOwnEmail',
  'account.deleteOwn',
  'notifications.readOwn',
  'profile.editOwn',
  'profile.manageOwnImage',
  'profile.manageOwnTags',
  'profile.manageOwnSearchVisibility',
  'profile.manageOwnFollowerVisibility',
  'profile.follow',
  'profile.block',
  'workspace.access',
  'workspace.dataEntry.write',
  'admin.access',
  'admin.content.read',
  'admin.content.edit',
  'admin.reports.read',
  'admin.reports.export',
  'admin.users.read',
  'admin.users.notify',
  'admin.roles.read',
  'admin.roles.edit',
  'admin.systemSettings.read',
  'admin.systemSettings.edit',
  'admin.dataStudio.read',
  'admin.dataStudio.write',
] as const;

export type AppPermissionKey = (typeof appPermissionKeys)[number];

export type RolePermissionAssignments = Record<
  AppRole,
  readonly AppPermissionKey[]
>;

type BusinessAction =
  | 'viewDashboard'
  | 'updateOwnAccountEmail'
  | 'deleteOwnAccount'
  | 'readOwnNotifications'
  | 'editOwnProfile'
  | 'manageOwnProfileImage'
  | 'manageOwnProfileTags'
  | 'manageOwnSearchVisibility'
  | 'manageOwnFollowerVisibility'
  | 'followProfiles'
  | 'blockProfiles'
  | 'accessDataEntryWorkspace'
  | 'writeDataEntryRecords'
  | 'accessAdminArea'
  | 'readAdminContent'
  | 'editAdminContent'
  | 'viewReports'
  | 'exportReports'
  | 'manageUsers'
  | 'notifyUsers'
  | 'readRoleSettings'
  | 'manageRoles'
  | 'readSystemSettings'
  | 'manageSystemSettings'
  | 'readDataStudio'
  | 'writeDataStudio';

const roleHierarchy: Record<AppRole, number> = {
  USER: 0,
  MANAGER: 1,
  ADMIN: 2,
  SUPERADMIN: 3,
};

const appAccessControl = createAccessControl({
  dashboard: ['view'],
  account: ['updateEmail', 'delete'],
  notification: ['readOwn'],
  profile: ['update'],
  profileImage: ['update'],
  profileTag: ['update'],
  profileSearchVisibility: ['update'],
  profileFollowerVisibility: ['update'],
  profileFollow: ['create'],
  profileBlock: ['create'],
  workspace: ['access'],
  dataEntry: ['write'],
  admin: ['access'],
  adminContent: ['read', 'edit'],
  reports: ['view'],
  reportExport: ['export'],
  users: ['manage'],
  userNotification: ['send'],
  roleAssignments: ['read', 'edit'],
  system: ['manage'],
  systemSettings: ['read', 'edit'],
  dataStudio: ['read', 'write'],
});

const baseUserPermissions = {
  USER: appAccessControl.newRole({
    dashboard: ['view'],
    account: ['updateEmail', 'delete'],
    notification: ['readOwn'],
    profile: ['update'],
    profileImage: ['update'],
    profileTag: ['update'],
    profileSearchVisibility: ['update'],
    profileFollowerVisibility: ['update'],
    profileFollow: ['create'],
    profileBlock: ['create'],
    workspace: ['access'],
  }),
  MANAGER: appAccessControl.newRole({
    dashboard: ['view'],
    account: ['updateEmail', 'delete'],
    notification: ['readOwn'],
    profile: ['update'],
    profileImage: ['update'],
    profileTag: ['update'],
    profileSearchVisibility: ['update'],
    profileFollowerVisibility: ['update'],
    profileFollow: ['create'],
    profileBlock: ['create'],
    workspace: ['access'],
  }),
  ADMIN: appAccessControl.newRole({
    dashboard: ['view'],
    account: ['updateEmail', 'delete'],
    notification: ['readOwn'],
    profile: ['update'],
    profileImage: ['update'],
    profileTag: ['update'],
    profileSearchVisibility: ['update'],
    profileFollowerVisibility: ['update'],
    profileFollow: ['create'],
    profileBlock: ['create'],
    workspace: ['access'],
    dataEntry: ['write'],
    admin: ['access'],
    adminContent: ['read', 'edit'],
    reports: ['view'],
    reportExport: ['export'],
    users: ['manage'],
    userNotification: ['send'],
    roleAssignments: ['read'],
    system: ['manage'],
    systemSettings: ['read', 'edit'],
    dataStudio: ['read', 'write'],
  }),
  SUPERADMIN: appAccessControl.newRole({
    dashboard: ['view'],
    account: ['updateEmail', 'delete'],
    notification: ['readOwn'],
    profile: ['update'],
    profileImage: ['update'],
    profileTag: ['update'],
    profileSearchVisibility: ['update'],
    profileFollowerVisibility: ['update'],
    profileFollow: ['create'],
    profileBlock: ['create'],
    workspace: ['access'],
    dataEntry: ['write'],
    admin: ['access'],
    adminContent: ['read', 'edit'],
    reports: ['view'],
    reportExport: ['export'],
    users: ['manage'],
    userNotification: ['send'],
    roleAssignments: ['read', 'edit'],
    system: ['manage'],
    systemSettings: ['read', 'edit'],
    dataStudio: ['read', 'write'],
  }),
} as const;

type AccessControlRole = (typeof baseUserPermissions)['SUPERADMIN'];
type PermissionRequest = Parameters<AccessControlRole['authorize']>[0];

const actionPermissions: Record<BusinessAction, PermissionRequest> = {
  viewDashboard: {
    dashboard: ['view'],
  },
  updateOwnAccountEmail: {
    account: ['updateEmail'],
  },
  deleteOwnAccount: {
    account: ['delete'],
  },
  readOwnNotifications: {
    notification: ['readOwn'],
  },
  editOwnProfile: {
    profile: ['update'],
  },
  manageOwnProfileImage: {
    profileImage: ['update'],
  },
  manageOwnProfileTags: {
    profileTag: ['update'],
  },
  manageOwnSearchVisibility: {
    profileSearchVisibility: ['update'],
  },
  manageOwnFollowerVisibility: {
    profileFollowerVisibility: ['update'],
  },
  followProfiles: {
    profileFollow: ['create'],
  },
  blockProfiles: {
    profileBlock: ['create'],
  },
  accessDataEntryWorkspace: {
    workspace: ['access'],
  },
  writeDataEntryRecords: {
    dataEntry: ['write'],
  },
  accessAdminArea: {
    admin: ['access'],
  },
  readAdminContent: {
    adminContent: ['read'],
  },
  editAdminContent: {
    adminContent: ['edit'],
  },
  viewReports: {
    reports: ['view'],
  },
  exportReports: {
    reportExport: ['export'],
  },
  manageUsers: {
    users: ['manage'],
  },
  notifyUsers: {
    userNotification: ['send'],
  },
  readRoleSettings: {
    roleAssignments: ['read'],
  },
  readSystemSettings: {
    systemSettings: ['read'],
  },
  manageSystemSettings: {
    systemSettings: ['edit'],
  },
  manageRoles: {
    roleAssignments: ['edit'],
  },
  readDataStudio: {
    dataStudio: ['read'],
  },
  writeDataStudio: {
    dataStudio: ['write'],
  },
};

const permissionActionMap: Record<AppPermissionKey, BusinessAction> = {
  'dashboard.view': 'viewDashboard',
  'account.updateOwnEmail': 'updateOwnAccountEmail',
  'account.deleteOwn': 'deleteOwnAccount',
  'notifications.readOwn': 'readOwnNotifications',
  'profile.editOwn': 'editOwnProfile',
  'profile.manageOwnImage': 'manageOwnProfileImage',
  'profile.manageOwnTags': 'manageOwnProfileTags',
  'profile.manageOwnSearchVisibility': 'manageOwnSearchVisibility',
  'profile.manageOwnFollowerVisibility': 'manageOwnFollowerVisibility',
  'profile.follow': 'followProfiles',
  'profile.block': 'blockProfiles',
  'workspace.access': 'accessDataEntryWorkspace',
  'workspace.dataEntry.write': 'writeDataEntryRecords',
  'admin.access': 'accessAdminArea',
  'admin.content.read': 'readAdminContent',
  'admin.content.edit': 'editAdminContent',
  'admin.reports.read': 'viewReports',
  'admin.reports.export': 'exportReports',
  'admin.users.read': 'manageUsers',
  'admin.users.notify': 'notifyUsers',
  'admin.roles.read': 'readRoleSettings',
  'admin.roles.edit': 'manageRoles',
  'admin.systemSettings.read': 'readSystemSettings',
  'admin.systemSettings.edit': 'manageSystemSettings',
  'admin.dataStudio.read': 'readDataStudio',
  'admin.dataStudio.write': 'writeDataStudio',
};

export const appPermissionMetadata: Record<
  AppPermissionKey,
  {
    label: string;
    description: string;
    category: 'workspace' | 'account' | 'profile' | 'admin';
  }
> = {
  'dashboard.view': {
    label: 'View dashboard',
    description: 'Open standard authenticated workspaces.',
    category: 'workspace',
  },
  'account.updateOwnEmail': {
    label: 'Update own email',
    description: 'Change the signed-in account email address.',
    category: 'account',
  },
  'account.deleteOwn': {
    label: 'Delete own account',
    description: 'Permanently remove the signed-in account.',
    category: 'account',
  },
  'notifications.readOwn': {
    label: 'Read own notifications',
    description: 'Access and mark personal notifications as read.',
    category: 'workspace',
  },
  'profile.editOwn': {
    label: 'Edit own profile',
    description: 'Update profile details such as display name.',
    category: 'profile',
  },
  'profile.manageOwnImage': {
    label: 'Manage own profile image',
    description: 'Upload or remove the signed-in profile image.',
    category: 'profile',
  },
  'profile.manageOwnTags': {
    label: 'Manage own profile tags',
    description: 'Edit personal profile tags.',
    category: 'profile',
  },
  'profile.manageOwnSearchVisibility': {
    label: 'Manage own search visibility',
    description: 'Control whether the profile appears in search results.',
    category: 'profile',
  },
  'profile.manageOwnFollowerVisibility': {
    label: 'Manage own follower visibility',
    description: 'Control who can view follower relationships.',
    category: 'profile',
  },
  'profile.follow': {
    label: 'Follow profiles',
    description: 'Follow and unfollow other user profiles.',
    category: 'profile',
  },
  'profile.block': {
    label: 'Block profiles',
    description: 'Block and unblock other user profiles.',
    category: 'profile',
  },
  'workspace.access': {
    label: 'Access data-entry workspace',
    description: 'Open protected workspace surfaces.',
    category: 'workspace',
  },
  'workspace.dataEntry.write': {
    label: 'Write data-entry records',
    description: 'Submit changes through data-entry APIs.',
    category: 'workspace',
  },
  'admin.access': {
    label: 'Access admin workspace',
    description: 'Enter admin-only application areas.',
    category: 'admin',
  },
  'admin.content.read': {
    label: 'Read admin content',
    description: 'View announcement and content administration tools.',
    category: 'admin',
  },
  'admin.content.edit': {
    label: 'Edit admin content',
    description: 'Create, publish, archive, and delete admin-managed content.',
    category: 'admin',
  },
  'admin.reports.read': {
    label: 'Read admin reports',
    description: 'Open reporting dashboards and report detail pages.',
    category: 'admin',
  },
  'admin.reports.export': {
    label: 'Export admin reports',
    description: 'Download report exports from the admin workspace.',
    category: 'admin',
  },
  'admin.users.read': {
    label: 'Read admin users',
    description: 'Inspect the user directory and user detail screens.',
    category: 'admin',
  },
  'admin.users.notify': {
    label: 'Send admin notifications',
    description:
      'Send direct, role-based, or broadcast notifications from admin tools.',
    category: 'admin',
  },
  'admin.roles.read': {
    label: 'Read role permissions',
    description: 'Inspect role-to-permission assignments.',
    category: 'admin',
  },
  'admin.roles.edit': {
    label: 'Edit role permissions',
    description: 'Change role assignments and privileged access mappings.',
    category: 'admin',
  },
  'admin.systemSettings.read': {
    label: 'Read system settings',
    description: 'View site, analytics, and authorization settings.',
    category: 'admin',
  },
  'admin.systemSettings.edit': {
    label: 'Edit system settings',
    description:
      'Update site, analytics, feature flag, and authorization settings.',
    category: 'admin',
  },
  'admin.dataStudio.read': {
    label: 'Read data studio',
    description: 'Open the schema-driven data studio workspace.',
    category: 'admin',
  },
  'admin.dataStudio.write': {
    label: 'Write data studio records',
    description: 'Create records through the data studio API.',
    category: 'admin',
  },
};

function uniquePermissions(permissions: readonly AppPermissionKey[]) {
  return [...new Set(permissions)] as AppPermissionKey[];
}

export const defaultRolePermissionAssignments: RolePermissionAssignments = {
  USER: uniquePermissions([
    'dashboard.view',
    'account.updateOwnEmail',
    'account.deleteOwn',
    'notifications.readOwn',
    'profile.editOwn',
    'profile.manageOwnImage',
    'profile.manageOwnTags',
    'profile.manageOwnSearchVisibility',
    'profile.manageOwnFollowerVisibility',
    'profile.follow',
    'profile.block',
    'workspace.access',
  ]),
  MANAGER: uniquePermissions([
    'dashboard.view',
    'account.updateOwnEmail',
    'account.deleteOwn',
    'notifications.readOwn',
    'profile.editOwn',
    'profile.manageOwnImage',
    'profile.manageOwnTags',
    'profile.manageOwnSearchVisibility',
    'profile.manageOwnFollowerVisibility',
    'profile.follow',
    'profile.block',
    'workspace.access',
  ]),
  ADMIN: uniquePermissions([
    'dashboard.view',
    'account.updateOwnEmail',
    'account.deleteOwn',
    'notifications.readOwn',
    'profile.editOwn',
    'profile.manageOwnImage',
    'profile.manageOwnTags',
    'profile.manageOwnSearchVisibility',
    'profile.manageOwnFollowerVisibility',
    'profile.follow',
    'profile.block',
    'workspace.access',
    'workspace.dataEntry.write',
    'admin.access',
    'admin.content.read',
    'admin.content.edit',
    'admin.reports.read',
    'admin.reports.export',
    'admin.users.read',
    'admin.users.notify',
    'admin.roles.read',
    'admin.systemSettings.read',
    'admin.systemSettings.edit',
    'admin.dataStudio.read',
    'admin.dataStudio.write',
  ]),
  SUPERADMIN: uniquePermissions([
    'dashboard.view',
    'account.updateOwnEmail',
    'account.deleteOwn',
    'notifications.readOwn',
    'profile.editOwn',
    'profile.manageOwnImage',
    'profile.manageOwnTags',
    'profile.manageOwnSearchVisibility',
    'profile.manageOwnFollowerVisibility',
    'profile.follow',
    'profile.block',
    'workspace.access',
    'workspace.dataEntry.write',
    'admin.access',
    'admin.content.read',
    'admin.content.edit',
    'admin.reports.read',
    'admin.reports.export',
    'admin.users.read',
    'admin.users.notify',
    'admin.roles.read',
    'admin.roles.edit',
    'admin.systemSettings.read',
    'admin.systemSettings.edit',
    'admin.dataStudio.read',
    'admin.dataStudio.write',
  ]),
};

export function normalizeRolePermissionAssignments(
  input:
    | Partial<Record<AppRole, readonly AppPermissionKey[]>>
    | null
    | undefined,
): RolePermissionAssignments {
  return {
    USER: uniquePermissions(
      (input?.USER ?? defaultRolePermissionAssignments.USER).filter(
        isAppPermissionKey,
      ),
    ),
    MANAGER: uniquePermissions(
      (input?.MANAGER ?? defaultRolePermissionAssignments.MANAGER).filter(
        isAppPermissionKey,
      ),
    ),
    ADMIN: uniquePermissions(
      (input?.ADMIN ?? defaultRolePermissionAssignments.ADMIN).filter(
        isAppPermissionKey,
      ),
    ),
    SUPERADMIN: uniquePermissions(
      (input?.SUPERADMIN ?? defaultRolePermissionAssignments.SUPERADMIN).filter(
        isAppPermissionKey,
      ),
    ),
  };
}

export function isAppPermissionKey(value: unknown): value is AppPermissionKey {
  return (
    typeof value === 'string' &&
    (appPermissionKeys as readonly string[]).includes(value)
  );
}

export function getPermissionsForRole(
  role: AppRole | null | undefined,
  assignments: RolePermissionAssignments = defaultRolePermissionAssignments,
): readonly AppPermissionKey[] {
  if (!role) {
    return [];
  }

  return assignments[role] ?? [];
}

export function hasRole(
  currentRole: AppRole | null | undefined,
  minimumRole: AppRole,
): boolean {
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

function canPerform(
  role: AppRole | null | undefined,
  action: BusinessAction,
): boolean {
  if (!role) {
    return false;
  }

  return (baseUserPermissions[role] as AccessControlRole).authorize(
    actionPermissions[action],
  ).success;
}

export function hasPermission(
  role: AppRole | null | undefined,
  permission: AppPermissionKey,
  assignments: RolePermissionAssignments = defaultRolePermissionAssignments,
): boolean {
  if (!role) {
    return false;
  }

  const permissions = getPermissionsForRole(role, assignments);

  if (!permissions.includes(permission)) {
    return false;
  }

  return canPerform(role, permissionActionMap[permission]);
}

export function canViewDashboard(role: AppRole | null | undefined): boolean {
  return hasPermission(role, 'dashboard.view');
}

export function canUpdateOwnAccountEmail(
  role: AppRole | null | undefined,
): boolean {
  return hasPermission(role, 'account.updateOwnEmail');
}

export function canDeleteOwnAccount(role: AppRole | null | undefined): boolean {
  return hasPermission(role, 'account.deleteOwn');
}

export function canReadOwnNotifications(
  role: AppRole | null | undefined,
): boolean {
  return hasPermission(role, 'notifications.readOwn');
}

export function canEditOwnProfile(role: AppRole | null | undefined): boolean {
  return hasPermission(role, 'profile.editOwn');
}

export function canManageOwnProfileImage(
  role: AppRole | null | undefined,
): boolean {
  return hasPermission(role, 'profile.manageOwnImage');
}

export function canManageOwnProfileTags(
  role: AppRole | null | undefined,
): boolean {
  return hasPermission(role, 'profile.manageOwnTags');
}

export function canManageOwnSearchVisibility(
  role: AppRole | null | undefined,
): boolean {
  return hasPermission(role, 'profile.manageOwnSearchVisibility');
}

export function canManageOwnFollowerVisibility(
  role: AppRole | null | undefined,
): boolean {
  return hasPermission(role, 'profile.manageOwnFollowerVisibility');
}

export function canFollowProfiles(role: AppRole | null | undefined): boolean {
  return hasPermission(role, 'profile.follow');
}

export function canBlockProfiles(role: AppRole | null | undefined): boolean {
  return hasPermission(role, 'profile.block');
}

export function canViewReports(role: AppRole | null | undefined): boolean {
  return hasPermission(role, 'admin.reports.read');
}

export function canExportReports(role: AppRole | null | undefined): boolean {
  return hasPermission(role, 'admin.reports.export');
}

export function canAccessDataEntryWorkspace(
  role: AppRole | null | undefined,
): boolean {
  return hasPermission(role, 'workspace.access');
}

export function canWriteDataEntryRecords(
  role: AppRole | null | undefined,
): boolean {
  return hasPermission(role, 'workspace.dataEntry.write');
}

export function canAccessAdminArea(role: AppRole | null | undefined): boolean {
  return hasPermission(role, 'admin.access');
}

export function canReadAdminContent(role: AppRole | null | undefined): boolean {
  return hasPermission(role, 'admin.content.read');
}

export function canEditAdminContent(role: AppRole | null | undefined): boolean {
  return hasPermission(role, 'admin.content.edit');
}

export function canManageUsers(role: AppRole | null | undefined): boolean {
  return hasPermission(role, 'admin.users.read');
}

export function canNotifyUsers(role: AppRole | null | undefined): boolean {
  return hasPermission(role, 'admin.users.notify');
}

export function canReadRoleSettings(role: AppRole | null | undefined): boolean {
  return hasPermission(role, 'admin.roles.read');
}

export function canManageSystemSettings(
  role: AppRole | null | undefined,
): boolean {
  return hasPermission(role, 'admin.systemSettings.edit');
}

export function canReadSystemSettings(
  role: AppRole | null | undefined,
): boolean {
  return hasPermission(role, 'admin.systemSettings.read');
}

export function canManageRoles(role: AppRole | null | undefined): boolean {
  return hasPermission(role, 'admin.roles.edit');
}

export function canReadDataStudio(role: AppRole | null | undefined): boolean {
  return hasPermission(role, 'admin.dataStudio.read');
}

export function canWriteDataStudio(role: AppRole | null | undefined): boolean {
  return hasPermission(role, 'admin.dataStudio.write');
}

export function forbidUnless(
  condition: unknown,
  message = 'Forbidden',
): asserts condition {
  if (!condition) {
    const error = new Error(message) as Error & { status: 403 };
    error.name = 'AuthorizationError';
    error.status = 403;
    throw error;
  }
}
