import {
  canAccessAdminArea,
  canManageRoles,
  canManageSystemSettings,
  canManageUsers,
  canViewReports,
  type AppRole,
} from "@/lib/authorization";
import type { AppSession } from "@/src/auth";
import { failure, success, type ServiceResult } from "@/src/domain/shared/result";

export const adminActionKeys = ["viewReports", "manageUsers", "manageRoles", "manageSystemSettings"] as const;

export type AdminActionKey = (typeof adminActionKeys)[number];

export type AdminActionPermission = {
  key: AdminActionKey;
  allowed: boolean;
};

export type AuthorizationError =
  | {
      code: "AUTHENTICATION_REQUIRED";
      message: string;
    }
  | {
      code: "FORBIDDEN";
      message: string;
    };

export type AdminAuthorizationPayload = {
  actions: readonly AdminActionPermission[];
};

export function getAdminActionPermissions(role: AppRole | null | undefined): readonly AdminActionPermission[] {
  return [
    {
      key: "viewReports",
      allowed: canViewReports(role),
    },
    {
      key: "manageUsers",
      allowed: canManageUsers(role),
    },
    {
      key: "manageRoles",
      allowed: canManageRoles(role),
    },
    {
      key: "manageSystemSettings",
      allowed: canManageSystemSettings(role),
    },
  ];
}

export function getAdminAuthorization(
  session: AppSession | null,
): ServiceResult<AdminAuthorizationPayload, AuthorizationError> {
  if (!session?.user?.id) {
    return failure({
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication required.",
    });
  }

  const role = session.user.role;
  if (!canAccessAdminArea(role)) {
    return failure({
      code: "FORBIDDEN",
      message: "You do not have permission to access admin actions.",
    });
  }

  return success({
    actions: getAdminActionPermissions(role),
  });
}
