import { describe, expect, it } from "vitest";
import { buildEvidenceGaps, constrainAgentCandidates, parseAgentContent } from "./agentCore";
import { createWajenziId } from "./registryCore";

const validAnalysis = {
  intent: "Review canonical product candidates.",
  knownFacts: [{ claim: "One bounded candidate was supplied.", evidenceRefs: ["WJZ-PRD-AAAAAAAAAAAAAA"] }],
  inferences: [],
  missingInformation: ["Supplier GTIN is missing."],
  recommendedNextSteps: ["Ask a registry steward to review the bounded candidate."],
  requiresApproval: ["A steward must approve a canonical merge or new product."],
  prohibitedActions: ["Do not create a canonical product automatically."],
  candidates: [{ wajenziId: "WJZ-PRD-AAAAAAAAAAAAAA", reason: "Similar product name", confidence: 0.74 }, { wajenziId: "WJZ-PRD-NOTINCONTEXT", reason: "Invented identifier", confidence: 0.99 }],
  overallConfidence: 0.72,
};

describe("governed agent output controls", () => {
  it("uses dedicated immutable prefixes for agent runs and approval proposals", () => {
    expect(createWajenziId("AGN", "agent-run")).toMatch(/^WJZ-AGN-/);
    expect(createWajenziId("PRP", "agent-proposal")).toMatch(/^WJZ-PRP-/);
  });

  it("drops identifiers that are not in the supplied canonical candidate context", () => {
    const constrained = constrainAgentCandidates(validAnalysis, [{ wajenziId: "WJZ-PRD-AAAAAAAAAAAAAA", canonicalName: "Approved cement candidate" }]);
    expect(constrained.candidates).toEqual([{ wajenziId: "WJZ-PRD-AAAAAAAAAAAAAA", reason: "Approved cement candidate: Similar product name", confidence: 0.74 }]);
  });

  it("identifies non-verified and expired commercial evidence gaps", () => {
    const gaps = buildEvidenceGaps([{ wajenziId: "WJZ-OFR-AAAAAAAAAAAAAA", commercialName: "Supplier cement offer", latestPrice: { verificationStatus: "pending", evidenceId: 8 }, latestAvailability: { verificationStatus: "verified", evidenceId: 9, freshnessUntil: new Date("2026-01-01T00:00:00.000Z"), availabilityState: "available" } }], new Date("2026-08-27T00:00:00.000Z"));
    expect(gaps).toEqual([{ offerWajenziId: "WJZ-OFR-AAAAAAAAAAAAAA", severity: "high", issue: "Latest price is pending; it is not eligible for verified comparison." }, { offerWajenziId: "WJZ-OFR-AAAAAAAAAAAAAA", severity: "high", issue: "Latest availability freshness has expired." }]);
  });

  it("rejects unstructured or incomplete model output rather than applying it", () => {
    expect(() => parseAgentContent("not JSON")).toThrow("not valid JSON");
    expect(() => parseAgentContent(JSON.stringify({ intent: "Incomplete" }))).toThrow("did not meet the governed output contract");
    expect(parseAgentContent(JSON.stringify({ ...validAnalysis, candidates: validAnalysis.candidates.slice(0, 1) })).overallConfidence).toBe(0.72);
  });
});
