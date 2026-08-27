import { describe, expect, it } from "vitest";
import { runAgentInput } from "./agents";

describe("agent run input policy", () => {
  it("requires a persisted source for product intelligence", () => {
    const withoutSource = runAgentInput.safeParse({ agentKey: "product_intelligence", objective: "Assess the supplier product." });
    expect(withoutSource.success).toBe(false);
    const fromSupplierSubmission = runAgentInput.safeParse({ agentKey: "product_intelligence", objective: "Assess the supplier product.", supplierSubmissionId: 12 });
    const fromCatalogueFile = runAgentInput.safeParse({ agentKey: "product_intelligence", objective: "Assess the catalogue item.", sourceFileWajenziId: "WJZ-DOC-ABCDEFGH123456" });
    expect(fromSupplierSubmission.success).toBe(true);
    expect(fromCatalogueFile.success).toBe(true);
  });

  it("does not add a source requirement to non-product advisory agents", () => {
    expect(runAgentInput.safeParse({ agentKey: "procurement", objective: "Assess qualified cement offers." }).success).toBe(true);
  });
});
