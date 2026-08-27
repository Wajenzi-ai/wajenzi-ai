import { and, desc, eq, like, ne } from "drizzle-orm";
import type { User } from "../drizzle/schema";
import {
  auditEvents,
  availabilityObservations,
  canonicalMatchCandidates,
  canonicalizationDecisions,
  controlledValues,
  controlledVocabularies,
  evidence,
  facilities,
  fileAssets,
  importBatches,
  organizations,
  priceObservations,
  productCategories,
  productOffers,
  products,
  projects,
  projectMemberships,
  registryEntities,
  sites,
  sourceRecords,
  supplierSubmissions,
  workspaceMembers,
  workspaces,
} from "../drizzle/schema";
import { getDb } from "./db";
import {
  canAccessWorkspace,
  createEntityWajenziId,
  createWajenziId,
  determineCanonicalOutcome,
  filterComparableOffers,
  normalizedProductKey,
  scoreProductMatch,
} from "./registryCore";
import { storagePut } from "./storage";

const DEMO_WORKSPACE_ID = "WJZ-WSP-DEMO-REGISTRY";
const MASTER_SOURCE = "wajenzi-master-catalogue-v1";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type WorkspaceContext = {
  workspace: typeof workspaces.$inferSelect;
  membership: typeof workspaceMembers.$inferSelect;
};

async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new Error("The WAJENZI registry database is unavailable.");
  return db;
}

async function first<T>(promise: Promise<T[]>): Promise<T | undefined> {
  return (await promise)[0];
}

async function ensureRegistryEntity(db: Db, input: {
  wajenziId: string;
  workspaceId: number | null;
  entityType: typeof registryEntities.$inferInsert.entityType;
  canonicalName: string;
  lifecycleStatus?: typeof registryEntities.$inferInsert.lifecycleStatus;
  sourceSystem?: string;
  sourceRecordKey?: string;
  ownerOrganizationEntityId?: number | null;
  attributes?: Record<string, unknown>;
  createdByUserId?: number;
}) {
  let entity = await first(db.select().from(registryEntities).where(eq(registryEntities.wajenziId, input.wajenziId)).limit(1));
  if (entity) return entity;
  await db.insert(registryEntities).values({
    ...input,
    workspaceId: input.workspaceId ?? null,
    lifecycleStatus: input.lifecycleStatus ?? "active",
    ownerOrganizationEntityId: input.ownerOrganizationEntityId ?? null,
    attributes: input.attributes ?? {},
  });
  entity = await first(db.select().from(registryEntities).where(eq(registryEntities.wajenziId, input.wajenziId)).limit(1));
  if (!entity) throw new Error(`Could not create registry entity ${input.wajenziId}.`);
  return entity;
}

async function ensureOrganization(db: Db, entityId: number, kind: typeof organizations.$inferInsert.organizationKind, legalName: string) {
  let organization = await first(db.select().from(organizations).where(eq(organizations.entityId, entityId)).limit(1));
  if (organization) return organization;
  await db.insert(organizations).values({ entityId, organizationKind: kind, legalName, verificationStatus: "verified", metadata: { dataClass: "demo" } });
  organization = await first(db.select().from(organizations).where(eq(organizations.entityId, entityId)).limit(1));
  if (!organization) throw new Error("Could not create organization detail.");
  return organization;
}

async function ensureAudit(db: Db, input: { workspaceId: number; actorUserId?: number; eventType: string; subjectEntityId?: number; rationale: string; relatedEntityIds?: number[] }) {
  const wajenziId = createWajenziId("EVT", `${input.workspaceId}:${input.eventType}:${input.subjectEntityId ?? "none"}`);
  const existing = await first(db.select().from(auditEvents).where(eq(auditEvents.wajenziId, wajenziId)).limit(1));
  if (existing) return existing;
  await db.insert(auditEvents).values({ ...input, wajenziId, relatedEntityIds: input.relatedEntityIds ?? [] });
  return first(db.select().from(auditEvents).where(eq(auditEvents.wajenziId, wajenziId)).limit(1));
}

async function ensureVocabulary(db: Db, code: string, name: string, values: string[]) {
  let vocabulary = await first(db.select().from(controlledVocabularies).where(eq(controlledVocabularies.code, code)).limit(1));
  if (!vocabulary) {
    await db.insert(controlledVocabularies).values({ code, name, description: `System-controlled WAJENZI vocabulary: ${name}.` });
    vocabulary = await first(db.select().from(controlledVocabularies).where(eq(controlledVocabularies.code, code)).limit(1));
  }
  if (!vocabulary) return;
  for (const label of values) {
    const valueCode = normalizedProductKey(label).replaceAll(" ", "_");
    const found = await first(db.select().from(controlledValues).where(and(eq(controlledValues.vocabularyId, vocabulary.id), eq(controlledValues.code, valueCode))).limit(1));
    if (!found) await db.insert(controlledValues).values({ vocabularyId: vocabulary.id, code: valueCode, label });
  }
}

async function ensureDemoWorkspace(db: Db, user: User) {
  let workspace = await first(db.select().from(workspaces).where(eq(workspaces.wajenziId, DEMO_WORKSPACE_ID)).limit(1));
  if (!workspace) {
    await db.insert(workspaces).values({ wajenziId: DEMO_WORKSPACE_ID, name: "WAJENZI Registry Demonstration", isDemo: true });
    workspace = await first(db.select().from(workspaces).where(eq(workspaces.wajenziId, DEMO_WORKSPACE_ID)).limit(1));
  }
  if (!workspace) throw new Error("Could not initialize the demonstration workspace.");

  let membership = await first(db.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, user.id))).limit(1));
  if (!membership) {
    await db.insert(workspaceMembers).values({ workspaceId: workspace.id, userId: user.id, workspaceRole: "registry_steward", status: "active", scope: { dataClass: "demo", accessBoundary: "workspace" } });
    membership = await first(db.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, user.id))).limit(1));
  }
  if (!membership) throw new Error("Could not establish workspace membership.");

  await ensureVocabulary(db, "unit_of_measure", "Units of measurement", ["bag", "piece", "kilogram", "litre", "metre"]);
  await ensureVocabulary(db, "supplier_type", "Supplier types", ["supplier", "manufacturer", "distributor", "contractor"]);
  await ensureVocabulary(db, "project_type", "Project types", ["residential", "commercial", "infrastructure"]);
  await ensureVocabulary(db, "verification_status", "Verification statuses", ["unverified", "pending", "verified", "expired", "rejected"]);
  await ensureVocabulary(db, "event_type", "Event types", ["IMPORT_COMPLETED", "SUBMISSION_REVIEW_REQUIRED", "OFFER_VERIFIED", "PROCUREMENT_QUERY_EXECUTED"]);

  const contractor = await ensureRegistryEntity(db, {
    wajenziId: createWajenziId("ORG", "demo:contractor"), workspaceId: workspace.id, entityType: "organization", canonicalName: "WAJENZI Demonstration Contractor", lifecycleStatus: "verified", sourceSystem: "demo-seed", sourceRecordKey: "contractor", createdByUserId: user.id, attributes: { dataClass: "demo", nonCommercial: true },
  });
  await ensureOrganization(db, contractor.id, "contractor", "WAJENZI Demonstration Contractor");
  const supplierOne = await ensureRegistryEntity(db, {
    wajenziId: createWajenziId("ORG", "demo:supplier:westlands"), workspaceId: workspace.id, entityType: "organization", canonicalName: "Example Supplier — Westlands", lifecycleStatus: "verified", sourceSystem: "demo-seed", sourceRecordKey: "supplier-westlands", createdByUserId: user.id, attributes: { dataClass: "demo", nonCommercial: true },
  });
  await ensureOrganization(db, supplierOne.id, "supplier", "Example Supplier — Westlands");
  const supplierTwo = await ensureRegistryEntity(db, {
    wajenziId: createWajenziId("ORG", "demo:supplier:industrial-area"), workspaceId: workspace.id, entityType: "organization", canonicalName: "Example Supplier — Industrial Area", lifecycleStatus: "verified", sourceSystem: "demo-seed", sourceRecordKey: "supplier-industrial-area", createdByUserId: user.id, attributes: { dataClass: "demo", nonCommercial: true },
  });
  await ensureOrganization(db, supplierTwo.id, "supplier", "Example Supplier — Industrial Area");

  const projectEntity = await ensureRegistryEntity(db, {
    wajenziId: createWajenziId("PRJ", "demo:nairobi-procurement"), workspaceId: workspace.id, entityType: "project", canonicalName: "Nairobi Procurement Demonstration", lifecycleStatus: "active", sourceSystem: "demo-seed", sourceRecordKey: "project-nairobi", ownerOrganizationEntityId: contractor.id, createdByUserId: user.id, attributes: { dataClass: "demo", nonCommercial: true },
  });
  let project = await first(db.select().from(projects).where(eq(projects.entityId, projectEntity.id)).limit(1));
  if (!project) {
    await db.insert(projects).values({ entityId: projectEntity.id, workspaceId: workspace.id, ownerOrganizationEntityId: contractor.id, projectType: "commercial", status: "active", metadata: { dataClass: "demo" } });
    project = await first(db.select().from(projects).where(eq(projects.entityId, projectEntity.id)).limit(1));
  }
  if (!project) throw new Error("Could not create demonstration project.");
  const existingProjectMembership = await first(db.select().from(projectMemberships).where(and(eq(projectMemberships.projectId, project.id), eq(projectMemberships.workspaceMemberId, membership.id))).limit(1));
  if (!existingProjectMembership) {
    await db.insert(projectMemberships).values({ projectId: project.id, workspaceMemberId: membership.id, projectRole: "registry_steward", status: "active" });
  }
  const siteEntity = await ensureRegistryEntity(db, {
    wajenziId: createWajenziId("LOC", "demo:nairobi-project-site"), workspaceId: workspace.id, entityType: "site", canonicalName: "Nairobi Demonstration Project Site", lifecycleStatus: "verified", sourceSystem: "demo-seed", sourceRecordKey: "nairobi-project-site", createdByUserId: user.id, attributes: { dataClass: "demo", nonCommercial: true },
  });
  let site = await first(db.select().from(sites).where(eq(sites.entityId, siteEntity.id)).limit(1));
  if (!site) {
    await db.insert(sites).values({ entityId: siteEntity.id, projectId: project.id, addressRaw: "Demonstration coordinate in Nairobi", addressNormalized: "Nairobi, Kenya — demonstration only", latitude: "-1.2863890", longitude: "36.8172230", locationConfidence: "0.9000", metadata: { dataClass: "demo", nonCommercial: true } });
    site = await first(db.select().from(sites).where(eq(sites.entityId, siteEntity.id)).limit(1));
  }

  const cementCategoryCode = "cement";
  let category = await first(db.select().from(productCategories).where(eq(productCategories.code, cementCategoryCode)).limit(1));
  if (!category) {
    await db.insert(productCategories).values({ code: cementCategoryCode, name: "Cement", description: "Controlled category for cement products." });
    category = await first(db.select().from(productCategories).where(eq(productCategories.code, cementCategoryCode)).limit(1));
  }
  if (!category) throw new Error("Could not create cement category.");

  const productSeeds = [
    { sourceRowId: "16932", name: "Bamburi Cement", brand: "Bamburi", packSize: "50 kg bag" },
    { sourceRowId: "16933", name: "Simba Cement", brand: "Simba", packSize: "50 kg bag" },
    { sourceRowId: "16934", name: "Rhino Cement", brand: "Rhino", packSize: "50 kg bag" },
  ];
  const seededProducts: Record<string, typeof registryEntities.$inferSelect> = {};
  for (const seed of productSeeds) {
    const masterWajenziId = createWajenziId("PRD", `${MASTER_SOURCE}:root:${seed.sourceRowId}`);
    const productEntity = await first(db.select().from(registryEntities).where(eq(registryEntities.wajenziId, masterWajenziId)).limit(1));
    if (!productEntity) throw new Error(`The authoritative master product ${seed.sourceRowId} is required before demo offers can be seeded.`);
    seededProducts[seed.sourceRowId] = productEntity;
    const legacyDemoEntity = await first(db.select().from(registryEntities).where(eq(registryEntities.wajenziId, createWajenziId("PRD", `master:${seed.sourceRowId}`))).limit(1));
    if (legacyDemoEntity && legacyDemoEntity.id !== productEntity.id && legacyDemoEntity.lifecycleStatus !== "merged") {
      await db.update(productOffers).set({ canonicalProductEntityId: productEntity.id }).where(eq(productOffers.canonicalProductEntityId, legacyDemoEntity.id));
      await db.update(registryEntities).set({ lifecycleStatus: "merged", mergedIntoEntityId: productEntity.id }).where(eq(registryEntities.id, legacyDemoEntity.id));
      await ensureAudit(db, { workspaceId: workspace.id, actorUserId: user.id, eventType: "DEMO_OFFER_CANONICAL_LINK_REPAIRED", subjectEntityId: legacyDemoEntity.id, relatedEntityIds: [productEntity.id], rationale: `Relinked illustrative offer data from legacy demo identity to authoritative master product ${masterWajenziId}; legacy identity remains retained as merged.` });
    }
  }

  const facilityOneEntity = await ensureRegistryEntity(db, {
    wajenziId: createWajenziId("LOC", "demo:facility:westlands"), workspaceId: workspace.id, entityType: "facility", canonicalName: "Example Supplier Westlands Facility", lifecycleStatus: "verified", sourceSystem: "demo-seed", sourceRecordKey: "facility-westlands", ownerOrganizationEntityId: supplierOne.id, createdByUserId: user.id, attributes: { dataClass: "demo", nonCommercial: true },
  });
  let facilityOne = await first(db.select().from(facilities).where(eq(facilities.entityId, facilityOneEntity.id)).limit(1));
  if (!facilityOne) {
    await db.insert(facilities).values({ entityId: facilityOneEntity.id, organizationEntityId: supplierOne.id, facilityType: "warehouse", addressRaw: "Demonstration Westlands facility", latitude: "-1.2676000", longitude: "36.8108000", verificationStatus: "verified", coverage: { radiusKm: 50 }, metadata: { dataClass: "demo", nonCommercial: true } });
    facilityOne = await first(db.select().from(facilities).where(eq(facilities.entityId, facilityOneEntity.id)).limit(1));
  }
  const facilityTwoEntity = await ensureRegistryEntity(db, {
    wajenziId: createWajenziId("LOC", "demo:facility:industrial-area"), workspaceId: workspace.id, entityType: "facility", canonicalName: "Example Supplier Industrial Area Facility", lifecycleStatus: "verified", sourceSystem: "demo-seed", sourceRecordKey: "facility-industrial-area", ownerOrganizationEntityId: supplierTwo.id, createdByUserId: user.id, attributes: { dataClass: "demo", nonCommercial: true },
  });
  let facilityTwo = await first(db.select().from(facilities).where(eq(facilities.entityId, facilityTwoEntity.id)).limit(1));
  if (!facilityTwo) {
    await db.insert(facilities).values({ entityId: facilityTwoEntity.id, organizationEntityId: supplierTwo.id, facilityType: "warehouse", addressRaw: "Demonstration Industrial Area facility", latitude: "-1.3007000", longitude: "36.8556000", verificationStatus: "verified", coverage: { radiusKm: 50 }, metadata: { dataClass: "demo", nonCommercial: true } });
    facilityTwo = await first(db.select().from(facilities).where(eq(facilities.entityId, facilityTwoEntity.id)).limit(1));
  }
  if (!facilityOne || !facilityTwo || !site) throw new Error("Could not create demonstration locations.");

  const demoEvidenceEntity = await ensureRegistryEntity(db, {
    wajenziId: createWajenziId("EVD", "demo:verified-stock-and-price"), workspaceId: workspace.id, entityType: "evidence", canonicalName: "Illustrative verified price and stock evidence", lifecycleStatus: "verified", sourceSystem: "demo-seed", sourceRecordKey: "illustrative-stock-price", createdByUserId: user.id, attributes: { dataClass: "demo", nonCommercial: true, warning: "Not a live market claim" },
  });
  let demoEvidence = await first(db.select().from(evidence).where(eq(evidence.entityId, demoEvidenceEntity.id)).limit(1));
  if (!demoEvidence) {
    await db.insert(evidence).values({ entityId: demoEvidenceEntity.id, workspaceId: workspace.id, evidenceType: "demonstration_record", statement: "Illustrative values used only to demonstrate a fully governed procurement query.", sourceSystem: "demo-seed", capturedAt: new Date(), verificationStatus: "verified" });
    demoEvidence = await first(db.select().from(evidence).where(eq(evidence.entityId, demoEvidenceEntity.id)).limit(1));
  }
  if (!demoEvidence) throw new Error("Could not create demonstration evidence.");

  const offerSeeds = [
    { seed: "offer:bamburi:westlands", supplier: supplierOne, facility: facilityOne, product: seededProducts["16932"], name: "Bamburi Cement — 50 kg demonstration offer", sku: "DEMO-BAM-50", amount: "735.0000", quantity: "240.000" },
    { seed: "offer:simba:industrial", supplier: supplierTwo, facility: facilityTwo, product: seededProducts["16933"], name: "Simba Cement — 50 kg demonstration offer", sku: "DEMO-SIM-50", amount: "720.0000", quantity: "180.000" },
    { seed: "offer:rhino:westlands", supplier: supplierOne, facility: facilityOne, product: seededProducts["16934"], name: "Rhino Cement — 50 kg demonstration offer", sku: "DEMO-RHI-50", amount: "748.0000", quantity: "90.000" },
  ];
  for (const seed of offerSeeds) {
    let offer = await first(db.select().from(productOffers).where(eq(productOffers.wajenziId, createWajenziId("OFR", seed.seed))).limit(1));
    if (!offer) {
      await db.insert(productOffers).values({ workspaceId: workspace.id, wajenziId: createWajenziId("OFR", seed.seed), supplierOrganizationEntityId: seed.supplier.id, facilityId: seed.facility.id, canonicalProductEntityId: seed.product.id, supplierSku: seed.sku, commercialName: seed.name, leadTimeHours: 24, minimumOrderQuantity: "1.000", orderUnit: "bag", commercialTerms: { taxBasis: "inclusive", dataClass: "demo", nonCommercial: true }, status: "active" });
      offer = await first(db.select().from(productOffers).where(eq(productOffers.wajenziId, createWajenziId("OFR", seed.seed))).limit(1));
    }
    if (!offer) continue;
    const latestPrice = await first(db.select().from(priceObservations).where(eq(priceObservations.offerId, offer.id)).orderBy(desc(priceObservations.observedAt)).limit(1));
    if (!latestPrice) await db.insert(priceObservations).values({ offerId: offer.id, amount: seed.amount, currencyCode: "KES", unitOfMeasure: "bag", taxBasis: "inclusive", normalizedAmount: seed.amount, normalizedUnit: "bag", normalizationMethod: "demo:one 50 kg bag", observedAt: new Date(), validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), verificationStatus: "verified", evidenceId: demoEvidence.id });
    const latestStock = await first(db.select().from(availabilityObservations).where(eq(availabilityObservations.offerId, offer.id)).orderBy(desc(availabilityObservations.observedAt)).limit(1));
    if (!latestStock) await db.insert(availabilityObservations).values({ offerId: offer.id, quantity: seed.quantity, unitOfMeasure: "bag", availabilityState: "available", observedAt: new Date(), freshnessUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), verificationStatus: "verified", verifiedAt: new Date(), evidenceId: demoEvidence.id });
  }

  const importId = createWajenziId("IMP", "demo:master-catalogue-bootstrap");
  let batch = await first(db.select().from(importBatches).where(eq(importBatches.wajenziId, importId)).limit(1));
  if (!batch) {
    await db.insert(importBatches).values({ workspaceId: workspace.id, wajenziId: importId, sourceSystem: MASTER_SOURCE, sourceHash: "demo-sample-derived-from-master-catalogue", importType: "master_catalogue", status: "completed", receivedRows: 3, processedRows: 3, rejectedRows: 0, report: { dataClass: "demo", note: "Illustrative sample only; full 13K bootstrap uses the idempotent import script." }, initiatedByUserId: user.id, completedAt: new Date() });
    batch = await first(db.select().from(importBatches).where(eq(importBatches.wajenziId, importId)).limit(1));
  }
  if (batch) {
    for (const seed of productSeeds) {
      const exists = await first(db.select().from(sourceRecords).where(and(eq(sourceRecords.importBatchId, batch.id), eq(sourceRecords.sourceRowKey, seed.sourceRowId))).limit(1));
      if (!exists) await db.insert(sourceRecords).values({ importBatchId: batch.id, sourceRowKey: seed.sourceRowId, sourcePayload: { name: seed.name, packSize: seed.packSize, source: MASTER_SOURCE, dataClass: "demo-sample" }, sourceHash: `demo:${seed.sourceRowId}`, mappedEntityId: seededProducts[seed.sourceRowId].id, processingStatus: "created", qualityFlags: [] });
    }
  }

  const reviewId = createWajenziId("SUB", "demo:unmatched-cement-product");
  let reviewSubmission = await first(db.select().from(supplierSubmissions).where(eq(supplierSubmissions.wajenziId, reviewId)).limit(1));
  if (!reviewSubmission) {
    await db.insert(supplierSubmissions).values({ workspaceId: workspace.id, wajenziId: reviewId, supplierOrganizationEntityId: supplierTwo.id, supplierSku: "DEMO-UNKNOWN-001", submittedName: "Unclassified demonstration cement blend", submittedAttributes: { dataClass: "demo", nonCommercial: true }, status: "review_required" });
    reviewSubmission = await first(db.select().from(supplierSubmissions).where(eq(supplierSubmissions.wajenziId, reviewId)).limit(1));
  }
  if (reviewSubmission) {
    const decision = await first(db.select().from(canonicalizationDecisions).where(eq(canonicalizationDecisions.supplierSubmissionId, reviewSubmission.id)).limit(1));
    if (!decision) await db.insert(canonicalizationDecisions).values({ supplierSubmissionId: reviewSubmission.id, outcome: "review_required", rationale: "No automatic canonical creation. A registry steward must review the demonstration submission." });
  }

  await ensureAudit(db, { workspaceId: workspace.id, actorUserId: user.id, eventType: "IMPORT_COMPLETED", subjectEntityId: projectEntity.id, rationale: "Seeded the clearly labelled end-to-end demonstration workspace." });
  await ensureAudit(db, { workspaceId: workspace.id, actorUserId: user.id, eventType: "SUBMISSION_REVIEW_REQUIRED", subjectEntityId: supplierTwo.id, rationale: "Kept an unmatched supplier submission in steward review." });
  return { workspace, membership };
}

export async function getWorkspaceContext(user: User): Promise<WorkspaceContext> {
  const db = await requireDb();
  let membership = await first(db.select().from(workspaceMembers).where(and(eq(workspaceMembers.userId, user.id), eq(workspaceMembers.status, "active"))).limit(1));
  if (!membership && user.role === "admin") {
    await ensureDemoWorkspace(db, user);
    membership = await first(db.select().from(workspaceMembers).where(and(eq(workspaceMembers.userId, user.id), eq(workspaceMembers.status, "active"))).limit(1));
  }
  if (!membership) throw new Error("You do not have an active WAJENZI workspace membership.");
  const workspace = await first(db.select().from(workspaces).where(eq(workspaces.id, membership.workspaceId)).limit(1));
  if (!workspace) throw new Error("Workspace record is unavailable.");
  return { workspace, membership };
}

export async function getDashboard(user: User) {
  const db = await requireDb();
  const context = await getWorkspaceContext(user);
  const [workspaceEntities, masterProducts, offers, imports, reviewQueue, audits, allSites, projectRows, organizationRows] = await Promise.all([
    db.select().from(registryEntities).where(eq(registryEntities.workspaceId, context.workspace.id)),
    db.select().from(registryEntities).where(and(eq(registryEntities.entityType, "product"), ne(registryEntities.lifecycleStatus, "merged"))),
    db.select().from(productOffers).where(eq(productOffers.workspaceId, context.workspace.id)),
    db.select().from(importBatches).where(eq(importBatches.workspaceId, context.workspace.id)).orderBy(desc(importBatches.createdAt)).limit(6),
    db.select().from(supplierSubmissions).where(eq(supplierSubmissions.workspaceId, context.workspace.id)).orderBy(desc(supplierSubmissions.submittedAt)).limit(12),
    db.select().from(auditEvents).where(eq(auditEvents.workspaceId, context.workspace.id)).orderBy(desc(auditEvents.occurredAt)).limit(12),
    db.select().from(sites).where(eq(sites.status, "active")),
    db.select().from(projects).where(eq(projects.workspaceId, context.workspace.id)),
    db.select().from(organizations),
  ]);
  const workspaceProjectIds = new Set(projectRows.map(project => project.id));
  const workspaceSites = allSites.filter(site => site.projectId != null && workspaceProjectIds.has(site.projectId));
  const participatingSupplierIds = new Set(offers.map(offer => offer.supplierOrganizationEntityId));
  if (context.membership.organizationEntityId) participatingSupplierIds.add(context.membership.organizationEntityId);
  const projectDetails = await Promise.all(projectRows.map(async project => ({ project, entity: await first(db.select().from(registryEntities).where(eq(registryEntities.id, project.entityId)).limit(1)) })));
  const supplierOrganizations = await Promise.all(organizationRows.filter(org => org.organizationKind === "supplier" && participatingSupplierIds.has(org.entityId)).map(async org => ({ organization: org, entity: await first(db.select().from(registryEntities).where(eq(registryEntities.id, org.entityId)).limit(1)) })));
  return {
    workspace: context.workspace,
    membership: context.membership,
    counts: { workspaceEntities: workspaceEntities.length, masterProducts: masterProducts.length, activeOffers: offers.filter(offer => offer.status === "active").length, reviewRequired: reviewQueue.filter(row => row.status === "review_required").length, activeSites: workspaceSites.length },
    imports,
    reviewQueue,
    audits,
    projects: projectDetails.map(row => ({ ...row.project, wajenziId: row.entity?.wajenziId, canonicalName: row.entity?.canonicalName })),
    supplierOrganizations: supplierOrganizations.map(row => ({ ...row.organization, wajenziId: row.entity?.wajenziId, canonicalName: row.entity?.canonicalName })),
    demo: context.workspace.isDemo,
  };
}

export async function listCatalogue(user: User, search?: string) {
  await getWorkspaceContext(user);
  const db = await requireDb();
  const where = search?.trim() ? and(eq(registryEntities.entityType, "product"), ne(registryEntities.lifecycleStatus, "merged"), like(registryEntities.canonicalName, `%${search.trim()}%`)) : and(eq(registryEntities.entityType, "product"), ne(registryEntities.lifecycleStatus, "merged"));
  const entities = await db.select().from(registryEntities).where(where).orderBy(desc(registryEntities.updatedAt)).limit(80);
  const productRows = await Promise.all(entities.map(async entity => ({ entity, product: await first(db.select().from(products).where(eq(products.entityId, entity.id)).limit(1)) })));
  return productRows.map(row => ({ ...row.entity, detail: row.product }));
}

export async function listLocations(user: User) {
  const db = await requireDb();
  const context = await getWorkspaceContext(user);
  const projectRows = await db.select().from(projects).where(eq(projects.workspaceId, context.workspace.id));
  const siteRows = await Promise.all(projectRows.map(project => db.select().from(sites).where(eq(sites.projectId, project.id))));
  const [allFacilities, workspaceOfferRows] = await Promise.all([
    db.select().from(facilities).where(eq(facilities.verificationStatus, "verified")),
    db.select().from(productOffers).where(eq(productOffers.workspaceId, context.workspace.id)),
  ]);
  const participatingSupplierIds = new Set(workspaceOfferRows.map(offer => offer.supplierOrganizationEntityId));
  if (context.membership.organizationEntityId) participatingSupplierIds.add(context.membership.organizationEntityId);
  const facilityRows = context.membership.workspaceRole === "supplier" && context.membership.organizationEntityId
    ? allFacilities.filter(facility => facility.organizationEntityId === context.membership.organizationEntityId)
    : allFacilities.filter(facility => participatingSupplierIds.has(facility.organizationEntityId));
  const flattenedSites = siteRows.flat();
  const siteLabels = await Promise.all(flattenedSites.map(site => first(db.select().from(registryEntities).where(eq(registryEntities.id, site.entityId)).limit(1))));
  const facilityLabels = await Promise.all(facilityRows.map(facility => first(db.select().from(registryEntities).where(eq(registryEntities.id, facility.entityId)).limit(1))));
  return {
    sites: flattenedSites.map((site, index) => ({ ...site, label: siteLabels[index]?.canonicalName ?? "Project site", wajenziId: siteLabels[index]?.wajenziId })),
    facilities: facilityRows.map((facility, index) => ({ ...facility, label: facilityLabels[index]?.canonicalName ?? "Supplier facility", wajenziId: facilityLabels[index]?.wajenziId })),
  };
}

export async function updateSiteCoordinates(user: User, input: { siteId: number; latitude: number; longitude: number; address?: string }) {
  const db = await requireDb();
  const context = await getWorkspaceContext(user);
  if (!canAccessWorkspace(context.membership.workspaceRole, "project_write")) throw new Error("Your workspace role cannot modify project locations.");
  const site = await first(db.select().from(sites).where(eq(sites.id, input.siteId)).limit(1));
  if (!site) throw new Error("Project site not found.");
  const project = site.projectId ? await first(db.select().from(projects).where(eq(projects.id, site.projectId)).limit(1)) : undefined;
  if (!project || project.workspaceId !== context.workspace.id) throw new Error("You cannot modify a site outside your workspace.");
  if (context.membership.workspaceRole !== "registry_steward") {
    const projectMembership = await first(db.select().from(projectMemberships).where(and(eq(projectMemberships.projectId, project.id), eq(projectMemberships.workspaceMemberId, context.membership.id), eq(projectMemberships.status, "active"))).limit(1));
    if (!projectMembership) throw new Error("You do not have active membership for this project site.");
  }
  await db.update(sites).set({ latitude: String(input.latitude), longitude: String(input.longitude), addressRaw: input.address ?? site.addressRaw, addressNormalized: input.address ?? site.addressNormalized, locationConfidence: "0.9500", updatedAt: new Date() }).where(eq(sites.id, input.siteId));
  await ensureAudit(db, { workspaceId: context.workspace.id, actorUserId: user.id, eventType: "SITE_LOCATION_UPDATED", subjectEntityId: site.entityId, rationale: "Updated project-site coordinates through the governed workspace." });
  return { success: true };
}

export async function createSupplierSubmission(user: User, input: { supplierOrganizationEntityId: number; submittedName: string; supplierSku?: string; attributes?: Record<string, unknown> }) {
  const db = await requireDb();
  const context = await getWorkspaceContext(user);
  if (!canAccessWorkspace(context.membership.workspaceRole, "supplier_write")) throw new Error("Your workspace role cannot submit supplier products.");
  const supplier = await first(db.select().from(organizations).where(eq(organizations.entityId, input.supplierOrganizationEntityId)).limit(1));
  if (!supplier || supplier.organizationKind !== "supplier") throw new Error("The selected organization is not a supplier.");
  if (context.membership.workspaceRole === "supplier" && context.membership.organizationEntityId !== input.supplierOrganizationEntityId) {
    throw new Error("Supplier users may submit products only for their linked organization.");
  }
  if (input.supplierSku) {
    const existing = await first(db.select().from(supplierSubmissions).where(and(eq(supplierSubmissions.supplierOrganizationEntityId, input.supplierOrganizationEntityId), eq(supplierSubmissions.supplierSku, input.supplierSku))).limit(1));
    if (existing) return { idempotent: true, submission: existing, outcome: "idempotent_skip" as const };
  }
  const searchToken = normalizedProductKey(input.submittedName).split(" ").find(token => token.length > 2) ?? "";
  const candidates = searchToken ? await db.select().from(registryEntities).where(and(eq(registryEntities.entityType, "product"), like(registryEntities.canonicalName, `%${searchToken}%`))).limit(50) : [];
  const scored = candidates.map(candidate => ({ candidate, confidence: scoreProductMatch(input.submittedName, candidate.canonicalName) })).sort((a, b) => b.confidence - a.confidence);
  const best = scored[0];
  const result = determineCanonicalOutcome({ sourceRowAlreadyImported: false, bestMatchScore: best?.confidence, hasIdentityConflict: false });
  const submissionStatus = result === "matched_existing_product" ? "matched_existing_product" : "review_required";
  const submissionId = createWajenziId("SUB", `${context.workspace.id}:${input.supplierOrganizationEntityId}:${input.supplierSku ?? input.submittedName}:${Date.now()}`);
  await db.insert(supplierSubmissions).values({ workspaceId: context.workspace.id, wajenziId: submissionId, supplierOrganizationEntityId: input.supplierOrganizationEntityId, supplierSku: input.supplierSku, submittedName: input.submittedName, submittedAttributes: input.attributes ?? {}, status: submissionStatus, resolvedAt: submissionStatus === "matched_existing_product" ? new Date() : null });
  const submission = await first(db.select().from(supplierSubmissions).where(eq(supplierSubmissions.wajenziId, submissionId)).limit(1));
  if (!submission) throw new Error("Could not save supplier submission.");
  if (best) await db.insert(canonicalMatchCandidates).values({ supplierSubmissionId: submission.id, candidateEntityId: best.candidate.id, matchMethod: "token_jaccard", confidence: String(best.confidence), evidence: { submittedName: input.submittedName, canonicalName: best.candidate.canonicalName } });
  await db.insert(canonicalizationDecisions).values({ supplierSubmissionId: submission.id, outcome: result === "matched_existing_product" ? "matched_existing_product" : "review_required", resolvedEntityId: result === "matched_existing_product" ? best?.candidate.id : null, rationale: result === "matched_existing_product" ? "High-confidence candidate match; a supplier offer may attach without duplicating the canonical product." : "No automatic canonical creation. The submission requires registry steward review." , decidedByUserId: result === "matched_existing_product" ? user.id : null });
  await ensureAudit(db, { workspaceId: context.workspace.id, actorUserId: user.id, eventType: result === "matched_existing_product" ? "SUPPLIER_SUBMISSION_MATCHED" : "SUPPLIER_SUBMISSION_REVIEW_REQUIRED", subjectEntityId: best?.candidate.id, rationale: `Supplier submission ${submission.wajenziId} processed using governed canonicalization.` });
  return { idempotent: false, submission, outcome: result, bestCandidate: best ? { ...best.candidate, confidence: best.confidence } : null };
}

export async function resolveSupplierSubmission(user: User, input: { submissionId: number; outcome: "matched_existing_product" | "new_canonical_product" | "rejected"; canonicalName?: string; rationale: string }) {
  const db = await requireDb();
  const context = await getWorkspaceContext(user);
  if (!canAccessWorkspace(context.membership.workspaceRole, "steward")) throw new Error("Only registry stewards can resolve canonicalization decisions.");
  const submission = await first(db.select().from(supplierSubmissions).where(eq(supplierSubmissions.id, input.submissionId)).limit(1));
  if (!submission || submission.workspaceId !== context.workspace.id) throw new Error("Supplier submission not found in your workspace.");
  let resolvedEntityId: number | null = null;
  if (input.outcome === "new_canonical_product") {
    if (!input.canonicalName?.trim()) throw new Error("A canonical name is required when creating a new product.");
    const entity = await ensureRegistryEntity(db, { wajenziId: createEntityWajenziId("product", `steward:${submission.id}:${input.canonicalName.trim()}`), workspaceId: null, entityType: "product", canonicalName: input.canonicalName.trim(), lifecycleStatus: "pending_review", sourceSystem: "supplier-submission", sourceRecordKey: String(submission.id), createdByUserId: user.id, attributes: { createdFromSubmissionId: submission.id } });
    const existingProduct = await first(db.select().from(products).where(eq(products.entityId, entity.id)).limit(1));
    if (!existingProduct) await db.insert(products).values({ entityId: entity.id, productKind: "simple", attributes: {}, classifications: {}, verificationStatus: "pending" });
    resolvedEntityId = entity.id;
  } else if (input.outcome === "matched_existing_product") {
    const candidate = await first(db.select().from(canonicalMatchCandidates).where(eq(canonicalMatchCandidates.supplierSubmissionId, submission.id)).orderBy(desc(canonicalMatchCandidates.confidence)).limit(1));
    if (!candidate) throw new Error("A canonical match candidate is required before matching this submission.");
    resolvedEntityId = candidate.candidateEntityId;
  }
  const status = input.outcome === "matched_existing_product" ? "matched_existing_product" : input.outcome === "new_canonical_product" ? "approved_new_canonical" : "rejected";
  await db.update(supplierSubmissions).set({ status, resolvedAt: new Date() }).where(eq(supplierSubmissions.id, submission.id));
  await db.insert(canonicalizationDecisions).values({ supplierSubmissionId: submission.id, outcome: input.outcome, resolvedEntityId, rationale: input.rationale, decidedByUserId: user.id });
  await ensureAudit(db, { workspaceId: context.workspace.id, actorUserId: user.id, eventType: "CANONICALIZATION_DECISION_RECORDED", subjectEntityId: resolvedEntityId ?? undefined, rationale: input.rationale });
  return { success: true, resolvedEntityId };
}

export async function searchProcurement(user: User, input: { projectEntityId: number; productQuery: string; radiusKm: number; freshnessHours: number }) {
  const db = await requireDb();
  const context = await getWorkspaceContext(user);
  if (!canAccessWorkspace(context.membership.workspaceRole, "read")) throw new Error("Your workspace role cannot query procurement data.");
  const project = await first(db.select().from(projects).where(eq(projects.entityId, input.projectEntityId)).limit(1));
  if (!project || project.workspaceId !== context.workspace.id) throw new Error("Project is not in your active workspace.");
  if (context.membership.workspaceRole !== "registry_steward") {
    const projectMembership = await first(db.select().from(projectMemberships).where(and(eq(projectMemberships.projectId, project.id), eq(projectMemberships.workspaceMemberId, context.membership.id), eq(projectMemberships.status, "active"))).limit(1));
    if (!projectMembership) throw new Error("You do not have active membership for this project.");
  }
  const site = await first(db.select().from(sites).where(eq(sites.projectId, project.id)).limit(1));
  const query = input.productQuery.trim();
  const candidateProducts = query ? await db.select().from(registryEntities).where(and(eq(registryEntities.entityType, "product"), ne(registryEntities.lifecycleStatus, "merged"), like(registryEntities.canonicalName, `%${query}%`))).limit(80) : [];
  if (!candidateProducts.length) return { ready: true, results: [], reason: "No canonical products matched the requested product text." };
  const candidateIds = new Set(candidateProducts.map(product => product.id));
  const allWorkspaceOffers = await db.select().from(productOffers).where(and(eq(productOffers.workspaceId, context.workspace.id), eq(productOffers.status, "active")));
  const workspaceOffers = context.membership.workspaceRole === "supplier" && context.membership.organizationEntityId
    ? allWorkspaceOffers.filter(offer => offer.supplierOrganizationEntityId === context.membership.organizationEntityId)
    : allWorkspaceOffers;
  const now = new Date();
  const rawOffers = [];
  for (const offer of workspaceOffers.filter(item => item.canonicalProductEntityId != null && candidateIds.has(item.canonicalProductEntityId))) {
    const [facility, supplier, product, price, stock] = await Promise.all([
      first(db.select().from(facilities).where(eq(facilities.id, offer.facilityId)).limit(1)),
      first(db.select().from(registryEntities).where(eq(registryEntities.id, offer.supplierOrganizationEntityId)).limit(1)),
      offer.canonicalProductEntityId ? first(db.select().from(registryEntities).where(eq(registryEntities.id, offer.canonicalProductEntityId)).limit(1)) : undefined,
      first(db.select().from(priceObservations).where(eq(priceObservations.offerId, offer.id)).orderBy(desc(priceObservations.observedAt)).limit(1)),
      first(db.select().from(availabilityObservations).where(eq(availabilityObservations.offerId, offer.id)).orderBy(desc(availabilityObservations.observedAt)).limit(1)),
    ]);
    if (!facility || !supplier || !product || !price || !stock) continue;
    rawOffers.push({
      offerId: offer.wajenziId, canonicalProductId: product.wajenziId, productName: product.canonicalName, supplierName: supplier.canonicalName, facilityName: facility.addressRaw ?? "Supplier facility", facilityLatitude: facility.latitude ? Number(facility.latitude) : null, facilityLongitude: facility.longitude ? Number(facility.longitude) : null, normalizedAmount: price.normalizedAmount ? Number(price.normalizedAmount) : null, normalizedUnit: price.normalizedUnit, currencyCode: price.currencyCode, taxBasis: price.taxBasis, priceVerificationStatus: price.verificationStatus, priceObservedAt: price.observedAt, stockQuantity: stock.quantity ? Number(stock.quantity) : null, stockUnit: stock.unitOfMeasure, availabilityState: stock.availabilityState, stockVerificationStatus: stock.verificationStatus, stockObservedAt: stock.observedAt, stockFreshnessUntil: stock.freshnessUntil,
    });
  }
  const filtered = filterComparableOffers({ offers: rawOffers, projectSite: site?.latitude != null && site.longitude != null ? { latitude: Number(site.latitude), longitude: Number(site.longitude) } : null, radiusKm: input.radiusKm, now, currencyCode: "KES", normalizedUnit: "bag", taxBasis: "inclusive" });
  await ensureAudit(db, { workspaceId: context.workspace.id, actorUserId: user.id, eventType: "PROCUREMENT_QUERY_EXECUTED", subjectEntityId: project.entityId, rationale: `Procurement query for ${query}, radius ${input.radiusKm} km, stock freshness ${input.freshnessHours} hours.` });
  if (!filtered.ready) return filtered;
  return { ready: true, results: filtered.results.filter(result => result.stockObservedAt >= new Date(now.getTime() - input.freshnessHours * 60 * 60 * 1000)), projectSite: site ? { latitude: Number(site.latitude), longitude: Number(site.longitude) } : null, candidateProducts: candidateProducts.map(product => ({ wajenziId: product.wajenziId, canonicalName: product.canonicalName })) };
}

export async function uploadWorkspaceFile(user: User, input: { assetKind: typeof fileAssets.$inferInsert.assetKind; originalFilename: string; mimeType: string; contentBase64: string }) {
  const db = await requireDb();
  const context = await getWorkspaceContext(user);
  if (!canAccessWorkspace(context.membership.workspaceRole, "supplier_write")) throw new Error("Your workspace role cannot upload supplier or evidence files.");
  const bytes = Buffer.from(input.contentBase64, "base64");
  if (!bytes.length) throw new Error("The upload was empty.");
  if (bytes.length > 8 * 1024 * 1024) throw new Error("Files over 8 MB require the production direct-upload flow; do not embed them in a request payload.");
  const safeFilename = input.originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) || "upload";
  const stored = await storagePut(`wajenzi/${context.workspace.wajenziId}/${input.assetKind}/${safeFilename}`, bytes, input.mimeType);
  const wajenziId = createWajenziId("DOC", `${context.workspace.id}:${stored.key}`);
  await db.insert(fileAssets).values({ workspaceId: context.workspace.id, wajenziId, storageKey: stored.key, storageUrl: stored.url, originalFilename: input.originalFilename, mimeType: input.mimeType, byteSize: bytes.length, assetKind: input.assetKind, uploadedByUserId: user.id });
  const file = await first(db.select().from(fileAssets).where(eq(fileAssets.wajenziId, wajenziId)).limit(1));
  await ensureAudit(db, { workspaceId: context.workspace.id, actorUserId: user.id, eventType: "FILE_ASSET_UPLOADED", rationale: `Stored ${input.assetKind} outside the database and retained governed metadata.` });
  return file;
}

export async function listWorkspaceFiles(user: User) {
  const db = await requireDb();
  const context = await getWorkspaceContext(user);
  return db.select().from(fileAssets).where(eq(fileAssets.workspaceId, context.workspace.id)).orderBy(desc(fileAssets.createdAt)).limit(30);
}

async function requireCommercialOffer(db: Db, context: WorkspaceContext, user: User, offerWajenziId: string) {
  const offer = await first(db.select().from(productOffers).where(and(eq(productOffers.wajenziId, offerWajenziId), eq(productOffers.workspaceId, context.workspace.id))).limit(1));
  if (!offer) throw new Error("The commercial offer does not exist in your active workspace.");
  if (context.membership.workspaceRole === "supplier" && context.membership.organizationEntityId !== offer.supplierOrganizationEntityId) {
    throw new Error("Supplier users may manage commercial records only for their linked organization.");
  }
  if (!canAccessWorkspace(context.membership.workspaceRole, "supplier_write")) throw new Error("Your workspace role cannot write commercial records.");
  return offer;
}

async function createFileEvidence(db: Db, context: WorkspaceContext, input: { canonicalProductEntityId: number; fileAssetWajenziId: string; evidenceType: string; statement: string; sourceSystem: string; capturedAt: Date }) {
  const asset = await first(db.select().from(fileAssets).where(and(eq(fileAssets.wajenziId, input.fileAssetWajenziId), eq(fileAssets.workspaceId, context.workspace.id))).limit(1));
  if (!asset) throw new Error("A stored evidence file from this workspace is required for a commercial observation.");
  await db.insert(evidence).values({ entityId: input.canonicalProductEntityId, workspaceId: context.workspace.id, fileAssetId: asset.id, evidenceType: input.evidenceType, statement: input.statement, sourceSystem: input.sourceSystem, capturedAt: input.capturedAt, verificationStatus: "pending" });
  const created = await first(db.select().from(evidence).where(and(eq(evidence.workspaceId, context.workspace.id), eq(evidence.fileAssetId, asset.id))).orderBy(desc(evidence.id)).limit(1));
  if (!created) throw new Error("Evidence metadata could not be recorded.");
  return created;
}

export async function createCommercialOffer(user: User, input: {
  supplierOrganizationEntityId: number;
  facilityId: number;
  canonicalProductWajenziId: string;
  commercialName: string;
  supplierSku?: string;
  leadTimeHours?: number;
  minimumOrderQuantity?: number;
  orderUnit?: string;
}) {
  const db = await requireDb();
  const context = await getWorkspaceContext(user);
  if (!canAccessWorkspace(context.membership.workspaceRole, "supplier_write")) throw new Error("Your workspace role cannot create supplier offers.");
  if (context.membership.workspaceRole === "supplier" && context.membership.organizationEntityId !== input.supplierOrganizationEntityId) throw new Error("Supplier users may create offers only for their linked organization.");
  const [supplier, facility, canonicalProduct] = await Promise.all([
    first(db.select().from(organizations).where(eq(organizations.entityId, input.supplierOrganizationEntityId)).limit(1)),
    first(db.select().from(facilities).where(eq(facilities.id, input.facilityId)).limit(1)),
    first(db.select().from(registryEntities).where(and(eq(registryEntities.wajenziId, input.canonicalProductWajenziId), eq(registryEntities.entityType, "product"))).limit(1)),
  ]);
  if (!supplier || supplier.organizationKind !== "supplier") throw new Error("The selected offer owner is not a supplier organization.");
  if (!facility || facility.organizationEntityId !== input.supplierOrganizationEntityId) throw new Error("The selected facility is not owned by the supplier organization.");
  if (!canonicalProduct) throw new Error("Offers must attach to an existing canonical product. Supplier records cannot create canonical identity.");
  const wajenziId = createWajenziId("OFR");
  await db.insert(productOffers).values({
    workspaceId: context.workspace.id,
    wajenziId,
    supplierOrganizationEntityId: input.supplierOrganizationEntityId,
    facilityId: input.facilityId,
    canonicalProductEntityId: canonicalProduct.id,
    supplierSku: input.supplierSku || null,
    commercialName: input.commercialName,
    leadTimeHours: input.leadTimeHours ?? null,
    minimumOrderQuantity: input.minimumOrderQuantity != null ? String(input.minimumOrderQuantity) : null,
    orderUnit: input.orderUnit || null,
    commercialTerms: { dataClass: "operational_pending_verification" },
    status: "active",
  });
  const offer = await first(db.select().from(productOffers).where(eq(productOffers.wajenziId, wajenziId)).limit(1));
  await ensureAudit(db, { workspaceId: context.workspace.id, actorUserId: user.id, eventType: "SUPPLIER_OFFER_CREATED", subjectEntityId: canonicalProduct.id, rationale: `Created a supplier commercial offer separate from canonical product identity: ${input.commercialName}.` });
  return offer;
}

export async function recordPriceObservation(user: User, input: {
  offerWajenziId: string;
  amount: number;
  currencyCode: string;
  unitOfMeasure: string;
  taxBasis: typeof priceObservations.$inferInsert.taxBasis;
  normalizedAmount?: number;
  normalizedUnit?: string;
  normalizationMethod?: string;
  observedAt: Date;
  validUntil?: Date;
  evidenceFileWajenziId: string;
}) {
  const db = await requireDb();
  const context = await getWorkspaceContext(user);
  const offer = await requireCommercialOffer(db, context, user, input.offerWajenziId);
  if (!offer.canonicalProductEntityId) throw new Error("A price observation requires an offer attached to a canonical product.");
  if (input.currencyCode !== "KES" && input.normalizedAmount != null) throw new Error("A normalized comparable price requires KES currency until an exchange-rate provenance policy is implemented.");
  const evidenceRecord = await createFileEvidence(db, context, { canonicalProductEntityId: offer.canonicalProductEntityId, fileAssetWajenziId: input.evidenceFileWajenziId, evidenceType: "price_observation", statement: `Price evidence for commercial offer ${offer.wajenziId}.`, sourceSystem: "workspace_file_upload", capturedAt: input.observedAt });
  await db.insert(priceObservations).values({ offerId: offer.id, amount: String(input.amount), currencyCode: input.currencyCode, unitOfMeasure: input.unitOfMeasure, taxBasis: input.taxBasis, normalizedAmount: input.normalizedAmount != null ? String(input.normalizedAmount) : null, normalizedUnit: input.normalizedUnit || null, normalizationMethod: input.normalizationMethod || null, observedAt: input.observedAt, validUntil: input.validUntil ?? null, verificationStatus: "pending", evidenceId: evidenceRecord.id });
  const observation = await first(db.select().from(priceObservations).where(eq(priceObservations.offerId, offer.id)).orderBy(desc(priceObservations.id)).limit(1));
  await ensureAudit(db, { workspaceId: context.workspace.id, actorUserId: user.id, eventType: "PRICE_OBSERVATION_RECORDED", subjectEntityId: offer.canonicalProductEntityId, rationale: `Recorded evidence-backed price observation for ${offer.wajenziId}; verification remains pending.` });
  return observation;
}

export async function recordAvailabilityObservation(user: User, input: {
  offerWajenziId: string;
  quantity?: number;
  unitOfMeasure: string;
  availabilityState: typeof availabilityObservations.$inferInsert.availabilityState;
  observedAt: Date;
  freshnessUntil?: Date;
  evidenceFileWajenziId: string;
}) {
  const db = await requireDb();
  const context = await getWorkspaceContext(user);
  const offer = await requireCommercialOffer(db, context, user, input.offerWajenziId);
  if (!offer.canonicalProductEntityId) throw new Error("An availability observation requires an offer attached to a canonical product.");
  if (input.freshnessUntil && input.freshnessUntil <= input.observedAt) throw new Error("Availability freshness must end after the observation timestamp.");
  const evidenceRecord = await createFileEvidence(db, context, { canonicalProductEntityId: offer.canonicalProductEntityId, fileAssetWajenziId: input.evidenceFileWajenziId, evidenceType: "availability_observation", statement: `Availability evidence for commercial offer ${offer.wajenziId}.`, sourceSystem: "workspace_file_upload", capturedAt: input.observedAt });
  await db.insert(availabilityObservations).values({ offerId: offer.id, quantity: input.quantity != null ? String(input.quantity) : null, unitOfMeasure: input.unitOfMeasure, availabilityState: input.availabilityState, observedAt: input.observedAt, freshnessUntil: input.freshnessUntil ?? null, verificationStatus: "pending", evidenceId: evidenceRecord.id });
  const observation = await first(db.select().from(availabilityObservations).where(eq(availabilityObservations.offerId, offer.id)).orderBy(desc(availabilityObservations.id)).limit(1));
  await ensureAudit(db, { workspaceId: context.workspace.id, actorUserId: user.id, eventType: "AVAILABILITY_OBSERVATION_RECORDED", subjectEntityId: offer.canonicalProductEntityId, rationale: `Recorded evidence-backed availability observation for ${offer.wajenziId}; verification remains pending.` });
  return observation;
}

export async function listCommercialRecords(user: User) {
  const db = await requireDb();
  const context = await getWorkspaceContext(user);
  const allOffers = await db.select().from(productOffers).where(eq(productOffers.workspaceId, context.workspace.id)).orderBy(desc(productOffers.updatedAt)).limit(100);
  const offers = context.membership.workspaceRole === "supplier" && context.membership.organizationEntityId ? allOffers.filter(offer => offer.supplierOrganizationEntityId === context.membership.organizationEntityId) : allOffers;
  return Promise.all(offers.map(async offer => {
    const [product, supplier, facility, latestPrice, latestAvailability] = await Promise.all([
      offer.canonicalProductEntityId ? first(db.select().from(registryEntities).where(eq(registryEntities.id, offer.canonicalProductEntityId)).limit(1)) : undefined,
      first(db.select().from(registryEntities).where(eq(registryEntities.id, offer.supplierOrganizationEntityId)).limit(1)),
      first(db.select().from(facilities).where(eq(facilities.id, offer.facilityId)).limit(1)),
      first(db.select().from(priceObservations).where(eq(priceObservations.offerId, offer.id)).orderBy(desc(priceObservations.observedAt)).limit(1)),
      first(db.select().from(availabilityObservations).where(eq(availabilityObservations.offerId, offer.id)).orderBy(desc(availabilityObservations.observedAt)).limit(1)),
    ]);
    return { ...offer, canonicalProductName: product?.canonicalName, canonicalProductWajenziId: product?.wajenziId, supplierName: supplier?.canonicalName, facilityName: facility?.addressRaw ?? "Supplier facility", latestPrice, latestAvailability };
  }));
}
