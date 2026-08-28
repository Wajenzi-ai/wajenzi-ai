import { describe, expect, it } from "vitest";
import { roleWorkDetailConfig } from "./roleWorkDetails";

describe("role work detail configuration", () => {
  it("provides concrete evidence fields for each governed construction workflow", () => {
    expect(roleWorkDetailConfig("boq").referenceLabel).toContain("BOQ");
    expect(roleWorkDetailConfig("approval").detailLabel).toContain("Decision");
    expect(roleWorkDetailConfig("delivery").detailPlaceholder).toContain("proof");
    expect(roleWorkDetailConfig("registry").referencePlaceholder).toContain("WZ-CAT");
  });
});
