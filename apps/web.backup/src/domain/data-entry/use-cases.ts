import type { AppRole } from '@/lib/authorization';

import {
  canReadTable,
  canWriteTable,
  managedTables,
  tablePermissions,
  type ManagedTable,
  type TablePermission,
} from './table-permissions';

export type TablePermissionView = TablePermission & {
  canRead: boolean;
  canWrite: boolean;
};

export function isManagedTable(value: string): value is ManagedTable {
  return managedTables.includes(value as ManagedTable);
}

export function getTablePermissionViews(role: AppRole): TablePermissionView[] {
  return tablePermissions
    .map((permission) => ({
      ...permission,
      canRead: canReadTable(role, permission.table),
      canWrite: canWriteTable(role, permission.table),
    }))
    .filter((permission) => permission.canRead);
}
