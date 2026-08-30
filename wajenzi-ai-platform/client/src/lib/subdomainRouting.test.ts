import { describe, expect, it } from "vitest";
import { getDashboardKeyForHostname, getEnvironmentForHostname, getSubdomainForDashboard, normalizeHostname } from "./subdomainRouting";

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

  it("keeps marketing, universal, admin, and control environments distinct", () => {
    expect(getEnvironmentForHostname("wajenzi.ai")).toBe("public");
    expect(getEnvironmentForHostname("app.wajenzi.ai")).toBe("universal");
    expect(getEnvironmentForHostname("admin.wajenzi.ai")).toBe("admin");
    expect(getEnvironmentForHostname("control.wajenzi.ai")).toBe("control");
    expect(getEnvironmentForHostname("preview.example.vercel.app")).toBe("unknown");
  });
});
