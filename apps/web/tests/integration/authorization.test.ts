import { describe, expect, it } from "vitest";

import {
  canAccessAdminArea,
  canAccessDataEntryWorkspace,
  canEditOwnProfile,
  canManageRoles,
  canManageSystemSettings,
  canManageUsers,
  canViewDashboard,
  canViewReports,
  forbidUnless,
  hasRole,
  isAdmin,
  isSuperAdmin,
} from "@/lib/authorization";

describe("authorization helpers", () => {
  it("evaluates role hierarchy via hasRole", () => {
    expect(hasRole("SUPERADMIN", "ADMIN")).toBe(true);
    expect(hasRole("ADMIN", "USER")).toBe(true);
    expect(hasRole("MANAGER", "USER")).toBe(true);
    expect(hasRole("ADMIN", "MANAGER")).toBe(true);
    expect(hasRole("USER", "ADMIN")).toBe(false);
    expect(hasRole(undefined, "USER")).toBe(false);
  });

  it("detects admin role", () => {
    expect(isAdmin("SUPERADMIN")).toBe(true);
    expect(isSuperAdmin("SUPERADMIN")).toBe(true);
    expect(isAdmin("ADMIN")).toBe(true);
    expect(isSuperAdmin("ADMIN")).toBe(false);
    expect(isAdmin("USER")).toBe(false);
  });

  it("checks business action permissions", () => {
    expect(canViewDashboard("USER")).toBe(true);
    expect(canEditOwnProfile("USER")).toBe(true);
    expect(canAccessDataEntryWorkspace("USER")).toBe(true);
    expect(canViewReports("USER")).toBe(false);
    expect(canAccessAdminArea("USER")).toBe(false);

    expect(canViewReports("MANAGER")).toBe(false);
    expect(canManageUsers("MANAGER")).toBe(false);
    expect(canAccessAdminArea("MANAGER")).toBe(false);
    expect(canManageRoles("ADMIN")).toBe(false);
    expect(canViewReports("ADMIN")).toBe(true);
    expect(canManageUsers("ADMIN")).toBe(true);
    expect(canManageSystemSettings("ADMIN")).toBe(true);
    expect(canManageRoles("SUPERADMIN")).toBe(true);
  });

  it("throws when forbidUnless condition is false", () => {
    expect(() => forbidUnless(true, "ok")).not.toThrow();

    expect(() => forbidUnless(false, "No access")).toThrowError("No access");
  });
});
