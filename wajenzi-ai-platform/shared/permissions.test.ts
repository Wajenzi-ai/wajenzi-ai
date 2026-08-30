import { describe, expect, it } from "vitest";
import { roleHasPermission, WAJENZI_PERMISSIONS } from "./permissions";

describe("Wajenzi permission registry", () => {
  it("declares supplier governance permissions centrally", () => {
    expect(roleHasPermission("supplier", WAJENZI_PERMISSIONS.supplierVerify)).toBe(true);
    expect(roleHasPermission("supplier", WAJENZI_PERMISSIONS.erpManage)).toBe(true);
    expect(roleHasPermission("contractor", WAJENZI_PERMISSIONS.supplierVerify)).toBe(false);
  });

  it("keeps platform administration separate from operating roles", () => {
    expect(roleHasPermission("admin", WAJENZI_PERMISSIONS.platformAdmin)).toBe(true);
    expect(roleHasPermission("super_admin", WAJENZI_PERMISSIONS.platformSuperAdmin)).toBe(true);
    expect(roleHasPermission("supplier", WAJENZI_PERMISSIONS.platformAdmin)).toBe(false);
    expect(roleHasPermission("unknown", WAJENZI_PERMISSIONS.projectRead)).toBe(false);
  });
});
