import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM, listLLMModels } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { activateSupplierProductFromMatch, configureErpSyncConnection, createCatalogImport, createDocumentProcessingJob, createFileRecord, createOrganizationForOwner, createProjectForMember, createRoleWorkItem, createSupplierProductEvent, createWorkflowAction, decideCanonicalProductMatch, finishCatalogImport, getActiveProjectMembership, getCanonicalProductMatch, getCanonicalProductMatchById, getCatalogItemBySupplierSku, getLatestDocumentProcessingJob, getOrganizationMembership, getSemanticProductRecord, getSemanticSourceDocument, getSupplierProductBySemanticProduct, getSupplierProfileForOrganization, getSupplierVerificationPolicy, listCanonicalProductMatches, listCatalogItemsForAdmin, listErpSyncConnections, listErpSyncRuns, listFilesForUser, listMarketplaceCategories, listMarketplaceProducts, listMasterPosProducts, listOrganizationMembershipsForUser, listProjectMembershipsForUser, listRecentCatalogImports, listRoleWorkItems, listSemanticProductRecords, listSemanticSourceDocuments, listSupplierPosProducts, listWorkflowActions, membershipAllows, replaceSemanticProductRecords, setCatalogItemStatus, updateDocumentProcessingJob, updateRoleWorkItemStatus, updateSemanticProductPublication, updateSemanticSourceDocument, updateSupplierProductMarketplaceLink, upsertCanonicalProductMatch, upsertCanonicalRegistryProduct, upsertCatalogItems, upsertSupplierVerificationDecision, upsertSupplierVerificationPolicy } from "./db";
import { parseWooCommerceCsv } from "./catalog";
import { getWorkspaceSnapshot, workspaceSlugs } from "./marketplaceData";
import { storagePut } from "./storage";
import { getGitHubCanonicalCatalogue, getGitHubCanonicalProductIndex } from "./githubCanonicalCatalogue";
import { parseSemanticDocument, semanticWorkspaces, toWooCommerceCsv } from "./semanticExtraction";
import { storageGetSignedUrl } from "./storage";
import { matchCanonicalProduct } from "./canonicalMatching";
import { marketOperationsRouter } from "./marketOperationsRouter";

const uploadInput = z.object({
  originalName: z.string().min(1).max(255),
  contentType: z.string().min(3).max(160),
  base64: z.string().min(1),
  purpose: z.enum(["supplier_catalog", "boq", "drawing", "compliance", "delivery_proof"]),
  accessScope: z.enum(["owner", "organization", "platform_review"]).default("owner"),
  organizationId: z.number().int().positive().optional(),
});

const agentHistory = z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(3000) })).max(8);
const catalogFilters = z.object({ search: z.string().trim().max(120).optional(), category: z.string().trim().max(100).optional(), brand: z.string().trim().max(120).optional(), supplier: z.string().trim().max(180).optional(), location: z.string().trim().max(180).optional(), minPriceKes: z.number().int().nonnegative().optional(), maxPriceKes: z.number().int().nonnegative().optional(), minLeadTimeDays: z.number().int().nonnegative().max(365).optional(), maxLeadTimeDays: z.number().int().nonnegative().max(365).optional(), verification: z.enum(["verified", "review"]).optional(), inStockOnly: z.boolean().optional(), sort: z.enum(["featured", "price_asc", "price_desc", "name_asc"]).optional(), page: z.number().int().min(1).default(1), pageSize: z.number().int().min(12).max(60).default(48) });
const catalogImportInput = z.object({ originalName: z.string().min(1).max(255), contentType: z.string().min(3).max(160), base64: z.string().min(1), supplierId: z.number().int().nonnegative().default(0) });
const roleWorkItemInput = z.object({ workspace: z.enum(workspaceSlugs), workType: z.enum(["project", "boq", "procurement", "document", "approval", "delivery", "finance", "registry", "task"]), title: z.string().trim().min(2).max(220), description: z.string().trim().max(2000).optional(), status: z.enum(["draft", "in_progress", "review", "approved", "completed", "cancelled"]).default("draft"), organizationId: z.number().int().positive().optional(), projectId: z.number().int().positive().optional(), context: z.record(z.string(), z.string()).optional() });
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Catalog imports are restricted to platform administrators." });
  return next();
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  context: router({
    organizations: protectedProcedure.query(({ ctx }) => listOrganizationMembershipsForUser(ctx.user.id)),
    createOrganization: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(180), kind: z.enum(["homeowner", "contractor", "supplier", "logistics", "finance", "platform"]) })).mutation(async ({ ctx, input }) => {
      const organizationId = await createOrganizationForOwner({ userId: ctx.user.id, ...input });
      return { organizationId };
    }),
    projects: protectedProcedure.input(z.object({ organizationId: z.number().int().positive().optional() })).query(({ ctx, input }) => listProjectMembershipsForUser(ctx.user.id, input.organizationId)),
    createProject: protectedProcedure.input(z.object({ organizationId: z.number().int().positive(), name: z.string().trim().min(2).max(200), location: z.string().trim().max(255).optional(), budgetKes: z.number().int().min(0).max(2_000_000_000).optional() })).mutation(async ({ ctx, input }) => {
      const projectId = await createProjectForMember({ userId: ctx.user.id, ...input });
      return { projectId };
    }),
  }),
  governance: router({
    supplierVerificationPolicy: protectedProcedure.input(z.object({ organizationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const membership = await getOrganizationMembership(ctx.user.id, input.organizationId);
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "You are not an active member of this organization." });
      return getSupplierVerificationPolicy(input.organizationId);
    }),
    configureSupplierVerificationPolicy: protectedProcedure.input(z.object({ organizationId: z.number().int().positive(), minimumScore: z.number().int().min(0).max(100), requiredEvidence: z.array(z.string().trim().min(1).max(120)).max(20), enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
      const membership = await getOrganizationMembership(ctx.user.id, input.organizationId);
      if (!membershipAllows(membership, "supplier.verify")) throw new TRPCError({ code: "FORBIDDEN", message: "Your organization membership cannot configure supplier verification." });
      await upsertSupplierVerificationPolicy({ ...input, createdByUserId: ctx.user.id });
      return { success: true } as const;
    }),
    decideSupplierVerification: protectedProcedure.input(z.object({ organizationId: z.number().int().positive(), supplierProfileId: z.number().int().positive(), decision: z.enum(["submitted", "verified", "rejected", "needs_evidence"]), evidence: z.record(z.string().min(1).max(120), z.string().max(500)).default({}), rationale: z.string().trim().max(1500).optional(), confirmed: z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
      const membership = await getOrganizationMembership(ctx.user.id, input.organizationId);
      if (!membershipAllows(membership, "supplier.verify")) throw new TRPCError({ code: "FORBIDDEN", message: "Your organization membership cannot decide supplier verification." });
      if (["verified", "rejected"].includes(input.decision) && !input.confirmed) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Confirm the verification decision before it is recorded." });
      const profile = await getSupplierProfileForOrganization(input.supplierProfileId, input.organizationId);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Supplier profile was not found in this organization." });
      const policy = await getSupplierVerificationPolicy(input.organizationId);
      if (input.decision === "verified") {
        if (!policy?.enabled) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Enable and configure a supplier verification policy before verifying a supplier." });
        if (profile.score < policy.minimumScore) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The supplier score does not meet this organization's configured verification threshold." });
        const requiredEvidence = (policy.requiredEvidence as string[] | null) ?? [];
        const missingEvidence = requiredEvidence.filter((key) => !input.evidence[key]?.trim());
        if (missingEvidence.length) throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Missing required verification evidence: ${missingEvidence.join(", ")}.` });
      }
      await upsertSupplierVerificationDecision({ ...input, evidence: input.evidence, decidedByUserId: ctx.user.id });
      return { success: true, decision: input.decision } as const;
    }),
    erpConnections: protectedProcedure.input(z.object({ organizationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const membership = await getOrganizationMembership(ctx.user.id, input.organizationId);
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "You are not an active member of this organization." });
      return listErpSyncConnections(input.organizationId);
    }),
    configureErpConnection: protectedProcedure.input(z.object({ organizationId: z.number().int().positive(), provider: z.string().trim().min(2).max(100), direction: z.enum(["outbound", "inbound", "bidirectional"]), resourceMapping: z.record(z.string().min(1).max(80), z.string().min(1).max(120)).refine((mapping) => Object.keys(mapping).length <= 20, "A maximum of 20 ERP resource mappings is allowed.") })).mutation(async ({ ctx, input }) => {
      const membership = await getOrganizationMembership(ctx.user.id, input.organizationId);
      if (!membershipAllows(membership, "erp.manage")) throw new TRPCError({ code: "FORBIDDEN", message: "Your organization membership cannot configure ERP synchronization." });
      await configureErpSyncConnection({ ...input, createdByUserId: ctx.user.id });
      return { success: true, outboundCallsEnabled: false } as const;
    }),
    erpRuns: protectedProcedure.input(z.object({ organizationId: z.number().int().positive(), connectionId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const membership = await getOrganizationMembership(ctx.user.id, input.organizationId);
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "You are not an active member of this organization." });
      const connections = await listErpSyncConnections(input.organizationId);
      if (!connections.some((connection) => connection.id === input.connectionId)) throw new TRPCError({ code: "NOT_FOUND", message: "ERP connection was not found in this organization." });
      return listErpSyncRuns(input.connectionId);
    }),
  }),
  marketplace: router({
    dashboard: publicProcedure.input(z.object({ workspace: z.enum(workspaceSlugs) })).query(({ input }) => getWorkspaceSnapshot(input.workspace)),
  }),
  catalog: router({
    list: publicProcedure.input(catalogFilters).query(({ input }) => listMarketplaceProducts(input)),
    categories: publicProcedure.query(() => listMarketplaceCategories()),
    canonicalGithub: publicProcedure.input(z.object({ search: z.string().trim().max(120).optional(), limit: z.number().int().min(1).max(8).default(4) })).query(({ input }) => getGitHubCanonicalCatalogue(input)),
    masterPos: publicProcedure.input(z.object({ search: z.string().trim().max(120).optional() })).query(({ input }) => listMasterPosProducts(input.search)),
    recentImports: adminProcedure.query(() => listRecentCatalogImports()),
    adminList: adminProcedure.query(() => listCatalogItemsForAdmin()),
    setStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["active", "draft", "out_of_stock"]) })).mutation(async ({ input }) => {
      await setCatalogItemStatus(input.id, input.status);
      return { success: true } as const;
    }),
    importCsv: adminProcedure.input(catalogImportInput).mutation(async ({ ctx, input }) => {
      if (!input.originalName.toLowerCase().endsWith(".csv")) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a CSV file exported from WooCommerce or your supplier catalog." });
      const bytes = Buffer.from(input.base64, "base64");
      if (bytes.byteLength > 12 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "CSV files must be 12 MB or smaller." });
      const parsed = parseWooCommerceCsv(bytes.toString("utf8"));
      const safeName = input.originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const { key, url } = await storagePut(`wajenzi/${ctx.user.id}/supplier_catalog/${Date.now()}-${safeName}`, bytes, input.contentType || "text/csv");
      await createFileRecord({ ownerUserId: ctx.user.id, organizationId: null, originalName: input.originalName, storageKey: key, storageUrl: url, contentType: input.contentType || "text/csv", byteSize: bytes.byteLength, purpose: "supplier_catalog", accessScope: "platform_review" });
      const importId = await createCatalogImport({ ownerUserId: ctx.user.id, supplierId: input.supplierId, originalName: input.originalName, storageKey: key, storageUrl: url, status: "processing", totalRows: parsed.totalRows, importedRows: 0, skippedRows: parsed.skippedRows, errorSummary: null });
      try {
        await upsertCatalogItems(parsed.products.map((product) => ({ ...product, supplierId: input.supplierId, importRecordId: importId })));
        const status = parsed.skippedRows || parsed.errors.length ? "completed_with_warnings" : "completed";
        const errorSummary = parsed.errors.length ? parsed.errors.join(" ") : null;
        await finishCatalogImport(importId, { status, totalRows: parsed.totalRows, importedRows: parsed.products.length, skippedRows: parsed.skippedRows, errorSummary });
        return { importId, importedRows: parsed.products.length, skippedRows: parsed.skippedRows, warnings: parsed.errors };
      } catch (error) {
        await finishCatalogImport(importId, { status: "failed", totalRows: parsed.totalRows, importedRows: 0, skippedRows: parsed.totalRows, errorSummary: error instanceof Error ? error.message : "Import failed." });
        throw error;
      }
    }),
  }),
  documents: router({
    listMine: protectedProcedure.query(({ ctx }) => listFilesForUser(ctx.user.id)),
    upload: protectedProcedure.input(uploadInput).mutation(async ({ ctx, input }) => {
      const bytes = Buffer.from(input.base64, "base64");
      if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("Files must be 10 MB or smaller.");
      const safeName = input.originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const { key, url } = await storagePut(`wajenzi/${ctx.user.id}/${input.purpose}/${safeName}`, bytes, input.contentType);
      await createFileRecord({ ownerUserId: ctx.user.id, organizationId: input.organizationId ?? null, originalName: input.originalName, storageKey: key, storageUrl: url, contentType: input.contentType, byteSize: bytes.byteLength, purpose: input.purpose, accessScope: input.accessScope });
      return { key, url, originalName: input.originalName, byteSize: bytes.byteLength };
    }),
  }),
  workflow: router({
    list: protectedProcedure.input(z.object({ workspace: z.enum(workspaceSlugs) })).query(async ({ ctx, input }) => {
      const actions = await listWorkflowActions(ctx.user.id, input.workspace);
      return actions.filter((action) => action.workspace === input.workspace);
    }),
    record: protectedProcedure.input(z.object({
      workspace: z.enum(workspaceSlugs),
      actionType: z.string().min(2).max(100),
      resourceRef: z.string().min(2).max(120),
      status: z.enum(["pending", "completed", "review"]).default("pending"),
      payload: z.record(z.string(), z.string()).optional(),
    })).mutation(async ({ ctx, input }) => {
      await createWorkflowAction({ ownerUserId: ctx.user.id, workspace: input.workspace, actionType: input.actionType, resourceRef: input.resourceRef, status: input.status, payload: input.payload ?? null });
      return { success: true } as const;
    }),
  }),
  roleWork: router({
    list: protectedProcedure.input(z.object({ workspace: z.enum(workspaceSlugs) })).query(({ ctx, input }) => listRoleWorkItems(ctx.user.id, input.workspace)),
    create: protectedProcedure.input(roleWorkItemInput).mutation(async ({ ctx, input }) => {
      if (input.projectId && !input.organizationId) throw new TRPCError({ code: "BAD_REQUEST", message: "Select an organization before attaching a project work item." });
      if (input.organizationId && !await getOrganizationMembership(ctx.user.id, input.organizationId)) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have an active membership in the selected organization." });
      if (input.projectId && !await getActiveProjectMembership(ctx.user.id, input.projectId, input.organizationId)) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have an active role in the selected project." });
      const id = await createRoleWorkItem({ ownerUserId: ctx.user.id, organizationId: input.organizationId ?? null, projectId: input.projectId ?? null, workspace: input.workspace, workType: input.workType, title: input.title, description: input.description ?? null, status: input.status, context: input.context ?? null });
      return { id };
    }),
    updateStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["draft", "in_progress", "review", "approved", "completed", "cancelled"]) })).mutation(async ({ ctx, input }) => {
      await updateRoleWorkItemStatus(input.id, ctx.user.id, input.status);
      return { success: true } as const;
    }),
  }),
  semantic: router({
    listSources: protectedProcedure.input(z.object({ workspace: z.enum(semanticWorkspaces) })).query(({ ctx, input }) => listSemanticSourceDocuments(ctx.user.id, input.workspace)),
    listProducts: protectedProcedure.input(z.object({ sourceDocumentId: z.number().int().positive() })).query(({ ctx, input }) => listSemanticProductRecords(input.sourceDocumentId, ctx.user.id)),
    extract: protectedProcedure.input(z.object({ sourceDocumentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const source = await getSemanticSourceDocument(input.sourceDocumentId, ctx.user.id);
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "The supplier source document was not found." });
      let job = await getLatestDocumentProcessingJob(source.id, ctx.user.id, "extraction");
      if (!job || ["completed", "completed_with_review"].includes(job.status)) {
        const correlationId = `extract-${source.id}-${Date.now()}`;
        const jobId = await createDocumentProcessingJob({ sourceDocumentId: source.id, ownerUserId: ctx.user.id, correlationId, jobType: "extraction", status: "queued" });
        job = { id: jobId, correlationId, attemptCount: 0 } as typeof job;
      }
      if (!job) throw new Error("The extraction processing job could not be initialized.");
      await updateDocumentProcessingJob(job.id, ctx.user.id, { status: "processing", attemptCount: (job.attemptCount ?? 0) + 1, startedAt: new Date(), errorSummary: null });
      await createSupplierProductEvent({ eventType: "EXTRACTION_STARTED", entityType: "source_document", entityId: source.canonicalDocumentId || `source-${source.id}`, ownerUserId: ctx.user.id, actorUserId: ctx.user.id, sourceDocumentId: source.id, correlationId: job.correlationId, previousState: { status: source.status }, nextState: { status: "processing" }, evidence: null });
      await updateSemanticSourceDocument(source.id, ctx.user.id, { status: "processing", errorSummary: null });
      try {
        const downloadUrl = await storageGetSignedUrl(source.storageKey);
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error("The stored source document could not be retrieved.");
        const parsed = await parseSemanticDocument(source.originalName, source.contentType, Buffer.from(await response.arrayBuffer()));
        await replaceSemanticProductRecords(source.id, ctx.user.id, parsed.products.map((product) => ({ sourceDocumentId: source.id, ownerUserId: ctx.user.id, ...product })));
        const needsReview = parsed.products.some((product) => product.status === "needs_review");
        await updateSemanticSourceDocument(source.id, ctx.user.id, { documentType: parsed.documentType, status: needsReview ? "completed_with_review" : "completed", rawText: parsed.rawText, documentContext: { supplierName: parsed.supplierName ?? "", currency: parsed.currency ?? "", headings: parsed.headings.join(" | "), productSections: parsed.productSections.join(" | ") }, errorSummary: null });
        await updateDocumentProcessingJob(job.id, ctx.user.id, { status: needsReview ? "completed_with_review" : "completed", completedAt: new Date(), errorSummary: null });
        await createSupplierProductEvent({ eventType: "EXTRACTION_COMPLETED", entityType: "source_document", entityId: source.canonicalDocumentId || `source-${source.id}`, ownerUserId: ctx.user.id, actorUserId: ctx.user.id, sourceDocumentId: source.id, correlationId: job.correlationId, previousState: { status: "processing" }, nextState: { status: needsReview ? "completed_with_review" : "completed" }, evidence: { documentType: parsed.documentType, extractedProducts: parsed.products.length, needsReview } });
        return { sourceDocumentId: source.id, extractedProducts: parsed.products.length, needsReview };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Supplier document extraction failed.";
        await updateSemanticSourceDocument(source.id, ctx.user.id, { status: "failed", errorSummary: message });
        await updateDocumentProcessingJob(job.id, ctx.user.id, { status: "failed", completedAt: new Date(), errorSummary: message });
        await createSupplierProductEvent({ eventType: "EXTRACTION_FAILED", entityType: "source_document", entityId: source.canonicalDocumentId || `source-${source.id}`, ownerUserId: ctx.user.id, actorUserId: ctx.user.id, sourceDocumentId: source.id, correlationId: job.correlationId, previousState: { status: "processing" }, nextState: { status: "failed" }, evidence: { error: message } });
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),
    reclassify: protectedProcedure.input(z.object({ sourceDocumentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const source = await getSemanticSourceDocument(input.sourceDocumentId, ctx.user.id);
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "The supplier source document was not found." });
      if (!source.rawText) throw new TRPCError({ code: "BAD_REQUEST", message: "Extract the document before requesting reclassification." });
      const parsed = await parseSemanticDocument(`${source.originalName.replace(/\.[^.]+$/, "")}.txt`, "text/plain", Buffer.from(source.rawText, "utf8"));
      await replaceSemanticProductRecords(source.id, ctx.user.id, parsed.products.map((product) => ({ sourceDocumentId: source.id, ownerUserId: ctx.user.id, ...product })));
      const needsReview = parsed.products.some((product) => product.status === "needs_review");
      await updateSemanticSourceDocument(source.id, ctx.user.id, { status: needsReview ? "completed_with_review" : "completed", documentContext: { supplierName: parsed.supplierName ?? "", currency: parsed.currency ?? "", headings: parsed.headings.join(" | "), productSections: parsed.productSections.join(" | ") }, errorSummary: null });
      return { sourceDocumentId: source.id, extractedProducts: parsed.products.length, needsReview };
    }),
    matchCanonical: protectedProcedure.input(z.object({ sourceDocumentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const source = await getSemanticSourceDocument(input.sourceDocumentId, ctx.user.id);
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "The supplier source document was not found." });
      const products = await listSemanticProductRecords(source.id, ctx.user.id);
      if (!products.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Extract at least one product before canonical matching." });
      const catalogue = await getGitHubCanonicalProductIndex();
      const correlationId = `match-${source.id}-${Date.now()}`;
      const jobId = await createDocumentProcessingJob({ sourceDocumentId: source.id, ownerUserId: ctx.user.id, correlationId, jobType: "canonical_matching", status: "processing", attemptCount: 1, startedAt: new Date() });
      const results = await Promise.all(products.map(async (product) => {
        const candidate = matchCanonicalProduct(product, catalogue);
        const canonical = candidate.canonical ? await upsertCanonicalRegistryProduct(candidate.canonical) : null;
        return upsertCanonicalProductMatch({ semanticProductId: product.id, ownerUserId: ctx.user.id, canonicalProductId: canonical?.id ?? null, canonicalEntityId: canonical?.canonicalEntityId ?? null, status: candidate.status, matchMethod: candidate.method, matchScore: candidate.score, decisionStatus: candidate.decisionStatus, matchReason: candidate.reason, matchEvidence: candidate.evidence });
      }));
      const autoAccepted = results.filter((result) => result?.decisionStatus === "auto_accepted").length;
      const reviewRequired = results.filter((result) => result?.decisionStatus !== "auto_accepted").length;
      await updateDocumentProcessingJob(jobId, ctx.user.id, { status: reviewRequired ? "completed_with_review" : "completed", completedAt: new Date(), errorSummary: null });
      await createSupplierProductEvent({ eventType: "PRODUCT_MATCHING_COMPLETED", entityType: "source_document", entityId: source.canonicalDocumentId || `source-${source.id}`, ownerUserId: ctx.user.id, actorUserId: ctx.user.id, sourceDocumentId: source.id, correlationId, previousState: null, nextState: { autoAccepted, reviewRequired }, evidence: { processed: results.length, canonicalCatalogueRecords: catalogue.length } });
      return { sourceDocumentId: source.id, processed: results.length, autoAccepted, reviewRequired };
    }),
    listCanonicalMatches: protectedProcedure.input(z.object({ sourceDocumentId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const source = await getSemanticSourceDocument(input.sourceDocumentId, ctx.user.id);
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "The supplier source document was not found." });
      return listCanonicalProductMatches(source.id, ctx.user.id);
    }),
    decideCanonicalMatch: protectedProcedure.input(z.object({ matchId: z.number().int().positive(), decision: z.enum(["approved", "rejected", "needs_data"]) })).mutation(async ({ ctx, input }) => {
      const match = await getCanonicalProductMatchById(input.matchId, ctx.user.id);
      if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "The canonical match decision was not found." });
      if (input.decision === "approved" && !match.canonicalProductId) throw new TRPCError({ code: "BAD_REQUEST", message: "An unmatched candidate cannot be approved as a canonical product. Request a steward review instead." });
      await decideCanonicalProductMatch(match.id, ctx.user.id, input.decision, ctx.user.id);
      await createSupplierProductEvent({ eventType: input.decision === "approved" ? "PRODUCT_MATCH_APPROVED" : input.decision === "rejected" ? "PRODUCT_MATCH_REJECTED" : "PRODUCT_REVIEW_REQUIRED", entityType: "canonical_match", entityId: String(match.id), ownerUserId: ctx.user.id, actorUserId: ctx.user.id, sourceDocumentId: null, correlationId: null, previousState: { decisionStatus: match.decisionStatus }, nextState: { decisionStatus: input.decision, canonicalEntityId: match.canonicalEntityId }, evidence: { canonicalProductId: match.canonicalProductId } });
      return { success: true } as const;
    }),
    activateSupplierPos: protectedProcedure.input(z.object({ semanticProductId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const supplierProduct = await activateSupplierProductFromMatch(input.semanticProductId, ctx.user.id, ctx.user.id);
      return { supplierProductId: supplierProduct.id, supplierProductCode: supplierProduct.supplierProductCode, status: supplierProduct.status };
    }),
    listSupplierPos: protectedProcedure.query(async ({ ctx }) => listSupplierPosProducts(ctx.user.id)),
    exportWooCommerce: protectedProcedure.input(z.object({ sourceDocumentId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const source = await getSemanticSourceDocument(input.sourceDocumentId, ctx.user.id);
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "The supplier source document was not found." });
      const products = await listSemanticProductRecords(source.id, ctx.user.id);
      if (!products.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Extract at least one product before exporting." });
      const documentContext = (source.documentContext ?? {}) as { supplierName?: string };
      const csv = toWooCommerceCsv(products.map((product) => ({ ...product, sourceDocumentName: source.originalName, supplierName: documentContext.supplierName || null })));
      return { filename: `${source.originalName.replace(/\.[^.]+$/, "")}-woocommerce.csv`, csv };
    }),
    publishReviewedProduct: protectedProcedure.input(z.object({ semanticProductId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const product = await getSemanticProductRecord(input.semanticProductId, ctx.user.id);
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "The reviewed product was not found." });
      if (product.status !== "ready" || product.priceKes === null || !product.category) throw new TRPCError({ code: "BAD_REQUEST", message: "Only ready products with verified price and category data can be published." });
      const canonicalMatch = await getCanonicalProductMatch(product.id, ctx.user.id);
      if (!canonicalMatch?.canonicalEntityId || !["auto_accepted", "approved"].includes(canonicalMatch.decisionStatus)) throw new TRPCError({ code: "BAD_REQUEST", message: "Resolve and approve the canonical registry match before marketplace publication." });
      const supplierProduct = await getSupplierProductBySemanticProduct(product.id, ctx.user.id);
      if (!supplierProduct || supplierProduct.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Activate this approved product in Supplier POS before marketplace publication." });
      const source = await getSemanticSourceDocument(product.sourceDocumentId, ctx.user.id);
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "The source evidence for this product was not found." });
      const documentContext = (source.documentContext ?? {}) as { supplierName?: string };
      const supplierId = ctx.user.id;
      const sku = product.supplierSku?.trim() || `WZ-SEM-${product.id}`;
      const verifiedDescription = [product.brand, product.productType, product.sizeValue && product.sizeUnit ? `${product.sizeValue} ${product.sizeUnit}` : null, product.colour, product.weightValue && product.weightUnit ? `${product.weightValue} ${product.weightUnit}` : null].filter((value): value is string => Boolean(value)).join(" · ") || null;
      await upsertCatalogItems([{ supplierId, sku, title: product.normalizedProductName, category: product.category, priceKes: product.priceKes, salePriceKes: null, availableQuantity: product.stockQuantity ?? 0, supplierName: documentContext.supplierName || ctx.user.name || "Verified supplier", description: verifiedDescription, imageUrl: null, externalUrl: null, buttonText: "View product", importRecordId: null, attributes: { sourceDocumentId: source.id, sourceDocument: source.originalName, sourceReference: product.sourceReference, supplierProductName: product.supplierProductName, normalizedProductName: product.normalizedProductName, semanticProductId: product.id, supplierProductCode: supplierProduct.supplierProductCode, canonicalEntityId: canonicalMatch.canonicalEntityId, canonicalMatchId: canonicalMatch.id, canonicalMatchMethod: canonicalMatch.matchMethod, canonicalMatchScore: canonicalMatch.matchScore, canonicalDecision: canonicalMatch.decisionStatus, extractionConfidence: product.extractionConfidence, classificationConfidence: product.classificationConfidence, readiness: product.status, classification: product.classification }, status: "active" }]);
      const catalogProduct = await getCatalogItemBySupplierSku(supplierId, sku);
      if (!catalogProduct) throw new Error("The marketplace record could not be resolved after publishing.");
      await updateSemanticProductPublication(product.id, ctx.user.id, { marketplaceProductId: catalogProduct.id, marketplaceStatus: "published", marketplacePublishedAt: new Date(), marketplacePublishedByUserId: ctx.user.id });
      await updateSupplierProductMarketplaceLink(product.id, ctx.user.id, catalogProduct.id);
      await createSupplierProductEvent({ eventType: "SUPPLIER_POS_PUBLISHED", entityType: "supplier_product", entityId: supplierProduct.supplierProductCode, ownerUserId: ctx.user.id, actorUserId: ctx.user.id, sourceDocumentId: source.id, correlationId: `semantic-${source.id}`, previousState: { marketplaceStatus: product.marketplaceStatus }, nextState: { marketplaceStatus: "published", marketplaceProductId: catalogProduct.id }, evidence: { canonicalEntityId: canonicalMatch.canonicalEntityId, canonicalMatchId: canonicalMatch.id, semanticProductId: product.id } });
      return { marketplaceProductId: catalogProduct.id, status: "published" as const };
    }),
    unpublishReviewedProduct: protectedProcedure.input(z.object({ semanticProductId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const product = await getSemanticProductRecord(input.semanticProductId, ctx.user.id);
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "The reviewed product was not found." });
      if (!product.marketplaceProductId) throw new TRPCError({ code: "BAD_REQUEST", message: "This reviewed product is not currently linked to the marketplace." });
      await setCatalogItemStatus(product.marketplaceProductId, "draft");
      await updateSemanticProductPublication(product.id, ctx.user.id, { marketplaceProductId: product.marketplaceProductId, marketplaceStatus: "unpublished", marketplacePublishedAt: product.marketplacePublishedAt, marketplacePublishedByUserId: product.marketplacePublishedByUserId });
      const supplierProduct = await getSupplierProductBySemanticProduct(product.id, ctx.user.id);
      if (supplierProduct) await createSupplierProductEvent({ eventType: "SUPPLIER_POS_UNPUBLISHED", entityType: "supplier_product", entityId: supplierProduct.supplierProductCode, ownerUserId: ctx.user.id, actorUserId: ctx.user.id, sourceDocumentId: product.sourceDocumentId, correlationId: `semantic-${product.sourceDocumentId}`, previousState: { marketplaceStatus: product.marketplaceStatus, marketplaceProductId: product.marketplaceProductId }, nextState: { marketplaceStatus: "unpublished", marketplaceProductId: product.marketplaceProductId }, evidence: { semanticProductId: product.id } });
      return { marketplaceProductId: product.marketplaceProductId, status: "unpublished" as const };
    }),
  }),
  marketOperations: marketOperationsRouter,
  ai: router({
    procure: protectedProcedure.input(z.object({ message: z.string().min(2).max(5000), projectContext: z.string().max(3000).optional(), history: agentHistory.default([]) })).mutation(async ({ input }) => {
      const { data } = await listLLMModels();
      const model = data.find((candidate) => candidate.id === "gpt-5-mini")?.id ?? data[0]?.id;
      if (!model) throw new Error("No AI model is currently available.");
      const masterPos = await listMasterPosProducts(input.message);
      const inventoryContext = masterPos.slice(0, 5).map((product) => `${product.canonicalEntityId} | ${product.canonicalName} | lowest approved offer: KES ${product.lowestPriceKes.toLocaleString()} | available stock: ${product.availableStock} | supplier offers: ${product.offers.length}`).join("\n") || "No approved canonical Master POS offers matched this request.";
      const response = await invokeLLM({
        model,
        messages: [
          { role: "system", content: "You are the Wajenzi.AI Procurement Agent for Kenyan construction projects. Give concise, practical construction-procurement decision support. State assumptions, identify missing specifications, compare suitable options, and propose a reviewable next action. Never present an estimate as a live supplier quote, engineering approval, legal advice, payment approval, or a final bill of quantities. Ask users to have quantities, structural requirements, and compliance decisions reviewed by qualified professionals. Use the supplied canonical Master POS context as the only source for any statement about approved marketplace inventory. When you cite inventory, include its WJ-PROD identifier. Do not infer a product identity from an LLM-generated name, and clearly say when no approved canonical offer is available. Format with short headings and bullet points when useful." },
          ...input.history.slice(-6).map((item) => ({ role: item.role, content: item.content })),
          { role: "user", content: `Project context: ${input.projectContext?.trim() || "Not provided"}\n\nApproved canonical Master POS context:\n${inventoryContext}\n\nRequest: ${input.message}` },
        ],
      });
      const answer = response.choices[0]?.message.content;
      if (!answer || typeof answer !== "string") throw new Error("The procurement agent did not return a text response.");
      return { message: answer, model };
    }),
    generateArtifacts: protectedProcedure.input(z.object({ assistantText: z.string().min(2).max(8000), projectContext: z.string().min(2).max(4000), documentReference: z.string().max(255).optional() })).mutation(async ({ input }) => {
      const { data } = await listLLMModels();
      const model = data.find((candidate) => candidate.id === "gpt-5-mini")?.id ?? data[0]?.id;
      if (!model) throw new Error("No AI model is currently available.");
      const response = await invokeLLM({
        model,
        messages: [{ role: "system", content: "You create structured, non-binding construction procurement artifacts for Wajenzi.AI. Use only the supplied conversation and project context. Do not claim live quotes, live availability, engineering approval, or parsed document content. If a document reference is present, treat it as a reference only and state assumptions. Keep each item concise and action-oriented." }, { role: "user", content: `Project context: ${input.projectContext}\nDocument reference: ${input.documentReference || "None"}\nAgent conversation outcome: ${input.assistantText}` }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "procurement_artifacts",
            strict: true,
            schema: {
              type: "object",
              properties: {
                comparison: { type: "array", items: { type: "object", properties: { option: { type: "string" }, rationale: { type: "string" }, reviewNote: { type: "string" } }, required: ["option", "rationale", "reviewNote"], additionalProperties: false }, minItems: 2, maxItems: 3 },
                rfq: { type: "object", properties: { title: { type: "string" }, scope: { type: "string" }, requirements: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 } }, required: ["title", "scope", "requirements"], additionalProperties: false },
                cart: { type: "object", properties: { summary: { type: "string" }, lineItems: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 }, reviewNote: { type: "string" } }, required: ["summary", "lineItems", "reviewNote"], additionalProperties: false },
              },
              required: ["comparison", "rfq", "cart"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = response.choices[0]?.message.content;
      if (!content || typeof content !== "string") throw new Error("The AI did not return structured procurement artifacts.");
      return JSON.parse(content) as { comparison: Array<{ option: string; rationale: string; reviewNote: string }>; rfq: { title: string; scope: string; requirements: string[] }; cart: { summary: string; lineItems: string[]; reviewNote: string } };
    }),
  }),
});

export type AppRouter = typeof appRouter;
