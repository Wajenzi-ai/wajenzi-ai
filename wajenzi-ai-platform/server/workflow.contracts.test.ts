import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const databaseMocks = vi.hoisted(() => ({
  createWorkflowAction: vi.fn(),
  listOrganizationMembershipsForUser: vi.fn(),
  createOrganizationForOwner: vi.fn(),
  listProjectMembershipsForUser: vi.fn(),
  createProjectForMember: vi.fn(),
  getOrganizationMembership: vi.fn(),
  getActiveProjectMembership: vi.fn(),
  membershipAllows: vi.fn(),
  getSupplierVerificationPolicy: vi.fn(),
  upsertSupplierVerificationPolicy: vi.fn(),
  getSupplierProfileForOrganization: vi.fn(),
  upsertSupplierVerificationDecision: vi.fn(),
  listErpSyncConnections: vi.fn(),
  configureErpSyncConnection: vi.fn(),
  listErpSyncRuns: vi.fn(),
  createDocumentProcessingJob: vi.fn(),
  updateDocumentProcessingJob: vi.fn(),
  getLatestDocumentProcessingJob: vi.fn(),
  createSupplierProductEvent: vi.fn(),
  listWorkflowActions: vi.fn(),
  createRoleWorkItem: vi.fn(),
  listRoleWorkItems: vi.fn(),
  updateRoleWorkItemStatus: vi.fn(),
  listSemanticSourceDocuments: vi.fn(),
  listSemanticProductRecords: vi.fn(),
  listMasterPosProducts: vi.fn(),
  getSemanticSourceDocument: vi.fn(),
  updateSemanticSourceDocument: vi.fn(),
  replaceSemanticProductRecords: vi.fn(),
  getSemanticProductRecord: vi.fn(),
  getCatalogItemBySupplierSku: vi.fn(),
  updateSemanticProductPublication: vi.fn(),
  updateSupplierProductMarketplaceLink: vi.fn(),
  upsertCanonicalRegistryProduct: vi.fn(),
  upsertCanonicalProductMatch: vi.fn(),
  listCanonicalProductMatches: vi.fn(),
  getCanonicalProductMatch: vi.fn(),
  getCanonicalProductMatchById: vi.fn(),
  decideCanonicalProductMatch: vi.fn(),
  activateSupplierProductFromMatch: vi.fn(),
  getSupplierProductBySemanticProduct: vi.fn(),
  listSupplierPosProducts: vi.fn(),
  upsertCatalogItems: vi.fn(),
  setCatalogItemStatus: vi.fn(),
  createFileRecord: vi.fn(),
  listFilesForUser: vi.fn(),
}));
const storageMocks = vi.hoisted(() => ({ storagePut: vi.fn(), storageGetSignedUrl: vi.fn() }));
const llmMocks = vi.hoisted(() => ({ listLLMModels: vi.fn(), invokeLLM: vi.fn() }));
const canonicalGithubMocks = vi.hoisted(() => ({ getGitHubCanonicalCatalogue: vi.fn(), getGitHubCanonicalProductIndex: vi.fn() }));

vi.mock("./db", () => databaseMocks);
vi.mock("./storage", () => storageMocks);
vi.mock("./_core/llm", () => llmMocks);
vi.mock("./githubCanonicalCatalogue", () => canonicalGithubMocks);

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function authenticatedContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 7,
    openId: "workflow-user",
    name: "Workflow User",
    email: "workflow@example.com",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return { user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function unauthenticatedContext(): TrpcContext { return { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] }; }

describe("protected marketplace workflow contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    databaseMocks.listWorkflowActions.mockResolvedValue([
      { id: 1, ownerUserId: 7, workspace: "contractor", actionType: "rfq_sent", resourceRef: "RFQ-42", status: "completed", payload: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, ownerUserId: 7, workspace: "supplier", actionType: "order_accepted", resourceRef: "ORD-1", status: "completed", payload: null, createdAt: new Date(), updatedAt: new Date() },
    ]);
    databaseMocks.listOrganizationMembershipsForUser.mockResolvedValue([{ membership: { id: 101, userId: 7, organizationId: 44, workspaceRole: "owner", status: "active" }, organization: { id: 44, name: "Atlas Build Ltd", kind: "contractor", status: "active" } }]);
    databaseMocks.createOrganizationForOwner.mockResolvedValue(44);
    databaseMocks.listProjectMembershipsForUser.mockResolvedValue([{ membership: { id: 201, userId: 7, projectId: 61, organizationId: 44, projectRole: "project_owner", status: "active" }, project: { id: 61, organizationId: 44, name: "Nairobi Residence", status: "planning" } }]);
    databaseMocks.createProjectForMember.mockResolvedValue(61);
    databaseMocks.getOrganizationMembership.mockResolvedValue({ id: 101, userId: 7, organizationId: 44, workspaceRole: "owner", permissions: { "project.manage": true, "supplier.verify": true, "erp.manage": true }, status: "active" });
    databaseMocks.getActiveProjectMembership.mockResolvedValue({ id: 201, userId: 7, projectId: 61, organizationId: 44, projectRole: "project_owner", status: "active" });
    databaseMocks.membershipAllows.mockReturnValue(true);
    databaseMocks.getSupplierVerificationPolicy.mockResolvedValue({ organizationId: 44, minimumScore: 70, requiredEvidence: ["registration"], enabled: true });
    databaseMocks.getSupplierProfileForOrganization.mockResolvedValue({ id: 301, organizationId: 44, score: 86, verificationStatus: "submitted" });
    databaseMocks.listErpSyncConnections.mockResolvedValue([{ id: 501, organizationId: 44, provider: "custom", status: "not_configured" }]);
    databaseMocks.listErpSyncRuns.mockResolvedValue([]);
    databaseMocks.listRoleWorkItems.mockResolvedValue([{ id: 41, ownerUserId: 7, organizationId: null, projectId: null, workspace: "quantity-surveyor", workType: "boq", title: "Prepare valuation", description: "Create a reviewable payment valuation", status: "review", context: { organization: "Wajenzi Construction Ltd", project: "Mombasa Road Residence" }, createdAt: new Date(), updatedAt: new Date() }]);
    databaseMocks.createRoleWorkItem.mockResolvedValue(41);
    databaseMocks.listSemanticSourceDocuments.mockResolvedValue([{ id: 17, ownerUserId: 7, workspace: "supplier", originalName: "august-price-list.csv", status: "uploaded" }]);
    databaseMocks.listSemanticProductRecords.mockResolvedValue([]);
    databaseMocks.getSemanticSourceDocument.mockResolvedValue({ id: 17, ownerUserId: 7, workspace: "supplier", originalName: "august-price-list.csv", documentContext: { supplierName: "Atlas Hardware" } });
    databaseMocks.getSemanticProductRecord.mockResolvedValue({ id: 71, sourceDocumentId: 17, ownerUserId: 7, sourceReference: "row 2", supplierProductName: "Crown Vinyl Matt Emulsion 20L White", normalizedProductName: "Crown Vinyl Matt Emulsion", supplierSku: "CVM-20W", brand: "Crown", category: "Paint", productType: null, sizeValue: "20", sizeUnit: "L", colour: "White", weightValue: null, weightUnit: null, stockQuantity: 12, priceKes: 8450, extractionConfidence: 92, classificationConfidence: 82, status: "ready", marketplaceProductId: null, marketplaceStatus: "not_published", marketplacePublishedAt: null, marketplacePublishedByUserId: null, classification: { wajenziCode: "WZ-SEM-PAINT" } });
    databaseMocks.getCatalogItemBySupplierSku.mockResolvedValue({ id: 91, supplierId: 7, sku: "CVM-20W" });
    databaseMocks.getCanonicalProductMatch.mockResolvedValue({ id: 15, semanticProductId: 71, ownerUserId: 7, canonicalProductId: 31, canonicalEntityId: "WJ-PROD-000456", matchMethod: "exact_title", matchScore: 96, decisionStatus: "auto_accepted" });
    databaseMocks.getCanonicalProductMatchById.mockResolvedValue({ id: 15, semanticProductId: 71, ownerUserId: 7, canonicalProductId: 31, canonicalEntityId: "WJ-PROD-000456", decisionStatus: "pending" });
    databaseMocks.getSupplierProductBySemanticProduct.mockResolvedValue({ id: 51, supplierProductCode: "WJ-SP-00000071", ownerUserId: 7, semanticProductId: 71, status: "active" });
    databaseMocks.activateSupplierProductFromMatch.mockResolvedValue({ id: 51, supplierProductCode: "WJ-SP-00000071", status: "active" });
    databaseMocks.listSupplierPosProducts.mockResolvedValue([]);
    databaseMocks.createDocumentProcessingJob.mockResolvedValue(81);
    databaseMocks.getLatestDocumentProcessingJob.mockResolvedValue(undefined);
    databaseMocks.listMasterPosProducts.mockResolvedValue([{ canonicalEntityId: "WJ-PROD-000456", canonicalName: "Crown Vinyl Matt Emulsion", category: "Paint", offers: [{ supplierProductCode: "WJ-SP-00000071", supplierName: "Atlas Hardware", priceKes: 8450, stockQuantity: 12, sku: "CVM-20W", marketplaceProductId: 91 }], lowestPriceKes: 8450, availableStock: 12 }]);
    databaseMocks.upsertCanonicalRegistryProduct.mockResolvedValue({ id: 31, canonicalEntityId: "WJ-PROD-000456" });
    databaseMocks.upsertCanonicalProductMatch.mockResolvedValue({ id: 15, decisionStatus: "auto_accepted" });
    canonicalGithubMocks.getGitHubCanonicalProductIndex.mockResolvedValue([{ canonicalEntityId: "WJ-PROD-000456", sourceRowId: "catalogue-row-456", sku: "CVM-20W", title: "Crown Vinyl Matt Emulsion", category: "Paint", brand: "Crown", productFamily: "Emulsion", unitOfMeasure: "L", packSize: "20 L" }]);
    storageMocks.storagePut.mockResolvedValue({ key: "wajenzi/7/boq/brief.pdf-a1b2c3d4", url: "/manus-storage/wajenzi/7/boq/brief.pdf-a1b2c3d4" });
    llmMocks.listLLMModels.mockResolvedValue({ data: [{ id: "gpt-5-mini" }] });
    llmMocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ comparison: [{ option: "Option A", rationale: "Budget aligned", reviewNote: "Confirm quantities" }, { option: "Option B", rationale: "Faster dispatch", reviewNote: "Confirm specification" }], rfq: { title: "Concrete package RFQ", scope: "Supply structural concrete materials", requirements: ["Confirm grade", "State dispatch date"] }, cart: { summary: "Concrete materials shortlist", lineItems: ["Cement", "Reinforcement steel"], reviewNote: "Review BOQ quantities" } }) } }] });
  });

  it("stores a protected workflow action and lists only the active workspace records", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.workflow.record({ workspace: "contractor", actionType: "rfq_sent", resourceRef: "RFQ-42", status: "completed", payload: { title: "Concrete package" } })).resolves.toEqual({ success: true });
    expect(databaseMocks.createWorkflowAction).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 7, workspace: "contractor", resourceRef: "RFQ-42", status: "completed" }));
    await expect(caller.workflow.list({ workspace: "contractor" })).resolves.toHaveLength(1);
  });

  it("creates and lists formal organization and project membership context for the authenticated user", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.context.organizations()).resolves.toHaveLength(1);
    await expect(caller.context.createOrganization({ name: "Atlas Build Ltd", kind: "contractor" })).resolves.toEqual({ organizationId: 44 });
    expect(databaseMocks.createOrganizationForOwner).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, name: "Atlas Build Ltd", kind: "contractor" }));
    await expect(caller.context.projects({ organizationId: 44 })).resolves.toHaveLength(1);
    await expect(caller.context.createProject({ organizationId: 44, name: "Nairobi Residence", budgetKes: 8500000 })).resolves.toEqual({ projectId: 61 });
    expect(databaseMocks.createProjectForMember).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, organizationId: 44, name: "Nairobi Residence", budgetKes: 8500000 }));
    const anonymousCaller = appRouter.createCaller(unauthenticatedContext());
    await expect(anonymousCaller.context.organizations()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("accepts authenticated work actions from the new professional role workspaces", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.workflow.record({ workspace: "architect", actionType: "role_workflow_action", resourceRef: "architect-register-drawing", status: "completed", payload: { title: "Register drawing" } })).resolves.toEqual({ success: true });
    expect(databaseMocks.createWorkflowAction).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 7, workspace: "architect", resourceRef: "architect-register-drawing", status: "completed" }));
  });

  it("creates and advances a typed role work item through the protected review workflow", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.roleWork.create({ workspace: "quantity-surveyor", workType: "boq", title: "Prepare valuation", description: "Create a reviewable payment valuation", status: "review", context: { organization: "Wajenzi Construction Ltd", project: "Mombasa Road Residence" } })).resolves.toEqual({ id: 41 });
    expect(databaseMocks.createRoleWorkItem).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 7, workspace: "quantity-surveyor", workType: "boq", title: "Prepare valuation", status: "review" }));
    await expect(caller.roleWork.list({ workspace: "quantity-surveyor" })).resolves.toHaveLength(1);
    await expect(caller.roleWork.updateStatus({ id: 41, status: "approved" })).resolves.toEqual({ success: true });
    expect(databaseMocks.updateRoleWorkItemStatus).toHaveBeenCalledWith(41, 7, "approved");
  });

  it("permits role work only where the member is active in the selected organization and project", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.roleWork.create({ workspace: "contractor", workType: "procurement", title: "Issue steel RFQ", organizationId: 44, projectId: 61 })).resolves.toEqual({ id: 41 });
    expect(databaseMocks.getOrganizationMembership).toHaveBeenCalledWith(7, 44);
    expect(databaseMocks.getActiveProjectMembership).toHaveBeenCalledWith(7, 61, 44);
    expect(databaseMocks.createRoleWorkItem).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 7, organizationId: 44, projectId: 61 }));
  });

  it("rejects role work for an organization outside the authenticated member's active membership", async () => {
    databaseMocks.getOrganizationMembership.mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.roleWork.create({ workspace: "contractor", workType: "procurement", title: "Issue steel RFQ", organizationId: 99 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(databaseMocks.createRoleWorkItem).not.toHaveBeenCalled();
  });

  it("rejects project work when the project membership does not belong to the selected organization", async () => {
    databaseMocks.getActiveProjectMembership.mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.roleWork.create({ workspace: "contractor", workType: "procurement", title: "Issue steel RFQ", organizationId: 44, projectId: 77 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(databaseMocks.createRoleWorkItem).not.toHaveBeenCalled();
  });

  it("rejects a project-scoped work item that omits its organization", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.roleWork.create({ workspace: "contractor", workType: "procurement", title: "Issue steel RFQ", projectId: 61 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(databaseMocks.createRoleWorkItem).not.toHaveBeenCalled();
  });

  it("keeps verification policy and ERP configuration organization-scoped and confirms no ERP calls are enabled", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.governance.configureSupplierVerificationPolicy({ organizationId: 44, minimumScore: 70, requiredEvidence: ["registration"], enabled: true })).resolves.toEqual({ success: true });
    await expect(caller.governance.decideSupplierVerification({ organizationId: 44, supplierProfileId: 301, decision: "verified", evidence: { registration: "stored-reference" }, confirmed: true })).resolves.toEqual({ success: true, decision: "verified" });
    await expect(caller.governance.configureErpConnection({ organizationId: 44, provider: "custom", direction: "outbound", resourceMapping: { supplierProduct: "item" } })).resolves.toEqual({ success: true, outboundCallsEnabled: false });
    expect(databaseMocks.upsertSupplierVerificationDecision).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 44, supplierProfileId: 301, decidedByUserId: 7 }));
    expect(databaseMocks.configureErpSyncConnection).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 44, provider: "custom", createdByUserId: 7 }));
  });

  it("stores uploaded document metadata after secure storage returns a reference", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    const result = await caller.documents.upload({ originalName: "brief.pdf", contentType: "application/pdf", base64: "dGVzdA==", purpose: "boq", accessScope: "owner" });
    expect(storageMocks.storagePut).toHaveBeenCalled();
    expect(databaseMocks.createFileRecord).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 7, originalName: "brief.pdf", purpose: "boq" }));
    expect(result.url).toContain("/manus-storage/");
  });

  it("restricts semantic source access to authenticated Supplier and Manufacturer workspace inputs", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.semantic.listSources({ workspace: "supplier" })).resolves.toHaveLength(1);
    expect(databaseMocks.listSemanticSourceDocuments).toHaveBeenCalledWith(7, "supplier");
    await expect(caller.semantic.listSources({ workspace: "manufacturer" })).resolves.toHaveLength(1);
    await expect((caller.semantic.listSources as (input: unknown) => Promise<unknown>)({ workspace: "architect" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const anonymousCaller = appRouter.createCaller(unauthenticatedContext());
    await expect(anonymousCaller.semantic.listSources({ workspace: "supplier" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("publishes only ready reviewed products with retained semantic traceability and can remove visibility", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.semantic.publishReviewedProduct({ semanticProductId: 71 })).resolves.toEqual({ marketplaceProductId: 91, status: "published" });
    expect(databaseMocks.upsertCatalogItems).toHaveBeenCalledWith([expect.objectContaining({ supplierId: 7, sku: "CVM-20W", title: "Crown Vinyl Matt Emulsion", category: "Paint", priceKes: 8450, status: "active", attributes: expect.objectContaining({ semanticProductId: 71, sourceDocumentId: 17, sourceReference: "row 2", canonicalEntityId: "WJ-PROD-000456", supplierProductCode: "WJ-SP-00000071", extractionConfidence: 92, classificationConfidence: 82 }) })]);
    expect(databaseMocks.updateSemanticProductPublication).toHaveBeenCalledWith(71, 7, expect.objectContaining({ marketplaceProductId: 91, marketplaceStatus: "published", marketplacePublishedByUserId: 7 }));
    expect(databaseMocks.updateSupplierProductMarketplaceLink).toHaveBeenCalledWith(71, 7, 91);
    databaseMocks.getSemanticProductRecord.mockResolvedValueOnce({ id: 71, ownerUserId: 7, status: "needs_review", priceKes: null, category: null });
    await expect(caller.semantic.publishReviewedProduct({ semanticProductId: 71 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    databaseMocks.getSemanticProductRecord.mockResolvedValueOnce({ id: 71, ownerUserId: 7, marketplaceProductId: 91, marketplacePublishedAt: new Date(), marketplacePublishedByUserId: 7 });
    await expect(caller.semantic.unpublishReviewedProduct({ semanticProductId: 71 })).resolves.toEqual({ marketplaceProductId: 91, status: "unpublished" });
    expect(databaseMocks.setCatalogItemStatus).toHaveBeenCalledWith(91, "draft");
  });

  it("matches retained supplier products against the canonical GitHub registry and supports an explicit review decision", async () => {
    databaseMocks.listSemanticProductRecords.mockResolvedValueOnce([{ id: 71, sourceDocumentId: 17, ownerUserId: 7, normalizedProductName: "Crown Vinyl Matt Emulsion", supplierSku: "CVM-20W", brand: "Crown", category: "Paint", sizeValue: "20", sizeUnit: "L" }]);
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.semantic.matchCanonical({ sourceDocumentId: 17 })).resolves.toEqual({ sourceDocumentId: 17, processed: 1, autoAccepted: 1, reviewRequired: 0 });
    expect(databaseMocks.upsertCanonicalRegistryProduct).toHaveBeenCalledWith(expect.objectContaining({ canonicalEntityId: "WJ-PROD-000456" }));
    expect(databaseMocks.upsertCanonicalProductMatch).toHaveBeenCalledWith(expect.objectContaining({ semanticProductId: 71, canonicalProductId: 31, canonicalEntityId: "WJ-PROD-000456", decisionStatus: "auto_accepted" }));
    expect(databaseMocks.createDocumentProcessingJob).toHaveBeenCalledWith(expect.objectContaining({ sourceDocumentId: 17, ownerUserId: 7, jobType: "canonical_matching", status: "processing" }));
    expect(databaseMocks.createSupplierProductEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "PRODUCT_MATCHING_COMPLETED", sourceDocumentId: 17 }));
    await expect(caller.semantic.decideCanonicalMatch({ matchId: 15, decision: "approved" })).resolves.toEqual({ success: true });
    expect(databaseMocks.decideCanonicalProductMatch).toHaveBeenCalledWith(15, 7, "approved", 7);
  });

  it("activates an approved canonical relationship in Supplier POS before publication", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.semantic.activateSupplierPos({ semanticProductId: 71 })).resolves.toEqual({ supplierProductId: 51, supplierProductCode: "WJ-SP-00000071", status: "active" });
    expect(databaseMocks.activateSupplierProductFromMatch).toHaveBeenCalledWith(71, 7, 7);
    await expect(caller.semantic.listSupplierPos()).resolves.toEqual([]);
  });

  it("returns Master POS aggregation only through the canonical typed catalog projection", async () => {
    const caller = appRouter.createCaller(unauthenticatedContext());
    await expect(caller.catalog.masterPos({ search: "Crown" })).resolves.toEqual([expect.objectContaining({ canonicalEntityId: "WJ-PROD-000456", lowestPriceKes: 8450, availableStock: 12 })]);
    expect(databaseMocks.listMasterPosProducts).toHaveBeenCalledWith("Crown");
  });

  it("returns a validated structured procurement artifact from the AI procedure", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    const artifact = await caller.ai.generateArtifacts({ assistantText: "Recommend concrete materials with assumptions.", projectContext: "Nairobi residential project", documentReference: "brief.pdf" });
    expect(artifact.comparison).toHaveLength(2);
    expect(artifact.rfq.title).toBe("Concrete package RFQ");
    expect(artifact.cart.lineItems).toContain("Cement");
  });

  it("grounds procurement-agent inventory context in canonical Master POS results", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await caller.ai.procure({ message: "Find Crown paint", projectContext: "Nairobi renovation", history: [] });
    expect(databaseMocks.listMasterPosProducts).toHaveBeenCalledWith("Find Crown paint");
    expect(llmMocks.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ messages: expect.arrayContaining([expect.objectContaining({ role: "user", content: expect.stringContaining("WJ-PROD-000456") })]) }));
  });
});
