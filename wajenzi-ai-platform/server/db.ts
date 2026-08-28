import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { canonicalProductMatches, canonicalProductRegistry, catalogImports, documentProcessingJobs, erpSyncConnections, erpSyncRuns, fileRecords, InsertCatalogImport, InsertFileRecord, InsertProductCatalogItem, InsertRoleWorkItem, InsertSemanticProductRecord, InsertSemanticSourceDocument, InsertUser, InsertWorkflowAction, organizations, productCatalogItems, projectMemberships, projects, roleWorkItems, semanticProductRecords, semanticSourceDocuments, supplierDocumentLineage, supplierPriceObservations, supplierProductEvents, supplierProducts, supplierStockObservations, supplierVerificationDecisions, supplierVerificationPolicies, supplierProfiles, users, workflowActions, workspaceMemberships } from "../drizzle/schema";
import { ENV } from "./_core/env";

let database: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!database && process.env.DATABASE_URL) {
    try { database = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); database = null; }
  }
  return database;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod"] as const).forEach((field) => { if (user[field] !== undefined) { values[field] = user[field]; updateSet[field] = user[field]; } });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function createFileRecord(record: InsertFileRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for file metadata storage");
  await db.insert(fileRecords).values(record);
}

export async function listFilesForUser(ownerUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fileRecords).where(eq(fileRecords.ownerUserId, ownerUserId)).orderBy(desc(fileRecords.createdAt));
}

export async function listOrganizationMembershipsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ membership: workspaceMemberships, organization: organizations }).from(workspaceMemberships).innerJoin(organizations, eq(workspaceMemberships.organizationId, organizations.id)).where(and(eq(workspaceMemberships.userId, userId), eq(workspaceMemberships.status, "active"), eq(organizations.status, "active"))).orderBy(asc(organizations.name));
}

export async function createOrganizationForOwner(values: { userId: number; name: string; kind: "homeowner" | "contractor" | "supplier" | "logistics" | "finance" | "platform"; permissions?: Record<string, boolean> | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for organization creation");
  const inserted = await db.insert(organizations).values({ name: values.name, kind: values.kind, status: "active" });
  const result = (inserted as unknown as Array<{ insertId?: number }>)[0];
  const organizationId = Number(result?.insertId);
  if (!Number.isInteger(organizationId) || organizationId <= 0) throw new Error("The organization could not be created.");
  await db.insert(workspaceMemberships).values({ userId: values.userId, organizationId, workspaceRole: "owner", permissions: values.permissions ?? { "organization.manage": true, "project.manage": true, "member.manage": true }, status: "active" });
  return organizationId;
}

export async function getOrganizationMembership(userId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(workspaceMemberships).where(and(eq(workspaceMemberships.userId, userId), eq(workspaceMemberships.organizationId, organizationId), eq(workspaceMemberships.status, "active"))).limit(1))[0];
}

export function membershipAllows(membership: { workspaceRole: string; permissions: unknown } | undefined, permission: "organization.manage" | "project.manage" | "member.manage" | "supplier.verify" | "erp.manage") {
  if (!membership) return false;
  const permissions = membership.permissions as Record<string, boolean> | null;
  if (permissions?.[permission] === true) return true;
  return ["owner", "platform_admin"].includes(membership.workspaceRole) || (permission === "project.manage" && membership.workspaceRole === "project_manager");
}

export async function listProjectMembershipsForUser(userId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(projectMemberships.userId, userId), eq(projectMemberships.status, "active")];
  if (organizationId) conditions.push(eq(projectMemberships.organizationId, organizationId));
  return db.select({ membership: projectMemberships, project: projects }).from(projectMemberships).innerJoin(projects, eq(projectMemberships.projectId, projects.id)).where(and(...conditions)).orderBy(desc(projects.updatedAt));
}

export async function getActiveProjectMembership(userId: number, projectId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [eq(projectMemberships.userId, userId), eq(projectMemberships.projectId, projectId), eq(projectMemberships.status, "active")];
  if (organizationId) conditions.push(eq(projectMemberships.organizationId, organizationId));
  return (await db.select().from(projectMemberships).where(and(...conditions)).limit(1))[0];
}

export async function createProjectForMember(values: { userId: number; organizationId: number; name: string; location?: string | null; budgetKes?: number; projectRole?: "project_owner" | "project_manager" | "architect" | "engineer" | "quantity_surveyor" | "contractor" | "buyer" | "supplier_viewer" | "finance_reviewer" | "logistics_coordinator" }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for project creation");
  const membership = await getOrganizationMembership(values.userId, values.organizationId);
  if (!membershipAllows(membership, "project.manage")) throw new Error("Your organization membership cannot create projects.");
  const inserted = await db.insert(projects).values({ organizationId: values.organizationId, name: values.name, location: values.location ?? null, budgetKes: values.budgetKes ?? 0, status: "planning" });
  const result = (inserted as unknown as Array<{ insertId?: number }>)[0];
  const projectId = Number(result?.insertId);
  if (!Number.isInteger(projectId) || projectId <= 0) throw new Error("The project could not be created.");
  await db.insert(projectMemberships).values({ projectId, userId: values.userId, organizationId: values.organizationId, projectRole: values.projectRole ?? "project_owner", permissions: { "project.manage": true, "procurement.create": true, "documents.review": true }, status: "active" });
  return projectId;
}

export async function getSupplierVerificationPolicy(organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(supplierVerificationPolicies).where(eq(supplierVerificationPolicies.organizationId, organizationId)).limit(1))[0];
}

export async function upsertSupplierVerificationPolicy(values: { organizationId: number; minimumScore: number; requiredEvidence: string[]; enabled: boolean; createdByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for verification policy storage");
  await db.insert(supplierVerificationPolicies).values({ ...values, requiredEvidence: values.requiredEvidence }).onDuplicateKeyUpdate({ set: { minimumScore: values.minimumScore, requiredEvidence: values.requiredEvidence, enabled: values.enabled, createdByUserId: values.createdByUserId } });
}

export async function getSupplierProfileForOrganization(supplierProfileId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(supplierProfiles).where(and(eq(supplierProfiles.id, supplierProfileId), eq(supplierProfiles.organizationId, organizationId))).limit(1))[0];
}

export async function upsertSupplierVerificationDecision(values: { supplierProfileId: number; organizationId: number; decision: "submitted" | "verified" | "rejected" | "needs_evidence"; evidence: Record<string, string>; rationale?: string; decidedByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for verification decision storage");
  const decidedAt = values.decision === "submitted" || values.decision === "needs_evidence" ? null : new Date();
  await db.insert(supplierVerificationDecisions).values({ ...values, evidence: values.evidence, rationale: values.rationale ?? null, decidedAt }).onDuplicateKeyUpdate({ set: { decision: values.decision, evidence: values.evidence, rationale: values.rationale ?? null, decidedByUserId: values.decidedByUserId, decidedAt } });
  if (values.decision === "verified" || values.decision === "rejected" || values.decision === "submitted") await db.update(supplierProfiles).set({ verificationStatus: values.decision === "submitted" ? "submitted" : values.decision }).where(eq(supplierProfiles.id, values.supplierProfileId));
}

export async function listErpSyncConnections(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(erpSyncConnections).where(eq(erpSyncConnections.organizationId, organizationId)).orderBy(desc(erpSyncConnections.updatedAt));
}

export async function configureErpSyncConnection(values: { organizationId: number; provider: string; direction: "outbound" | "inbound" | "bidirectional"; resourceMapping: Record<string, string>; createdByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for ERP boundary configuration");
  await db.insert(erpSyncConnections).values({ ...values, status: "not_configured", resourceMapping: values.resourceMapping }).onDuplicateKeyUpdate({ set: { direction: values.direction, resourceMapping: values.resourceMapping, status: "not_configured", lastError: null, createdByUserId: values.createdByUserId } });
}

export async function listErpSyncRuns(connectionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(erpSyncRuns).where(eq(erpSyncRuns.connectionId, connectionId)).orderBy(desc(erpSyncRuns.createdAt));
}

export async function createWorkflowAction(action: InsertWorkflowAction) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for workflow action storage");
  await db.insert(workflowActions).values(action);
}

export async function listWorkflowActions(ownerUserId: number, workspace: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflowActions).where(eq(workflowActions.ownerUserId, ownerUserId)).orderBy(desc(workflowActions.updatedAt));
}

export async function createRoleWorkItem(item: InsertRoleWorkItem) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for role work item storage");
  const result = await db.insert(roleWorkItems).values(item);
  const insertResult = (result as unknown as Array<{ insertId?: number }>)[0];
  const id = Number(insertResult?.insertId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("The role work item could not be created");
  return id;
}

export async function listRoleWorkItems(ownerUserId: number, workspace: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(roleWorkItems).where(and(eq(roleWorkItems.ownerUserId, ownerUserId), eq(roleWorkItems.workspace, workspace))).orderBy(desc(roleWorkItems.updatedAt));
}

export async function updateRoleWorkItemStatus(id: number, ownerUserId: number, status: "draft" | "in_progress" | "review" | "approved" | "completed" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for role work item updates");
  await db.update(roleWorkItems).set({ status }).where(and(eq(roleWorkItems.id, id), eq(roleWorkItems.ownerUserId, ownerUserId)));
}

export async function createSemanticSourceDocument(document: InsertSemanticSourceDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for semantic source storage");
  const result = await db.insert(semanticSourceDocuments).values(document);
  const insertResult = (result as unknown as Array<{ insertId?: number }>)[0];
  const id = Number(insertResult?.insertId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("The supplier source document could not be created");
  return id;
}

export async function getSemanticSourceByChecksum(ownerUserId: number, workspace: "supplier" | "manufacturer", checksumSha256: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(semanticSourceDocuments).where(and(eq(semanticSourceDocuments.ownerUserId, ownerUserId), eq(semanticSourceDocuments.workspace, workspace), eq(semanticSourceDocuments.checksumSha256, checksumSha256))).limit(1))[0];
}

export async function getLatestSemanticSourceBySupplierKey(ownerUserId: number, workspace: "supplier" | "manufacturer", supplierSourceKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(semanticSourceDocuments).where(and(eq(semanticSourceDocuments.ownerUserId, ownerUserId), eq(semanticSourceDocuments.workspace, workspace), eq(semanticSourceDocuments.supplierSourceKey, supplierSourceKey))).orderBy(desc(semanticSourceDocuments.versionNumber), desc(semanticSourceDocuments.createdAt)).limit(1))[0];
}

export async function assignSemanticCanonicalDocumentId(id: number, ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for document identity assignment");
  const canonicalDocumentId = `WJ-DOC-${String(id).padStart(8, "0")}`;
  await db.update(semanticSourceDocuments).set({ canonicalDocumentId }).where(and(eq(semanticSourceDocuments.id, id), eq(semanticSourceDocuments.ownerUserId, ownerUserId)));
  return canonicalDocumentId;
}

export async function createDocumentProcessingJob(values: { sourceDocumentId: number; ownerUserId: number; correlationId: string; jobType: "extraction" | "canonical_matching" | "projection"; status?: "queued" | "processing" | "completed" | "completed_with_review" | "failed"; attemptCount?: number; errorSummary?: string | null; startedAt?: Date | null; completedAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for processing jobs");
  const result = await db.insert(documentProcessingJobs).values({ ...values, status: values.status ?? "queued", attemptCount: values.attemptCount ?? 0 });
  const insertResult = (result as unknown as Array<{ insertId?: number }>)[0];
  const id = Number(insertResult?.insertId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("The processing job could not be created");
  return id;
}

export async function updateDocumentProcessingJob(id: number, ownerUserId: number, values: { status: "queued" | "processing" | "completed" | "completed_with_review" | "failed"; attemptCount?: number; errorSummary?: string | null; startedAt?: Date | null; completedAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for processing jobs");
  await db.update(documentProcessingJobs).set(values).where(and(eq(documentProcessingJobs.id, id), eq(documentProcessingJobs.ownerUserId, ownerUserId)));
}

export async function getLatestDocumentProcessingJob(sourceDocumentId: number, ownerUserId: number, jobType: "extraction" | "canonical_matching" | "projection") {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(documentProcessingJobs).where(and(eq(documentProcessingJobs.sourceDocumentId, sourceDocumentId), eq(documentProcessingJobs.ownerUserId, ownerUserId), eq(documentProcessingJobs.jobType, jobType))).orderBy(desc(documentProcessingJobs.createdAt)).limit(1))[0];
}

export async function createSupplierDocumentLineage(values: { sourceDocumentId: number; parentSourceDocumentId: number | null; ownerUserId: number; versionNumber: number; changeSummary: Record<string, unknown> | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for supplier document lineage");
  await db.insert(supplierDocumentLineage).values(values).onDuplicateKeyUpdate({ set: { parentSourceDocumentId: values.parentSourceDocumentId, versionNumber: values.versionNumber, changeSummary: values.changeSummary } });
}

export async function createSupplierProductEvent(values: { eventType: string; entityType: string; entityId: string; ownerUserId: number; actorUserId: number | null; sourceDocumentId: number | null; correlationId: string | null; previousState: Record<string, unknown> | null; nextState: Record<string, unknown> | null; evidence: Record<string, unknown> | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for supplier pipeline events");
  await db.insert(supplierProductEvents).values(values);
}

export async function getSemanticSourceDocument(id: number, ownerUserId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(semanticSourceDocuments).where(and(eq(semanticSourceDocuments.id, id), eq(semanticSourceDocuments.ownerUserId, ownerUserId))).limit(1))[0];
}

export async function listSemanticSourceDocuments(ownerUserId: number, workspace: "supplier" | "manufacturer") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(semanticSourceDocuments).where(and(eq(semanticSourceDocuments.ownerUserId, ownerUserId), eq(semanticSourceDocuments.workspace, workspace))).orderBy(desc(semanticSourceDocuments.updatedAt));
}

export async function updateSemanticSourceDocument(id: number, ownerUserId: number, values: Partial<Pick<InsertSemanticSourceDocument, "documentType" | "status" | "rawText" | "documentContext" | "errorSummary">>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for semantic source updates");
  await db.update(semanticSourceDocuments).set(values).where(and(eq(semanticSourceDocuments.id, id), eq(semanticSourceDocuments.ownerUserId, ownerUserId)));
}

export async function replaceSemanticProductRecords(sourceDocumentId: number, ownerUserId: number, records: InsertSemanticProductRecord[]) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for semantic product storage");
  await db.delete(semanticProductRecords).where(and(eq(semanticProductRecords.sourceDocumentId, sourceDocumentId), eq(semanticProductRecords.ownerUserId, ownerUserId)));
  if (records.length) await db.insert(semanticProductRecords).values(records);
}

export async function listSemanticProductRecords(sourceDocumentId: number, ownerUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(semanticProductRecords).where(and(eq(semanticProductRecords.sourceDocumentId, sourceDocumentId), eq(semanticProductRecords.ownerUserId, ownerUserId))).orderBy(asc(semanticProductRecords.id));
}

export async function getSemanticProductRecord(id: number, ownerUserId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(semanticProductRecords).where(and(eq(semanticProductRecords.id, id), eq(semanticProductRecords.ownerUserId, ownerUserId))).limit(1))[0];
}

export async function getCatalogItemBySupplierSku(supplierId: number, sku: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(productCatalogItems).where(and(eq(productCatalogItems.supplierId, supplierId), eq(productCatalogItems.sku, sku))).limit(1))[0];
}

export async function updateSemanticProductPublication(id: number, ownerUserId: number, values: { marketplaceProductId: number | null; marketplaceStatus: "not_published" | "published" | "unpublished"; marketplacePublishedAt: Date | null; marketplacePublishedByUserId: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for marketplace publication updates");
  await db.update(semanticProductRecords).set(values).where(and(eq(semanticProductRecords.id, id), eq(semanticProductRecords.ownerUserId, ownerUserId)));
}

export async function upsertCanonicalRegistryProduct(product: { canonicalEntityId: string; sourceRowId: string; sku: string; title: string; category: string; brand: string | null; productFamily: string | null; unitOfMeasure: string | null; packSize: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for canonical registry storage");
  const lastSyncedAt = new Date();
  await db.insert(canonicalProductRegistry).values({ canonicalEntityId: product.canonicalEntityId, sourceRowId: product.sourceRowId, sourceSku: product.sku || null, canonicalName: product.title, category: product.category || null, brand: product.brand, productFamily: product.productFamily, unitOfMeasure: product.unitOfMeasure, packSize: product.packSize, sourceSystem: "wajenzi-master-catalogue-v1", sourceVersion: "github-main", lastSyncedAt }).onDuplicateKeyUpdate({ set: { sourceSku: product.sku || null, canonicalName: product.title, category: product.category || null, brand: product.brand, productFamily: product.productFamily, unitOfMeasure: product.unitOfMeasure, packSize: product.packSize, sourceVersion: "github-main", lastSyncedAt } });
  return (await db.select().from(canonicalProductRegistry).where(eq(canonicalProductRegistry.canonicalEntityId, product.canonicalEntityId)).limit(1))[0];
}

export async function upsertCanonicalProductMatch(values: { semanticProductId: number; ownerUserId: number; canonicalProductId: number | null; canonicalEntityId: string | null; status: "matched_existing" | "review_required" | "new_canonical_candidate" | "rejected"; matchMethod: "exact_canonical_id" | "exact_sku" | "exact_title" | "normalized_title" | "candidate" | "manual" | "unmatched"; matchScore: number; decisionStatus: "pending" | "auto_accepted" | "approved" | "rejected" | "needs_data"; matchReason: string; matchEvidence: Record<string, string | number | boolean> }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for canonical match storage");
  await db.insert(canonicalProductMatches).values(values).onDuplicateKeyUpdate({ set: { canonicalProductId: values.canonicalProductId, canonicalEntityId: values.canonicalEntityId, status: values.status, matchMethod: values.matchMethod, matchScore: values.matchScore, decisionStatus: values.decisionStatus, matchReason: values.matchReason, matchEvidence: values.matchEvidence, reviewedByUserId: null, reviewedAt: null } });
  return (await db.select().from(canonicalProductMatches).where(and(eq(canonicalProductMatches.semanticProductId, values.semanticProductId), eq(canonicalProductMatches.ownerUserId, values.ownerUserId))).limit(1))[0];
}

export async function getCanonicalProductMatch(semanticProductId: number, ownerUserId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(canonicalProductMatches).where(and(eq(canonicalProductMatches.semanticProductId, semanticProductId), eq(canonicalProductMatches.ownerUserId, ownerUserId))).limit(1))[0];
}

export async function getCanonicalProductMatchById(id: number, ownerUserId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(canonicalProductMatches).where(and(eq(canonicalProductMatches.id, id), eq(canonicalProductMatches.ownerUserId, ownerUserId))).limit(1))[0];
}

export async function listCanonicalProductMatches(sourceDocumentId: number, ownerUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ match: canonicalProductMatches, semanticProduct: semanticProductRecords }).from(canonicalProductMatches).innerJoin(semanticProductRecords, eq(canonicalProductMatches.semanticProductId, semanticProductRecords.id)).where(and(eq(canonicalProductMatches.ownerUserId, ownerUserId), eq(semanticProductRecords.sourceDocumentId, sourceDocumentId))).orderBy(asc(canonicalProductMatches.updatedAt));
}

export async function decideCanonicalProductMatch(id: number, ownerUserId: number, decisionStatus: "approved" | "rejected" | "needs_data", reviewedByUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for canonical match decisions");
  await db.update(canonicalProductMatches).set({ decisionStatus, status: decisionStatus === "approved" ? "matched_existing" : decisionStatus === "rejected" ? "rejected" : "review_required", reviewedByUserId, reviewedAt: new Date() }).where(and(eq(canonicalProductMatches.id, id), eq(canonicalProductMatches.ownerUserId, ownerUserId)));
}

export async function getSupplierProductBySemanticProduct(semanticProductId: number, ownerUserId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(supplierProducts).where(and(eq(supplierProducts.semanticProductId, semanticProductId), eq(supplierProducts.ownerUserId, ownerUserId))).limit(1))[0];
}

export async function getSupplierProductByCanonicalSupplierSku(ownerUserId: number, canonicalProductId: number, supplierSku: string | null) {
  const db = await getDb();
  if (!db || !supplierSku) return undefined;
  return (await db.select().from(supplierProducts).where(and(eq(supplierProducts.ownerUserId, ownerUserId), eq(supplierProducts.canonicalProductId, canonicalProductId), eq(supplierProducts.supplierSku, supplierSku))).limit(1))[0];
}

export async function activateSupplierProductFromMatch(semanticProductId: number, ownerUserId: number, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for supplier POS updates");
  const [semanticProduct, match] = await Promise.all([getSemanticProductRecord(semanticProductId, ownerUserId), getCanonicalProductMatch(semanticProductId, ownerUserId)]);
  if (!semanticProduct) throw new Error("The supplier product record was not found.");
  if (!match?.canonicalProductId || !match.canonicalEntityId || !["auto_accepted", "approved"].includes(match.decisionStatus)) throw new Error("Approve or auto-accept a canonical match before activating Supplier POS.");
  let supplierProduct = await getSupplierProductBySemanticProduct(semanticProductId, ownerUserId) ?? await getSupplierProductByCanonicalSupplierSku(ownerUserId, match.canonicalProductId, semanticProduct.supplierSku);
  if (!supplierProduct) {
    await db.insert(supplierProducts).values({ supplierProductCode: `WJ-SP-${String(semanticProductId).padStart(8, "0")}`, ownerUserId, semanticProductId, sourceDocumentId: semanticProduct.sourceDocumentId, canonicalProductId: match.canonicalProductId, canonicalEntityId: match.canonicalEntityId, canonicalMatchId: match.id, supplierSku: semanticProduct.supplierSku, supplierProductName: semanticProduct.supplierProductName, normalizedProductName: semanticProduct.normalizedProductName, packagingUnit: semanticProduct.packagingUnit, marketplaceProductId: semanticProduct.marketplaceProductId, status: "active", approvedByUserId: actorUserId, approvedAt: new Date() });
    supplierProduct = await getSupplierProductBySemanticProduct(semanticProductId, ownerUserId);
  } else {
    await db.update(supplierProducts).set({ semanticProductId, sourceDocumentId: semanticProduct.sourceDocumentId, canonicalMatchId: match.id, supplierProductName: semanticProduct.supplierProductName, normalizedProductName: semanticProduct.normalizedProductName, packagingUnit: semanticProduct.packagingUnit, status: "active", marketplaceProductId: semanticProduct.marketplaceProductId ?? supplierProduct.marketplaceProductId, approvedByUserId: actorUserId, approvedAt: new Date() }).where(eq(supplierProducts.id, supplierProduct.id));
    supplierProduct = await getSupplierProductBySemanticProduct(semanticProductId, ownerUserId);
  }
  if (!supplierProduct) throw new Error("The supplier POS record could not be resolved.");
  if (semanticProduct.priceKes !== null) {
    const latest = (await db.select().from(supplierPriceObservations).where(eq(supplierPriceObservations.supplierProductId, supplierProduct.id)).orderBy(desc(supplierPriceObservations.observedAt)).limit(1))[0];
    if (!latest || latest.amountKes !== semanticProduct.priceKes) await db.insert(supplierPriceObservations).values({ supplierProductId: supplierProduct.id, ownerUserId, semanticProductId, sourceDocumentId: semanticProduct.sourceDocumentId, amountKes: semanticProduct.priceKes, sourceReference: semanticProduct.sourceReference });
  }
  if (semanticProduct.stockQuantity !== null) {
    const latest = (await db.select().from(supplierStockObservations).where(eq(supplierStockObservations.supplierProductId, supplierProduct.id)).orderBy(desc(supplierStockObservations.observedAt)).limit(1))[0];
    if (!latest || latest.availableQuantity !== semanticProduct.stockQuantity) await db.insert(supplierStockObservations).values({ supplierProductId: supplierProduct.id, ownerUserId, semanticProductId, sourceDocumentId: semanticProduct.sourceDocumentId, availableQuantity: semanticProduct.stockQuantity, sourceReference: semanticProduct.sourceReference });
  }
  await db.insert(supplierProductEvents).values({ eventType: "SUPPLIER_PRODUCT_ACTIVATED", entityType: "supplier_product", entityId: supplierProduct.supplierProductCode, ownerUserId, actorUserId, sourceDocumentId: semanticProduct.sourceDocumentId, correlationId: `semantic-${semanticProduct.sourceDocumentId}`, previousState: { status: supplierProduct.status }, nextState: { status: "active", canonicalEntityId: supplierProduct.canonicalEntityId }, evidence: { semanticProductId, canonicalMatchId: match.id } });
  return supplierProduct;
}

export async function listSupplierPosProducts(ownerUserId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ supplierProduct: supplierProducts, canonical: canonicalProductRegistry, semanticProduct: semanticProductRecords }).from(supplierProducts).innerJoin(canonicalProductRegistry, eq(supplierProducts.canonicalProductId, canonicalProductRegistry.id)).innerJoin(semanticProductRecords, eq(supplierProducts.semanticProductId, semanticProductRecords.id)).where(eq(supplierProducts.ownerUserId, ownerUserId)).orderBy(desc(supplierProducts.updatedAt));
  return Promise.all(rows.map(async (row) => ({ ...row, latestPrice: (await db.select().from(supplierPriceObservations).where(eq(supplierPriceObservations.supplierProductId, row.supplierProduct.id)).orderBy(desc(supplierPriceObservations.observedAt)).limit(1))[0] ?? null, latestStock: (await db.select().from(supplierStockObservations).where(eq(supplierStockObservations.supplierProductId, row.supplierProduct.id)).orderBy(desc(supplierStockObservations.observedAt)).limit(1))[0] ?? null })));
}

export async function listMasterPosProducts(search?: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ supplierProduct: supplierProducts, canonical: canonicalProductRegistry, catalog: productCatalogItems }).from(supplierProducts).innerJoin(canonicalProductRegistry, eq(supplierProducts.canonicalProductId, canonicalProductRegistry.id)).innerJoin(productCatalogItems, eq(supplierProducts.marketplaceProductId, productCatalogItems.id)).where(and(eq(supplierProducts.status, "active"), eq(productCatalogItems.status, "active"))).orderBy(asc(canonicalProductRegistry.canonicalName));
  const needle = search?.trim().toLowerCase();
  const grouped = new Map<number, { canonicalEntityId: string; canonicalName: string; category: string | null; brand: string | null; unitOfMeasure: string | null; packSize: string | null; offers: Array<{ supplierProductCode: string; supplierName: string | null; priceKes: number; stockQuantity: number; sku: string; marketplaceProductId: number }> }>();
  for (const row of rows) {
    const haystack = [row.canonical.canonicalEntityId, row.canonical.canonicalName, row.canonical.category ?? "", row.canonical.brand ?? "", row.catalog.supplierName].join(" ").toLowerCase();
    if (needle && !haystack.includes(needle)) continue;
    const current = grouped.get(row.canonical.id) ?? { canonicalEntityId: row.canonical.canonicalEntityId, canonicalName: row.canonical.canonicalName, category: row.canonical.category, brand: row.canonical.brand, unitOfMeasure: row.canonical.unitOfMeasure, packSize: row.canonical.packSize, offers: [] };
    const latestPrice = (await db.select().from(supplierPriceObservations).where(eq(supplierPriceObservations.supplierProductId, row.supplierProduct.id)).orderBy(desc(supplierPriceObservations.observedAt)).limit(1))[0];
    const latestStock = (await db.select().from(supplierStockObservations).where(eq(supplierStockObservations.supplierProductId, row.supplierProduct.id)).orderBy(desc(supplierStockObservations.observedAt)).limit(1))[0];
    current.offers.push({ supplierProductCode: row.supplierProduct.supplierProductCode, supplierName: row.catalog.supplierName, priceKes: latestPrice?.amountKes ?? row.catalog.priceKes, stockQuantity: latestStock?.availableQuantity ?? row.catalog.availableQuantity, sku: row.catalog.sku, marketplaceProductId: row.catalog.id });
    grouped.set(row.canonical.id, current);
  }
  return Array.from(grouped.values()).map((record) => ({ ...record, offers: record.offers.sort((left, right) => left.priceKes - right.priceKes), lowestPriceKes: Math.min(...record.offers.map((offer) => offer.priceKes)), availableStock: record.offers.reduce((sum, offer) => sum + Math.max(offer.stockQuantity, 0), 0) }));
}

export async function updateSupplierProductMarketplaceLink(semanticProductId: number, ownerUserId: number, marketplaceProductId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for Supplier POS marketplace linkage");
  await db.update(supplierProducts).set({ marketplaceProductId }).where(and(eq(supplierProducts.semanticProductId, semanticProductId), eq(supplierProducts.ownerUserId, ownerUserId)));
}

export async function createCatalogImport(record: InsertCatalogImport) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for catalog imports");
  const result = await db.insert(catalogImports).values(record);
  const insertResult = (result as unknown as Array<{ insertId?: number }>)[0];
  const id = Number(insertResult?.insertId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("The catalog import record could not be created");
  return id;
}

export async function finishCatalogImport(id: number, values: Pick<InsertCatalogImport, "status" | "totalRows" | "importedRows" | "skippedRows" | "errorSummary">) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for catalog imports");
  await db.update(catalogImports).set({ ...values, completedAt: new Date() }).where(eq(catalogImports.id, id));
}

export async function upsertCatalogItems(items: InsertProductCatalogItem[]) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for catalog items");
  for (let offset = 0; offset < items.length; offset += 200) {
    await db.insert(productCatalogItems).values(items.slice(offset, offset + 200)).onDuplicateKeyUpdate({
      set: {
        title: sql`values(${productCatalogItems.title})`,
        category: sql`values(${productCatalogItems.category})`,
        priceKes: sql`values(${productCatalogItems.priceKes})`,
        salePriceKes: sql`values(${productCatalogItems.salePriceKes})`,
        availableQuantity: sql`values(${productCatalogItems.availableQuantity})`,
        supplierName: sql`values(${productCatalogItems.supplierName})`,
        description: sql`values(${productCatalogItems.description})`,
        imageUrl: sql`values(${productCatalogItems.imageUrl})`,
        externalUrl: sql`values(${productCatalogItems.externalUrl})`,
        buttonText: sql`values(${productCatalogItems.buttonText})`,
        importRecordId: sql`values(${productCatalogItems.importRecordId})`,
        attributes: sql`values(${productCatalogItems.attributes})`,
        status: sql`values(${productCatalogItems.status})`,
      },
    });
  }
}

export async function listMarketplaceProducts(filters: { search?: string; category?: string; sort?: "featured" | "price_asc" | "price_desc" | "name_asc"; page?: number; pageSize?: number }) {
  const db = await getDb();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(60, Math.max(12, filters.pageSize ?? 48));
  if (!db) return { items: [], total: 0, page, pageSize, hasMore: false };
  const constraints = [inArray(productCatalogItems.status, ["active", "out_of_stock"])];
  if (filters.category?.trim()) constraints.push(eq(productCatalogItems.category, filters.category.trim()));
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    constraints.push(or(like(productCatalogItems.title, term), like(productCatalogItems.sku, term), like(productCatalogItems.category, term), like(productCatalogItems.supplierName, term))!);
  }
  const effectivePrice = sql<number>`coalesce(${productCatalogItems.salePriceKes}, ${productCatalogItems.priceKes})`;
  const sort = filters.sort ?? "featured";
  const order = sort === "price_asc" ? asc(effectivePrice) : sort === "price_desc" ? desc(effectivePrice) : sort === "name_asc" ? asc(productCatalogItems.title) : desc(productCatalogItems.updatedAt);
  const where = and(...constraints);
  const [items, totalResult] = await Promise.all([
    db.select({ id: productCatalogItems.id, sku: productCatalogItems.sku, title: productCatalogItems.title, category: productCatalogItems.category, priceKes: productCatalogItems.priceKes, salePriceKes: productCatalogItems.salePriceKes, availableQuantity: productCatalogItems.availableQuantity, supplierName: productCatalogItems.supplierName, description: productCatalogItems.description, imageUrl: productCatalogItems.imageUrl, externalUrl: productCatalogItems.externalUrl, buttonText: productCatalogItems.buttonText, status: productCatalogItems.status }).from(productCatalogItems).where(where).orderBy(order).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: sql<number>`count(*)` }).from(productCatalogItems).where(where),
  ]);
  const total = Number(totalResult[0]?.total ?? 0);
  return { items, total, page, pageSize, hasMore: page * pageSize < total };
}

export async function listMarketplaceCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.selectDistinct({ category: productCatalogItems.category }).from(productCatalogItems).where(inArray(productCatalogItems.status, ["active", "out_of_stock"])).orderBy(asc(productCatalogItems.category));
}

export async function listRecentCatalogImports() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: catalogImports.id, originalName: catalogImports.originalName, status: catalogImports.status, totalRows: catalogImports.totalRows, importedRows: catalogImports.importedRows, skippedRows: catalogImports.skippedRows, errorSummary: catalogImports.errorSummary, createdAt: catalogImports.createdAt, completedAt: catalogImports.completedAt }).from(catalogImports).orderBy(desc(catalogImports.createdAt)).limit(8);
}

export async function listCatalogItemsForAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: productCatalogItems.id, sku: productCatalogItems.sku, title: productCatalogItems.title, category: productCatalogItems.category, supplierName: productCatalogItems.supplierName, priceKes: productCatalogItems.priceKes, salePriceKes: productCatalogItems.salePriceKes, availableQuantity: productCatalogItems.availableQuantity, status: productCatalogItems.status, updatedAt: productCatalogItems.updatedAt }).from(productCatalogItems).orderBy(desc(productCatalogItems.updatedAt)).limit(80);
}

export async function setCatalogItemStatus(id: number, status: "active" | "draft" | "out_of_stock") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for catalog updates");
  await db.update(productCatalogItems).set({ status }).where(eq(productCatalogItems.id, id));
}
