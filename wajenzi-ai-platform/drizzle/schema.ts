import { boolean, index, int, json, mediumtext, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  kind: mysqlEnum("kind", ["homeowner", "contractor", "supplier", "logistics", "finance", "platform"]).notNull(),
  status: mysqlEnum("status", ["active", "pending", "suspended"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const workspaceMemberships = mysqlTable("workspaceMemberships", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId").notNull(),
  workspaceRole: mysqlEnum("workspaceRole", ["owner", "project_manager", "buyer", "supplier_admin", "dispatcher", "finance_operator", "support_operator", "platform_admin"]).notNull(),
  permissions: json("permissions"),
  status: mysqlEnum("status", ["active", "suspended"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("memberships_user_idx").on(table.userId), index("memberships_org_idx").on(table.organizationId), index("memberships_status_idx").on(table.status), uniqueIndex("membership_user_org_role_unique").on(table.userId, table.organizationId, table.workspaceRole)]);

export const supplierProfiles = mysqlTable("supplierProfiles", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  supplierType: mysqlEnum("supplierType", ["hardware_store", "manufacturer", "distributor"]).notNull(),
  verificationStatus: mysqlEnum("verificationStatus", ["draft", "submitted", "verified", "rejected"]).default("draft").notNull(),
  score: int("score").default(0).notNull(),
  county: varchar("county", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("supplier_profile_org_idx").on(table.organizationId)]);

export const supplierVerificationPolicies = mysqlTable("supplierVerificationPolicies", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().unique(),
  minimumScore: int("minimumScore").default(70).notNull(),
  requiredEvidence: json("requiredEvidence"),
  enabled: boolean("enabled").default(true).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const supplierVerificationDecisions = mysqlTable("supplierVerificationDecisions", {
  id: int("id").autoincrement().primaryKey(),
  supplierProfileId: int("supplierProfileId").notNull().unique(),
  organizationId: int("organizationId").notNull(),
  decision: mysqlEnum("decision", ["submitted", "verified", "rejected", "needs_evidence"]).default("submitted").notNull(),
  evidence: json("evidence"),
  rationale: text("rationale"),
  decidedByUserId: int("decidedByUserId"),
  decidedAt: timestamp("decidedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("verification_decision_org_idx").on(table.organizationId), index("verification_decision_status_idx").on(table.decision)]);

export const erpSyncConnections = mysqlTable("erpSyncConnections", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  provider: varchar("provider", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["not_configured", "pending_credentials", "connected", "paused", "error"]).default("not_configured").notNull(),
  direction: mysqlEnum("direction", ["outbound", "inbound", "bidirectional"]).default("outbound").notNull(),
  resourceMapping: json("resourceMapping"),
  lastSyncAt: timestamp("lastSyncAt"),
  lastError: text("lastError"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("erp_connection_org_idx").on(table.organizationId), uniqueIndex("erp_connection_org_provider_unique").on(table.organizationId, table.provider)]);

export const erpSyncRuns = mysqlTable("erpSyncRuns", {
  id: int("id").autoincrement().primaryKey(),
  connectionId: int("connectionId").notNull(),
  status: mysqlEnum("status", ["queued", "processing", "completed", "failed", "skipped"]).default("queued").notNull(),
  direction: mysqlEnum("direction", ["outbound", "inbound", "bidirectional"]).notNull(),
  resourceType: varchar("resourceType", { length: 80 }).notNull(),
  resourceId: varchar("resourceId", { length: 120 }).notNull(),
  correlationId: varchar("correlationId", { length: 80 }).notNull().unique(),
  payloadSummary: json("payloadSummary"),
  errorSummary: text("errorSummary"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("erp_run_connection_idx").on(table.connectionId), index("erp_run_status_idx").on(table.status)]);

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  location: varchar("location", { length: 255 }),
  status: mysqlEnum("status", ["planning", "procurement", "construction", "completed", "on_hold"]).default("planning").notNull(),
  budgetKes: int("budgetKes").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("projects_org_idx").on(table.organizationId)]);

export const projectMemberships = mysqlTable("projectMemberships", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId").notNull(),
  projectRole: mysqlEnum("projectRole", ["project_owner", "project_manager", "architect", "engineer", "quantity_surveyor", "contractor", "buyer", "supplier_viewer", "finance_reviewer", "logistics_coordinator"]).notNull(),
  permissions: json("permissions"),
  status: mysqlEnum("status", ["active", "suspended"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("project_membership_project_idx").on(table.projectId), index("project_membership_user_idx").on(table.userId), index("project_membership_org_idx").on(table.organizationId), uniqueIndex("project_membership_user_project_role_unique").on(table.userId, table.projectId, table.projectRole)]);

export const productCatalogItems = mysqlTable("productCatalogItems", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").notNull(),
  sku: varchar("sku", { length: 90 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  priceKes: int("priceKes").default(0).notNull(),
  salePriceKes: int("salePriceKes"),
  availableQuantity: int("availableQuantity").default(0).notNull(),
  supplierName: varchar("supplierName", { length: 180 }),
  description: text("description"),
  imageUrl: varchar("imageUrl", { length: 600 }),
  externalUrl: varchar("externalUrl", { length: 600 }),
  buttonText: varchar("buttonText", { length: 60 }),
  importRecordId: int("importRecordId"),
  attributes: json("attributes"),
  status: mysqlEnum("status", ["active", "draft", "out_of_stock"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("catalog_supplier_idx").on(table.supplierId), index("catalog_category_idx").on(table.category), index("catalog_import_idx").on(table.importRecordId), uniqueIndex("catalog_supplier_sku_unique").on(table.supplierId, table.sku)]);

export const catalogImports = mysqlTable("catalogImports", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").notNull(),
  supplierId: int("supplierId").default(0).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull().unique(),
  storageUrl: varchar("storageUrl", { length: 600 }).notNull(),
  status: mysqlEnum("status", ["processing", "completed", "completed_with_warnings", "failed"]).default("processing").notNull(),
  totalRows: int("totalRows").default(0).notNull(),
  importedRows: int("importedRows").default(0).notNull(),
  skippedRows: int("skippedRows").default(0).notNull(),
  errorSummary: text("errorSummary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => [index("catalog_import_owner_idx").on(table.ownerUserId), index("catalog_import_created_idx").on(table.createdAt)]);

export const procurementRequests = mysqlTable("procurementRequests", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  requestedByUserId: int("requestedByUserId").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  status: mysqlEnum("status", ["draft", "rfq_sent", "quoted", "approved", "ordered", "cancelled"]).default("draft").notNull(),
  budgetKes: int("budgetKes").default(0).notNull(),
  needBy: timestamp("needBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("procurement_project_idx").on(table.projectId), index("procurement_requester_idx").on(table.requestedByUserId)]);

export const rfqs = mysqlTable("rfqs", {
  id: int("id").autoincrement().primaryKey(),
  procurementRequestId: int("procurementRequestId").notNull(),
  supplierId: int("supplierId").notNull(),
  status: mysqlEnum("status", ["sent", "responded", "accepted", "declined", "expired"]).default("sent").notNull(),
  quotedKes: int("quotedKes"),
  validUntil: timestamp("validUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("rfqs_request_idx").on(table.procurementRequestId), index("rfqs_supplier_idx").on(table.supplierId)]);

export const deliveries = mysqlTable("deliveries", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  status: mysqlEnum("status", ["scheduled", "dispatched", "in_transit", "delivered", "exception"]).default("scheduled").notNull(),
  driverName: varchar("driverName", { length: 120 }),
  vehicleLabel: varchar("vehicleLabel", { length: 120 }),
  originAddress: varchar("originAddress", { length: 255 }),
  destinationAddress: varchar("destinationAddress", { length: 255 }),
  scheduledFor: timestamp("scheduledFor"),
  deliveredAt: timestamp("deliveredAt"),
  proofFileId: int("proofFileId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("deliveries_project_idx").on(table.projectId), index("deliveries_status_idx").on(table.status)]);

export const escrowTransactions = mysqlTable("escrowTransactions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  reference: varchar("reference", { length: 90 }).notNull().unique(),
  amountKes: int("amountKes").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["mobile_money", "card", "bank_transfer"]).notNull(),
  status: mysqlEnum("status", ["funded", "delivery_confirmed", "release_pending", "released", "disputed", "refunded"]).default("funded").notNull(),
  kycState: mysqlEnum("kycState", ["clear", "review", "flagged"]).default("clear").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("escrow_project_idx").on(table.projectId), index("escrow_status_idx").on(table.status)]);

export const disputes = mysqlTable("disputes", {
  id: int("id").autoincrement().primaryKey(),
  escrowTransactionId: int("escrowTransactionId").notNull(),
  openedByUserId: int("openedByUserId").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["open", "evidence_requested", "under_review", "resolved"]).default("open").notNull(),
  summary: text("summary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("disputes_transaction_idx").on(table.escrowTransactionId), index("disputes_owner_idx").on(table.openedByUserId)]);

export const fileRecords = mysqlTable("fileRecords", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").notNull(),
  organizationId: int("organizationId"),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull().unique(),
  storageUrl: varchar("storageUrl", { length: 600 }).notNull(),
  contentType: varchar("contentType", { length: 160 }).notNull(),
  byteSize: int("byteSize").notNull(),
  purpose: mysqlEnum("purpose", ["supplier_catalog", "boq", "drawing", "compliance", "delivery_proof"]).notNull(),
  accessScope: mysqlEnum("accessScope", ["owner", "organization", "platform_review"]).default("owner").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("files_owner_idx").on(table.ownerUserId), index("files_org_idx").on(table.organizationId), index("files_purpose_idx").on(table.purpose)]);

export const agentConversations = mysqlTable("agentConversations", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").notNull(),
  projectId: int("projectId"),
  title: varchar("title", { length: 220 }).notNull(),
  context: json("context"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("conversations_owner_idx").on(table.ownerUserId), index("conversations_project_idx").on(table.projectId)]);

export const workflowActions = mysqlTable("workflowActions", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").notNull(),
  workspace: varchar("workspace", { length: 64 }).notNull(),
  actionType: varchar("actionType", { length: 100 }).notNull(),
  resourceRef: varchar("resourceRef", { length: 120 }).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "review"]).default("pending").notNull(),
  payload: json("payload"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("workflow_owner_idx").on(table.ownerUserId), index("workflow_workspace_idx").on(table.workspace), index("workflow_action_idx").on(table.actionType)]);

export const roleWorkItems = mysqlTable("roleWorkItems", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").notNull(),
  organizationId: int("organizationId"),
  projectId: int("projectId"),
  workspace: varchar("workspace", { length: 64 }).notNull(),
  workType: mysqlEnum("workType", ["project", "boq", "procurement", "document", "approval", "delivery", "finance", "registry", "task"]).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["draft", "in_progress", "review", "approved", "completed", "cancelled"]).default("draft").notNull(),
  context: json("context"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("role_work_owner_idx").on(table.ownerUserId), index("role_work_workspace_idx").on(table.workspace), index("role_work_project_idx").on(table.projectId), index("role_work_status_idx").on(table.status)]);

export const semanticSourceDocuments = mysqlTable("semanticSourceDocuments", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").notNull(),
  workspace: mysqlEnum("workspace", ["supplier", "manufacturer"]).notNull(),
  canonicalDocumentId: varchar("canonicalDocumentId", { length: 64 }).unique(),
  supplierSourceKey: varchar("supplierSourceKey", { length: 180 }),
  parentSourceDocumentId: int("parentSourceDocumentId"),
  versionNumber: int("versionNumber").default(1).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  contentType: varchar("contentType", { length: 160 }).notNull(),
  byteSize: int("byteSize").notNull(),
  checksumSha256: varchar("checksumSha256", { length: 64 }).notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull().unique(),
  storageUrl: varchar("storageUrl", { length: 600 }).notNull(),
  documentType: mysqlEnum("documentType", ["catalogue", "price_list", "quotation", "invoice", "stock_list", "unknown"]).default("unknown").notNull(),
  status: mysqlEnum("status", ["uploaded", "processing", "completed", "completed_with_review", "failed"]).default("uploaded").notNull(),
  rawText: mediumtext("rawText"),
  documentContext: json("documentContext"),
  errorSummary: text("errorSummary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("semantic_source_owner_idx").on(table.ownerUserId), index("semantic_source_workspace_idx").on(table.workspace), index("semantic_source_status_idx").on(table.status), index("semantic_source_checksum_idx").on(table.ownerUserId, table.workspace, table.checksumSha256), index("semantic_source_lineage_idx").on(table.parentSourceDocumentId), index("semantic_source_key_idx").on(table.ownerUserId, table.supplierSourceKey)]);

export const canonicalProductRegistry = mysqlTable("canonicalProductRegistry", {
  id: int("id").autoincrement().primaryKey(),
  canonicalEntityId: varchar("canonicalEntityId", { length: 120 }).notNull().unique(),
  sourceRowId: varchar("sourceRowId", { length: 120 }).notNull(),
  sourceSku: varchar("sourceSku", { length: 140 }),
  canonicalName: varchar("canonicalName", { length: 500 }).notNull(),
  category: varchar("category", { length: 160 }),
  brand: varchar("brand", { length: 180 }),
  productFamily: varchar("productFamily", { length: 220 }),
  unitOfMeasure: varchar("unitOfMeasure", { length: 40 }),
  packSize: varchar("packSize", { length: 120 }),
  sourceSystem: varchar("sourceSystem", { length: 100 }).default("wajenzi-master-catalogue-v1").notNull(),
  sourceVersion: varchar("sourceVersion", { length: 100 }).default("github-main").notNull(),
  lastSyncedAt: timestamp("lastSyncedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("canonical_source_row_unique").on(table.sourceSystem, table.sourceRowId), index("canonical_name_idx").on(table.canonicalName), index("canonical_sku_idx").on(table.sourceSku), index("canonical_category_idx").on(table.category)]);

export const canonicalProductMatches = mysqlTable("canonicalProductMatches", {
  id: int("id").autoincrement().primaryKey(),
  semanticProductId: int("semanticProductId").notNull().unique(),
  ownerUserId: int("ownerUserId").notNull(),
  canonicalProductId: int("canonicalProductId"),
  canonicalEntityId: varchar("canonicalEntityId", { length: 120 }),
  status: mysqlEnum("status", ["matched_existing", "review_required", "new_canonical_candidate", "rejected"]).default("review_required").notNull(),
  matchMethod: mysqlEnum("matchMethod", ["exact_canonical_id", "exact_sku", "exact_title", "normalized_title", "candidate", "manual", "unmatched"]).default("unmatched").notNull(),
  matchScore: int("matchScore").default(0).notNull(),
  decisionStatus: mysqlEnum("decisionStatus", ["pending", "auto_accepted", "approved", "rejected", "needs_data"]).default("pending").notNull(),
  matchReason: text("matchReason"),
  matchEvidence: json("matchEvidence"),
  reviewedByUserId: int("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("canonical_match_owner_idx").on(table.ownerUserId), index("canonical_match_target_idx").on(table.canonicalProductId), index("canonical_match_status_idx").on(table.status, table.decisionStatus)]);

export const supplierProducts = mysqlTable("supplierProducts", {
  id: int("id").autoincrement().primaryKey(),
  supplierProductCode: varchar("supplierProductCode", { length: 64 }).notNull().unique(),
  ownerUserId: int("ownerUserId").notNull(),
  semanticProductId: int("semanticProductId").notNull().unique(),
  sourceDocumentId: int("sourceDocumentId").notNull(),
  canonicalProductId: int("canonicalProductId").notNull(),
  canonicalEntityId: varchar("canonicalEntityId", { length: 120 }).notNull(),
  canonicalMatchId: int("canonicalMatchId").notNull(),
  supplierSku: varchar("supplierSku", { length: 140 }),
  supplierProductName: varchar("supplierProductName", { length: 500 }).notNull(),
  normalizedProductName: varchar("normalizedProductName", { length: 500 }).notNull(),
  packagingUnit: varchar("packagingUnit", { length: 40 }),
  location: varchar("location", { length: 180 }),
  minimumOrderQuantity: int("minimumOrderQuantity"),
  leadTimeDays: int("leadTimeDays"),
  marketplaceProductId: int("marketplaceProductId"),
  status: mysqlEnum("status", ["draft", "active", "inactive", "rejected"]).default("draft").notNull(),
  approvedByUserId: int("approvedByUserId"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("supplier_product_owner_idx").on(table.ownerUserId), index("supplier_product_canonical_idx").on(table.canonicalProductId), index("supplier_product_source_idx").on(table.sourceDocumentId), index("supplier_product_status_idx").on(table.status), index("supplier_product_marketplace_idx").on(table.marketplaceProductId)]);

export const supplierPriceObservations = mysqlTable("supplierPriceObservations", {
  id: int("id").autoincrement().primaryKey(),
  supplierProductId: int("supplierProductId").notNull(),
  ownerUserId: int("ownerUserId").notNull(),
  semanticProductId: int("semanticProductId"),
  sourceDocumentId: int("sourceDocumentId"),
  amountKes: int("amountKes").notNull(),
  currency: varchar("currency", { length: 8 }).default("KES").notNull(),
  sourceReference: varchar("sourceReference", { length: 180 }),
  observedAt: timestamp("observedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("supplier_price_product_idx").on(table.supplierProductId, table.observedAt), index("supplier_price_owner_idx").on(table.ownerUserId)]);

export const supplierStockObservations = mysqlTable("supplierStockObservations", {
  id: int("id").autoincrement().primaryKey(),
  supplierProductId: int("supplierProductId").notNull(),
  ownerUserId: int("ownerUserId").notNull(),
  semanticProductId: int("semanticProductId"),
  sourceDocumentId: int("sourceDocumentId"),
  availableQuantity: int("availableQuantity").notNull(),
  sourceReference: varchar("sourceReference", { length: 180 }),
  observedAt: timestamp("observedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("supplier_stock_product_idx").on(table.supplierProductId, table.observedAt), index("supplier_stock_owner_idx").on(table.ownerUserId)]);

export const documentProcessingJobs = mysqlTable("documentProcessingJobs", {
  id: int("id").autoincrement().primaryKey(),
  sourceDocumentId: int("sourceDocumentId").notNull(),
  ownerUserId: int("ownerUserId").notNull(),
  correlationId: varchar("correlationId", { length: 80 }).notNull().unique(),
  jobType: mysqlEnum("jobType", ["extraction", "canonical_matching", "projection"]).notNull(),
  status: mysqlEnum("status", ["queued", "processing", "completed", "completed_with_review", "failed"]).default("queued").notNull(),
  attemptCount: int("attemptCount").default(0).notNull(),
  errorSummary: text("errorSummary"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("processing_job_source_idx").on(table.sourceDocumentId), index("processing_job_owner_idx").on(table.ownerUserId), index("processing_job_status_idx").on(table.status)]);

export const supplierDocumentLineage = mysqlTable("supplierDocumentLineage", {
  id: int("id").autoincrement().primaryKey(),
  sourceDocumentId: int("sourceDocumentId").notNull().unique(),
  parentSourceDocumentId: int("parentSourceDocumentId"),
  ownerUserId: int("ownerUserId").notNull(),
  versionNumber: int("versionNumber").default(1).notNull(),
  changeSummary: json("changeSummary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("document_lineage_owner_idx").on(table.ownerUserId), index("document_lineage_parent_idx").on(table.parentSourceDocumentId)]);

export const supplierProductEvents = mysqlTable("supplierProductEvents", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: varchar("entityId", { length: 120 }).notNull(),
  ownerUserId: int("ownerUserId").notNull(),
  actorUserId: int("actorUserId"),
  sourceDocumentId: int("sourceDocumentId"),
  correlationId: varchar("correlationId", { length: 80 }),
  previousState: json("previousState"),
  nextState: json("nextState"),
  evidence: json("evidence"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("supplier_event_owner_idx").on(table.ownerUserId), index("supplier_event_entity_idx").on(table.entityType, table.entityId), index("supplier_event_document_idx").on(table.sourceDocumentId), index("supplier_event_correlation_idx").on(table.correlationId)]);

export const semanticProductRecords = mysqlTable("semanticProductRecords", {
  id: int("id").autoincrement().primaryKey(),
  sourceDocumentId: int("sourceDocumentId").notNull(),
  ownerUserId: int("ownerUserId").notNull(),
  sourceReference: varchar("sourceReference", { length: 180 }).notNull(),
  supplierProductName: varchar("supplierProductName", { length: 500 }).notNull(),
  normalizedProductName: varchar("normalizedProductName", { length: 500 }).notNull(),
  supplierSku: varchar("supplierSku", { length: 140 }),
  brand: varchar("brand", { length: 180 }),
  category: varchar("category", { length: 120 }),
  productType: varchar("productType", { length: 160 }),
  sizeValue: varchar("sizeValue", { length: 80 }),
  sizeUnit: varchar("sizeUnit", { length: 24 }),
  colour: varchar("colour", { length: 80 }),
  weightValue: varchar("weightValue", { length: 80 }),
  weightUnit: varchar("weightUnit", { length: 24 }),
  dimensions: varchar("dimensions", { length: 180 }),
  packagingUnit: varchar("packagingUnit", { length: 40 }),
  stockQuantity: int("stockQuantity"),
  priceKes: int("priceKes"),
  extractionConfidence: int("extractionConfidence").notNull(),
  classificationConfidence: int("classificationConfidence").notNull(),
  status: mysqlEnum("status", ["ready", "needs_review", "failed"]).default("needs_review").notNull(),
  marketplaceProductId: int("marketplaceProductId"),
  marketplaceStatus: mysqlEnum("marketplaceStatus", ["not_published", "published", "unpublished"]).default("not_published").notNull(),
  marketplacePublishedAt: timestamp("marketplacePublishedAt"),
  marketplacePublishedByUserId: int("marketplacePublishedByUserId"),
  fieldEvidence: json("fieldEvidence"),
  classification: json("classification"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("semantic_product_document_idx").on(table.sourceDocumentId), index("semantic_product_owner_idx").on(table.ownerUserId), index("semantic_product_status_idx").on(table.status), index("semantic_product_category_idx").on(table.category), index("semantic_product_marketplace_idx").on(table.marketplaceProductId)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type InsertFileRecord = typeof fileRecords.$inferInsert;
export type InsertWorkflowAction = typeof workflowActions.$inferInsert;
export type InsertCatalogImport = typeof catalogImports.$inferInsert;
export type InsertProductCatalogItem = typeof productCatalogItems.$inferInsert;
export type InsertRoleWorkItem = typeof roleWorkItems.$inferInsert;
export type InsertSemanticSourceDocument = typeof semanticSourceDocuments.$inferInsert;
export type InsertSemanticProductRecord = typeof semanticProductRecords.$inferInsert;
