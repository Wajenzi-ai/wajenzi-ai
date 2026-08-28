import type { RoleWorkType } from "@/lib/roleWorkflow";

export type RoleWorkDetailConfig = {
  referenceLabel: string;
  referencePlaceholder: string;
  detailLabel: string;
  detailPlaceholder: string;
};

const detailConfigs: Record<RoleWorkType, RoleWorkDetailConfig> = {
  project: { referenceLabel: "Project package or milestone", referencePlaceholder: "e.g. Structural frame milestone", detailLabel: "Owner and readiness conditions", detailPlaceholder: "Name the responsible role, dependency, due date, or decision required" },
  boq: { referenceLabel: "BOQ package or valuation reference", referencePlaceholder: "e.g. Concrete works · valuation 03", detailLabel: "Quantity, rate, or variation basis", detailPlaceholder: "State the drawing/BOQ reference, rate assumption, quantity, and reviewer" },
  procurement: { referenceLabel: "Procurement or supplier reference", referencePlaceholder: "e.g. RFQ-2408-042 · cement package", detailLabel: "Specification and next decision", detailPlaceholder: "State the materials, quantities, preferred supplier, and review deadline" },
  document: { referenceLabel: "Document or drawing revision", referencePlaceholder: "e.g. ARC-A-104 Rev C", detailLabel: "Distribution and review notes", detailPlaceholder: "State issue purpose, recipients, dependencies, and required response" },
  approval: { referenceLabel: "Approval or decision reference", referencePlaceholder: "e.g. PR-024 · roofing package", detailLabel: "Decision basis and approver", detailPlaceholder: "Summarise evidence, cost/scope impact, approval owner, and due date" },
  delivery: { referenceLabel: "Delivery or handoff reference", referencePlaceholder: "e.g. DEL-2408-019 · Westlands site", detailLabel: "Site-readiness and proof requirements", detailPlaceholder: "State delivery window, receiver, offloading readiness, proof, and exception plan" },
  finance: { referenceLabel: "Funding, settlement, or risk reference", referencePlaceholder: "e.g. SET-024 · invoice 381", detailLabel: "Evidence and review rationale", detailPlaceholder: "State the review amount, evidence, approval route, and outstanding risk" },
  registry: { referenceLabel: "Canonical ID or product reference", referencePlaceholder: "e.g. WZ-CAT-000842", detailLabel: "Change evidence and stewardship rationale", detailPlaceholder: "State the product identity, source document, quality issue, and reviewer" },
  task: { referenceLabel: "Work item reference", referencePlaceholder: "e.g. Weekly design coordination", detailLabel: "Assignee and required outcome", detailPlaceholder: "State who owns the work, due date, dependencies, and expected result" },
};

export function roleWorkDetailConfig(workType: RoleWorkType) {
  return detailConfigs[workType];
}
