import {
  bigint,
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const workspaceRoles = ["registry_steward", "supplier", "contractor", "project_user", "viewer"] as const;
export const entityTypes = ["organization", "person", "user_account", "project", "site", "facility", "product", "product_variant", "document", "boq_item", "purchase_order", "event", "evidence"] as const;
export const entityStatuses = ["draft", "active", "pending_review", "verified", "suspended", "merged", "archived"] as const;

export const workspaces = mysqlTable("workspaces", {
  id: int("id").autoincrement().primaryKey(),
  wajenziId: varchar("wajenziId", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["active", "suspended", "archived"]).default("active").notNull(),
  isDemo: boolean("isDemo").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const workspaceMembers = mysqlTable("workspace_members", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
  userId: int("userId").notNull().references(() => users.id),
  workspaceRole: mysqlEnum("workspaceRole", workspaceRoles).notNull(),
  organizationEntityId: int("organizationEntityId"),
  status: mysqlEnum("status", ["invited", "active", "suspended", "ended"]).default("active").notNull(),
  scope: json("scope"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("workspace_member_unique").on(table.workspaceId, table.userId),
  index("workspace_members_user_idx").on(table.userId),
]);

export const registryEntities = mysqlTable("registry_entities", {
  id: int("id").autoincrement().primaryKey(),
  wajenziId: varchar("wajenziId", { length: 40 }).notNull().unique(),
  workspaceId: int("workspaceId").references(() => workspaces.id),
  entityType: mysqlEnum("entityType", entityTypes).notNull(),
  canonicalName: varchar("canonicalName", { length: 500 }).notNull(),
  lifecycleStatus: mysqlEnum("lifecycleStatus", entityStatuses).default("draft").notNull(),
  mergedIntoEntityId: int("mergedIntoEntityId"),
  sourceSystem: varchar("sourceSystem", { length: 120 }),
  sourceRecordKey: varchar("sourceRecordKey", { length: 255 }),
  ownerOrganizationEntityId: int("ownerOrganizationEntityId"),
  attributes: json("attributes"),
  createdByUserId: int("createdByUserId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("registry_entity_workspace_idx").on(table.workspaceId, table.entityType),
  index("registry_entity_name_idx").on(table.canonicalName),
  uniqueIndex("registry_entity_source_unique").on(table.workspaceId, table.entityType, table.sourceSystem, table.sourceRecordKey),
]);

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  entityId: int("entityId").notNull().unique().references(() => registryEntities.id),
  organizationKind: mysqlEnum("organizationKind", ["supplier", "manufacturer", "contractor", "distributor", "professional_firm", "client", "public_authority", "other"]).notNull(),
  legalName: varchar("legalName", { length: 500 }),
  verificationStatus: mysqlEnum("verificationStatus", ["unverified", "pending", "verified", "rejected", "expired"]).default("unverified").notNull(),
  countryCode: varchar("countryCode", { length: 3 }).default("KEN").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  entityId: int("entityId").notNull().unique().references(() => registryEntities.id),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
  ownerOrganizationEntityId: int("ownerOrganizationEntityId").references(() => registryEntities.id),
  projectType: varchar("projectType", { length: 120 }).notNull(),
  status: mysqlEnum("status", ["draft", "active", "paused", "completed", "cancelled", "archived"]).default("draft").notNull(),
  plannedStartAt: timestamp("plannedStartAt"),
  plannedEndAt: timestamp("plannedEndAt"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectMemberships = mysqlTable("project_memberships", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id),
  workspaceMemberId: int("workspaceMemberId").notNull().references(() => workspaceMembers.id),
  projectRole: varchar("projectRole", { length: 120 }).notNull(),
  status: mysqlEnum("status", ["invited", "active", "suspended", "ended"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("project_member_unique").on(table.projectId, table.workspaceMemberId)]);

export const sites = mysqlTable("sites", {
  id: int("id").autoincrement().primaryKey(),
  entityId: int("entityId").notNull().unique().references(() => registryEntities.id),
  projectId: int("projectId").references(() => projects.id),
  addressRaw: text("addressRaw"),
  addressNormalized: text("addressNormalized"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  locationConfidence: decimal("locationConfidence", { precision: 5, scale: 4 }),
  status: mysqlEnum("status", ["draft", "active", "inactive", "archived"]).default("active").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("sites_project_idx").on(table.projectId)]);

export const facilities = mysqlTable("facilities", {
  id: int("id").autoincrement().primaryKey(),
  entityId: int("entityId").notNull().unique().references(() => registryEntities.id),
  organizationEntityId: int("organizationEntityId").notNull().references(() => registryEntities.id),
  facilityType: mysqlEnum("facilityType", ["store", "warehouse", "yard", "plant", "office", "other"]).notNull(),
  addressRaw: text("addressRaw"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  verificationStatus: mysqlEnum("verificationStatus", ["unverified", "pending", "verified", "expired"]).default("unverified").notNull(),
  coverage: json("coverage"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("facilities_organization_idx").on(table.organizationEntityId)]);

export const controlledVocabularies = mysqlTable("controlled_vocabularies", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isSystemManaged: boolean("isSystemManaged").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const controlledValues = mysqlTable("controlled_values", {
  id: int("id").autoincrement().primaryKey(),
  vocabularyId: int("vocabularyId").notNull().references(() => controlledVocabularies.id),
  code: varchar("code", { length: 160 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  parentValueId: int("parentValueId"),
  status: mysqlEnum("status", ["active", "deprecated", "draft"]).default("active").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("controlled_value_unique").on(table.vocabularyId, table.code)]);

export const productCategories = mysqlTable("product_categories", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 160 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: int("parentId"),
  description: text("description"),
  status: mysqlEnum("status", ["active", "deprecated", "draft"]).default("active").notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  entityId: int("entityId").notNull().unique().references(() => registryEntities.id),
  categoryId: int("categoryId").references(() => productCategories.id),
  productKind: mysqlEnum("productKind", ["simple", "family"]).notNull(),
  brand: varchar("brand", { length: 255 }),
  manufacturerOrganizationEntityId: int("manufacturerOrganizationEntityId").references(() => registryEntities.id),
  unitOfMeasure: varchar("unitOfMeasure", { length: 64 }),
  packSize: varchar("packSize", { length: 128 }),
  material: varchar("material", { length: 255 }),
  finish: varchar("finish", { length: 255 }),
  attributes: json("attributes"),
  classifications: json("classifications"),
  searchTerms: text("searchTerms"),
  verificationStatus: mysqlEnum("verificationStatus", ["unverified", "pending", "verified", "rejected"]).default("unverified").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const productVariants = mysqlTable("product_variants", {
  id: int("id").autoincrement().primaryKey(),
  entityId: int("entityId").notNull().unique().references(() => registryEntities.id),
  productId: int("productId").notNull().references(() => products.id),
  variantLabel: varchar("variantLabel", { length: 500 }).notNull(),
  sku: varchar("sku", { length: 255 }),
  unitOfMeasure: varchar("unitOfMeasure", { length: 64 }),
  packSize: varchar("packSize", { length: 128 }),
  attributes: json("attributes"),
  status: mysqlEnum("status", ["active", "draft", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("product_variants_product_idx").on(table.productId)]);

export const externalIdentifiers = mysqlTable("external_identifiers", {
  id: int("id").autoincrement().primaryKey(),
  entityId: int("entityId").notNull().references(() => registryEntities.id),
  namespace: varchar("namespace", { length: 120 }).notNull(),
  value: varchar("value", { length: 500 }).notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("external_identifier_unique").on(table.namespace, table.value)]);

export const entityRelations = mysqlTable("entity_relations", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
  subjectEntityId: int("subjectEntityId").notNull().references(() => registryEntities.id),
  predicate: varchar("predicate", { length: 160 }).notNull(),
  objectEntityId: int("objectEntityId").notNull().references(() => registryEntities.id),
  status: mysqlEnum("status", ["asserted", "verified", "retracted", "superseded"]).default("asserted").notNull(),
  provenance: json("provenance"),
  validFrom: timestamp("validFrom").defaultNow().notNull(),
  validTo: timestamp("validTo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("entity_relation_subject_idx").on(table.subjectEntityId, table.predicate), index("entity_relation_object_idx").on(table.objectEntityId, table.predicate)]);

export const importBatches = mysqlTable("import_batches", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
  wajenziId: varchar("wajenziId", { length: 40 }).notNull().unique(),
  sourceSystem: varchar("sourceSystem", { length: 120 }).notNull(),
  sourceHash: varchar("sourceHash", { length: 128 }).notNull(),
  fileAssetId: int("fileAssetId"),
  importType: mysqlEnum("importType", ["master_catalogue", "supplier_catalogue", "location_reference", "price_reference", "other"]).notNull(),
  status: mysqlEnum("status", ["received", "validated", "processing", "completed", "failed", "rejected"]).default("received").notNull(),
  receivedRows: int("receivedRows").default(0).notNull(),
  processedRows: int("processedRows").default(0).notNull(),
  rejectedRows: int("rejectedRows").default(0).notNull(),
  report: json("report"),
  initiatedByUserId: int("initiatedByUserId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, table => [uniqueIndex("import_batch_hash_unique").on(table.workspaceId, table.sourceSystem, table.sourceHash)]);

export const sourceRecords = mysqlTable("source_records", {
  id: int("id").autoincrement().primaryKey(),
  importBatchId: int("importBatchId").notNull().references(() => importBatches.id),
  sourceRowKey: varchar("sourceRowKey", { length: 255 }).notNull(),
  sourcePayload: json("sourcePayload").notNull(),
  sourceHash: varchar("sourceHash", { length: 128 }).notNull(),
  mappedEntityId: int("mappedEntityId").references(() => registryEntities.id),
  processingStatus: mysqlEnum("processingStatus", ["received", "normalized", "matched", "review_required", "rejected", "created"]).default("received").notNull(),
  qualityFlags: json("qualityFlags"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("source_record_batch_row_unique").on(table.importBatchId, table.sourceRowKey)]);

export const supplierSubmissions = mysqlTable("supplier_submissions", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
  wajenziId: varchar("wajenziId", { length: 40 }).notNull().unique(),
  supplierOrganizationEntityId: int("supplierOrganizationEntityId").notNull(),
  sourceRecordId: int("sourceRecordId").references(() => sourceRecords.id),
  supplierSku: varchar("supplierSku", { length: 255 }),
  submittedName: varchar("submittedName", { length: 500 }).notNull(),
  submittedAttributes: json("submittedAttributes"),
  status: mysqlEnum("status", ["received", "matching", "matched_existing_product", "matched_existing_variant", "review_required", "approved_new_canonical", "rejected"]).default("received").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export const canonicalMatchCandidates = mysqlTable("canonical_match_candidates", {
  id: int("id").autoincrement().primaryKey(),
  supplierSubmissionId: int("supplierSubmissionId").notNull().references(() => supplierSubmissions.id),
  candidateEntityId: int("candidateEntityId").notNull().references(() => registryEntities.id),
  matchMethod: varchar("matchMethod", { length: 120 }).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
  evidence: json("evidence"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("match_candidate_unique").on(table.supplierSubmissionId, table.candidateEntityId)]);

export const canonicalizationDecisions = mysqlTable("canonicalization_decisions", {
  id: int("id").autoincrement().primaryKey(),
  supplierSubmissionId: int("supplierSubmissionId").notNull().references(() => supplierSubmissions.id),
  outcome: mysqlEnum("outcome", ["matched_existing_product", "matched_existing_variant", "review_required", "new_canonical_product", "new_canonical_variant", "rejected"]).notNull(),
  resolvedEntityId: int("resolvedEntityId").references(() => registryEntities.id),
  rationale: text("rationale").notNull(),
  decidedByUserId: int("decidedByUserId").references(() => users.id),
  decidedAt: timestamp("decidedAt").defaultNow().notNull(),
});

export const productOffers = mysqlTable("product_offers", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
  wajenziId: varchar("wajenziId", { length: 40 }).notNull().unique(),
  supplierOrganizationEntityId: int("supplierOrganizationEntityId").notNull().references(() => registryEntities.id),
  facilityId: int("facilityId").notNull().references(() => facilities.id),
  canonicalProductEntityId: int("canonicalProductEntityId").references(() => registryEntities.id),
  canonicalVariantEntityId: int("canonicalVariantEntityId").references(() => registryEntities.id),
  supplierSku: varchar("supplierSku", { length: 255 }),
  commercialName: varchar("commercialName", { length: 500 }).notNull(),
  leadTimeHours: int("leadTimeHours"),
  minimumOrderQuantity: decimal("minimumOrderQuantity", { precision: 14, scale: 3 }),
  orderUnit: varchar("orderUnit", { length: 64 }),
  commercialTerms: json("commercialTerms"),
  status: mysqlEnum("status", ["draft", "active", "suspended", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("product_offer_product_idx").on(table.canonicalProductEntityId), index("product_offer_variant_idx").on(table.canonicalVariantEntityId), index("product_offer_supplier_idx").on(table.supplierOrganizationEntityId)]);

export const priceObservations = mysqlTable("price_observations", {
  id: int("id").autoincrement().primaryKey(),
  offerId: int("offerId").notNull().references(() => productOffers.id),
  amount: decimal("amount", { precision: 16, scale: 2 }).notNull(),
  currencyCode: varchar("currencyCode", { length: 3 }).notNull(),
  unitOfMeasure: varchar("unitOfMeasure", { length: 64 }).notNull(),
  taxBasis: mysqlEnum("taxBasis", ["inclusive", "exclusive", "unknown"]).default("unknown").notNull(),
  normalizedAmount: decimal("normalizedAmount", { precision: 16, scale: 4 }),
  normalizedUnit: varchar("normalizedUnit", { length: 64 }),
  normalizationMethod: varchar("normalizationMethod", { length: 255 }),
  observedAt: timestamp("observedAt").defaultNow().notNull(),
  validUntil: timestamp("validUntil"),
  verificationStatus: mysqlEnum("verificationStatus", ["unverified", "pending", "verified", "expired", "rejected"]).default("unverified").notNull(),
  evidenceId: int("evidenceId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("price_observation_offer_time_idx").on(table.offerId, table.observedAt)]);

export const availabilityObservations = mysqlTable("availability_observations", {
  id: int("id").autoincrement().primaryKey(),
  offerId: int("offerId").notNull().references(() => productOffers.id),
  quantity: decimal("quantity", { precision: 16, scale: 3 }),
  unitOfMeasure: varchar("unitOfMeasure", { length: 64 }).notNull(),
  availabilityState: mysqlEnum("availabilityState", ["available", "reserved", "allocated", "in_transit", "damaged", "unavailable"]).notNull(),
  observedAt: timestamp("observedAt").defaultNow().notNull(),
  freshnessUntil: timestamp("freshnessUntil"),
  verificationStatus: mysqlEnum("verificationStatus", ["unverified", "pending", "verified", "expired", "rejected"]).default("unverified").notNull(),
  verifiedAt: timestamp("verifiedAt"),
  evidenceId: int("evidenceId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("availability_observation_offer_time_idx").on(table.offerId, table.observedAt)]);

export const fileAssets = mysqlTable("file_assets", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
  wajenziId: varchar("wajenziId", { length: 40 }).notNull().unique(),
  storageKey: varchar("storageKey", { length: 500 }).notNull().unique(),
  storageUrl: varchar("storageUrl", { length: 1000 }).notNull(),
  originalFilename: varchar("originalFilename", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 255 }).notNull(),
  byteSize: bigint("byteSize", { mode: "number" }).notNull(),
  assetKind: mysqlEnum("assetKind", ["supplier_catalogue", "product_image", "datasheet", "certificate", "csv_import", "verification_evidence", "other"]).notNull(),
  uploadedByUserId: int("uploadedByUserId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const evidence = mysqlTable("evidence", {
  id: int("id").autoincrement().primaryKey(),
  entityId: int("entityId").notNull().references(() => registryEntities.id),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
  fileAssetId: int("fileAssetId").references(() => fileAssets.id),
  evidenceType: varchar("evidenceType", { length: 120 }).notNull(),
  statement: text("statement"),
  sourceSystem: varchar("sourceSystem", { length: 120 }),
  capturedAt: timestamp("capturedAt"),
  expiresAt: timestamp("expiresAt"),
  verificationStatus: mysqlEnum("verificationStatus", ["unverified", "pending", "verified", "expired", "rejected"]).default("unverified").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const evidenceLinks = mysqlTable("evidence_links", {
  id: int("id").autoincrement().primaryKey(),
  evidenceId: int("evidenceId").notNull().references(() => evidence.id),
  subjectEntityId: int("subjectEntityId").notNull().references(() => registryEntities.id),
  assertionType: varchar("assertionType", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("evidence_link_unique").on(table.evidenceId, table.subjectEntityId, table.assertionType)]);

export const auditEvents = mysqlTable("audit_events", {
  id: int("id").autoincrement().primaryKey(),
  wajenziId: varchar("wajenziId", { length: 40 }).notNull().unique(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
  actorUserId: int("actorUserId").references(() => users.id),
  eventType: varchar("eventType", { length: 160 }).notNull(),
  subjectEntityId: int("subjectEntityId").references(() => registryEntities.id),
  relatedEntityIds: json("relatedEntityIds"),
  beforeState: json("beforeState"),
  afterState: json("afterState"),
  rationale: text("rationale"),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
}, table => [index("audit_event_workspace_time_idx").on(table.workspaceId, table.occurredAt), index("audit_event_subject_idx").on(table.subjectEntityId)]);

export const agentRuns = mysqlTable("agent_runs", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
  wajenziId: varchar("wajenziId", { length: 40 }).notNull().unique(),
  agentKey: mysqlEnum("agentKey", ["orchestrator", "product_intelligence", "procurement", "evidence_quality"]).notNull(),
  status: mysqlEnum("status", ["completed", "failed", "requires_approval"]).notNull(),
  inputPayload: json("inputPayload").notNull(),
  outputPayload: json("outputPayload"),
  model: varchar("model", { length: 160 }),
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  createdByUserId: int("createdByUserId").references(() => users.id),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("agent_run_workspace_time_idx").on(table.workspaceId, table.createdAt), index("agent_run_agent_status_idx").on(table.agentKey, table.status)]);

export const agentProposals = mysqlTable("agent_proposals", {
  id: int("id").autoincrement().primaryKey(),
  agentRunId: int("agentRunId").notNull().references(() => agentRuns.id),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
  wajenziId: varchar("wajenziId", { length: 40 }).notNull().unique(),
  proposalType: mysqlEnum("proposalType", ["canonicalization", "procurement_recommendation", "evidence_gap", "workflow_plan"]).notNull(),
  subjectEntityId: int("subjectEntityId").references(() => registryEntities.id),
  supplierSubmissionId: int("supplierSubmissionId").references(() => supplierSubmissions.id),
  status: mysqlEnum("status", ["draft", "pending_approval", "approved", "rejected", "superseded"]).default("draft").notNull(),
  content: json("content").notNull(),
  approvalRationale: text("approvalRationale"),
  decidedByUserId: int("decidedByUserId").references(() => users.id),
  decidedAt: timestamp("decidedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("agent_proposal_workspace_status_idx").on(table.workspaceId, table.status), index("agent_proposal_run_idx").on(table.agentRunId)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
