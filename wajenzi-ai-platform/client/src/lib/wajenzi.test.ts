import { describe, expect, it } from "vitest";
import { dashboardNavigation } from "./wajenzi";

describe("role workspace registry", () => {
  it("provides the specified professional and organization role routes", () => {
    expect(dashboardNavigation).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "architect", path: "/app/architect" }),
      expect.objectContaining({ key: "quantity-surveyor", path: "/app/quantity-surveyor" }),
      expect.objectContaining({ key: "manufacturer", path: "/app/manufacturer" }),
      expect.objectContaining({ key: "custom-role", path: "/app/custom-role" }),
      expect.objectContaining({ key: "operations", path: "/app/operations" }),
    ]));
  });

  it("keeps every workspace path unique", () => {
    const paths = dashboardNavigation.map((item) => item.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
