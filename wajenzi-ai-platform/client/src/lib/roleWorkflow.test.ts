import { describe, expect, it } from "vitest";
import { requiresWorkflowConfirmation, roleWorkType, workflowReference } from "./roleWorkflow";

describe("role workflow safeguards", () => {
  it("builds stable traceability references for role actions", () => {
    expect(workflowReference("quantity-surveyor", "Prepare valuation")).toBe("quantity-surveyor-prepare-valuation");
  });

  it("requires an explicit confirmation for sensitive financial, approval, publishing, and issue actions", () => {
    expect(requiresWorkflowConfirmation("financier", "Log exception")).toBe(true);
    expect(requiresWorkflowConfirmation("developer", "Approve procurement")).toBe(true);
    expect(requiresWorkflowConfirmation("architect", "Issue specification")).toBe(true);
    expect(requiresWorkflowConfirmation("engineer", "Log inspection")).toBe(false);
  });

  it("classifies dashboard work into typed construction workflow categories", () => {
    expect(roleWorkType("quantity-surveyor", "Prepare valuation")).toBe("boq");
    expect(roleWorkType("developer", "Approve procurement")).toBe("approval");
    expect(roleWorkType("architect", "Issue specification")).toBe("document");
    expect(roleWorkType("financier", "Check settlement")).toBe("finance");
    expect(roleWorkType("project-manager", "Confirm delivery readiness")).toBe("delivery");
    expect(roleWorkType("operations", "Review canonical match")).toBe("registry");
  });
});
