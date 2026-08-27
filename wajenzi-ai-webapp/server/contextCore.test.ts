import { describe, expect, it } from "vitest";
import { defaultPersonaForMembershipRole, permittedPersonasForMembership, selectAuthorizedMembership } from "./contextCore";

describe("authenticated workspace context rules", () => {
  it("derives a safe default persona from the actual workspace role", () => {
    expect(defaultPersonaForMembershipRole("supplier")).toBe("supplier");
    expect(defaultPersonaForMembershipRole("registry_steward")).toBe("administrator");
    expect(defaultPersonaForMembershipRole("viewer")).toBe("custom");
  });

  it("accepts only explicitly supported persona keys from membership scope", () => {
    expect(permittedPersonasForMembership("contractor", { allowedPersonas: ["contractor", "project_manager", "not-a-role", "contractor"] })).toEqual(["contractor", "project_manager"]);
    expect(permittedPersonasForMembership("supplier", { allowedPersonas: ["not-a-role"] })).toEqual(["supplier"]);
  });

  it("selects only a membership supplied by the authorized membership list", () => {
    const memberships = [{ workspaceId: 8, label: "A" }, { workspaceId: 14, label: "B" }];
    expect(selectAuthorizedMembership(memberships, 14)).toEqual(memberships[1]);
    expect(selectAuthorizedMembership(memberships, 999)).toEqual(memberships[0]);
  });
});
