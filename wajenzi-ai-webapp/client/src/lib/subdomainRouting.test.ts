import { describe, expect, it } from "vitest";
import { dashboardPathForPersona, personaRequestedByHost } from "./subdomainRouting";

describe("host-aware dashboard entry", () => {
  it("maps supported wajenzi.ai subdomains to the intended requested role", () => {
    expect(personaRequestedByHost("admin.wajenzi.ai")).toBe("administrator");
    expect(personaRequestedByHost("supplier.wajenzi.ai")).toBe("supplier");
    expect(personaRequestedByHost("project-manager.wajenzi.ai:443")).toBe("project_manager");
  });

  it("does not infer a role from local previews or unrelated domains", () => {
    expect(personaRequestedByHost("localhost:3000")).toBeUndefined();
    expect(personaRequestedByHost("wajenzi.ai")).toBeUndefined();
    expect(personaRequestedByHost("admin.example.com")).toBeUndefined();
  });

  it("lands every authorized persona on the same role-aware workspace shell", () => {
    expect(dashboardPathForPersona("administrator")).toBe("/");
    expect(dashboardPathForPersona("contractor")).toBe("/");
    expect(dashboardPathForPersona("supplier")).toBe("/");
  });
});
