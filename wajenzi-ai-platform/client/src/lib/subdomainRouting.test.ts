import { describe, expect, it } from "vitest";
import { getDashboardKeyForHostname, getEnvironmentForHostname, getHostnameDefinition, getSubdomainForDashboard, hasHostnameWorkspaceAccess, normalizeHostname, requestedSubdomains } from "./subdomainRouting";

describe("Wajenzi subdomain routing", () => {
  it("normalizes hostnames without affecting the domain registry", () => {
    expect(normalizeHostname("Supplier.Wajenzi.AI:443")).toBe("supplier.wajenzi.ai");
    expect(getEnvironmentForHostname("https://supplier.wajenzi.ai")).toBe("role");
  });

  it("maps role subdomains to existing shared dashboard keys", () => {
    expect(getDashboardKeyForHostname("supplier.wajenzi.ai")).toBe("supplier");
    expect(getDashboardKeyForHostname("qs.wajenzi.ai")).toBe("quantity-surveyor");
    expect(getDashboardKeyForHostname("finance.wajenzi.ai")).toBe("financier");
    expect(getSubdomainForDashboard("manufacturer")).toBe("manufacturer");
  });

  it("maps every requested production hostname to the shared deployment entry point", () => {
    expect(requestedSubdomains).toEqual(["app", "admin", "client", "contractor", "supplier", "manufacturer", "logistics", "finance"]);
    expect(getEnvironmentForHostname("app.wajenzi.ai")).toBe("universal");
    expect(getDashboardKeyForHostname("admin.wajenzi.ai")).toBe("admin");
    expect(getDashboardKeyForHostname("client.wajenzi.ai")).toBe("homeowner");
    expect(getDashboardKeyForHostname("contractor.wajenzi.ai")).toBe("contractor");
    expect(getDashboardKeyForHostname("supplier.wajenzi.ai")).toBe("supplier");
    expect(getDashboardKeyForHostname("manufacturer.wajenzi.ai")).toBe("manufacturer");
    expect(getDashboardKeyForHostname("logistics.wajenzi.ai")).toBe("logistics");
    expect(getDashboardKeyForHostname("finance.wajenzi.ai")).toBe("financier");
  });

  it("keeps marketing, universal, admin, and control environments distinct", () => {
    expect(getEnvironmentForHostname("wajenzi.ai")).toBe("public");
    expect(getEnvironmentForHostname("app.wajenzi.ai")).toBe("universal");
    expect(getEnvironmentForHostname("admin.wajenzi.ai")).toBe("admin");
    expect(getEnvironmentForHostname("control.wajenzi.ai")).toBe("control");
    expect(getEnvironmentForHostname("preview.example.vercel.app")).toBe("unknown");
  });

  it("denies role-host access when the identity has no matching membership", () => {
    expect(getHostnameDefinition("supplier.wajenzi.ai")?.access).toBe("supplier");
    expect(hasHostnameWorkspaceAccess("supplier", { userRole: "user", workspaceRoles: ["contractor"], projectRoles: ["contractor"] })).toBe(false);
    expect(hasHostnameWorkspaceAccess("supplier", { userRole: "user", workspaceRoles: ["supplier_admin"], projectRoles: [] })).toBe(true);
    expect(hasHostnameWorkspaceAccess("admin", { userRole: "user", workspaceRoles: ["platform_admin"], projectRoles: [] })).toBe(true);
    expect(hasHostnameWorkspaceAccess("admin", { userRole: "user", workspaceRoles: ["supplier_admin"], projectRoles: [] })).toBe(false);
  });
});
