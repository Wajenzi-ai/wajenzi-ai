import { and, desc, eq } from "drizzle-orm";
import {
  marketplaceCartItems,
  marketplaceCarts,
  marketplaceOrderTrackingEvents,
  marketplacePurchaseOrders,
  marketplaceQuotes,
  marketplaceRfqItems,
  marketplaceRfqRequests,
  marketplaceSavedItems,
  marketplaceSavedLists,
  marketplaceSearchEvents,
  projectAssets,
  projectEventLog,
  projectOperations,
  projectSites,
  supplierFacilities,
  supplierReliabilityMetrics,
  supplierVerifiedReviews,
} from "../drizzle/schema";
import { getActiveProjectMembership, getDb, getOrganizationMembership, membershipAllows } from "./db";

function insertedId(result: unknown) {
  const row = (result as Array<{ insertId?: number }>)[0];
  const id = Number(row?.insertId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("The record could not be created.");
  return id;
}

export async function recordMarketplaceSearch(values: { ownerUserId: number; query?: string | null; filters?: Record<string, unknown> | null; resultCount: number; selectedProductId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for search analytics.");
  return insertedId(await db.insert(marketplaceSearchEvents).values({ ...values, query: values.query ?? null, filters: values.filters ?? null, selectedProductId: values.selectedProductId ?? null }));
}

export async function createSavedList(values: { ownerUserId: number; organizationId?: number | null; name: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for saved lists.");
  return insertedId(await db.insert(marketplaceSavedLists).values({ ...values, organizationId: values.organizationId ?? null }));
}

export async function listSavedLists(ownerUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(marketplaceSavedLists).where(and(eq(marketplaceSavedLists.ownerUserId, ownerUserId), eq(marketplaceSavedLists.status, "active"))).orderBy(desc(marketplaceSavedLists.updatedAt));
}

export async function addSavedItem(values: { listId: number; ownerUserId: number; productCatalogItemId?: number | null; supplierProductId?: number | null; canonicalProductId?: number | null; notes?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for saved items.");
  const list = (await db.select().from(marketplaceSavedLists).where(and(eq(marketplaceSavedLists.id, values.listId), eq(marketplaceSavedLists.ownerUserId, values.ownerUserId))).limit(1))[0];
  if (!list) throw new Error("Saved list not found.");
  return insertedId(await db.insert(marketplaceSavedItems).values({ ...values, productCatalogItemId: values.productCatalogItemId ?? null, supplierProductId: values.supplierProductId ?? null, canonicalProductId: values.canonicalProductId ?? null, notes: values.notes ?? null }));
}

export async function getOrCreateCart(values: { ownerUserId: number; organizationId?: number | null; projectId?: number | null; deliveryLocation?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for carts.");
  const existing = (await db.select().from(marketplaceCarts).where(and(eq(marketplaceCarts.ownerUserId, values.ownerUserId), eq(marketplaceCarts.status, "open"))).limit(1))[0];
  if (existing) return existing;
  const id = insertedId(await db.insert(marketplaceCarts).values({ ...values, organizationId: values.organizationId ?? null, projectId: values.projectId ?? null, deliveryLocation: values.deliveryLocation ?? null, status: "open" }));
  return (await db.select().from(marketplaceCarts).where(eq(marketplaceCarts.id, id)).limit(1))[0];
}

export async function addCartItem(values: { cartId: number; ownerUserId: number; productCatalogItemId?: number | null; supplierProductId?: number | null; canonicalProductId?: number | null; quantity: number; requiredBy?: Date | null; sourceSnapshot?: Record<string, unknown> | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for cart items.");
  const cart = (await db.select().from(marketplaceCarts).where(and(eq(marketplaceCarts.id, values.cartId), eq(marketplaceCarts.ownerUserId, values.ownerUserId), eq(marketplaceCarts.status, "open"))).limit(1))[0];
  if (!cart) throw new Error("Open cart not found.");
  return insertedId(await db.insert(marketplaceCartItems).values({ ...values, productCatalogItemId: values.productCatalogItemId ?? null, supplierProductId: values.supplierProductId ?? null, canonicalProductId: values.canonicalProductId ?? null, sourceSnapshot: values.sourceSnapshot ?? null }));
}

export async function createRfq(values: { ownerUserId: number; organizationId?: number | null; projectId?: number | null; title: string; deliveryLocation?: string | null; needBy?: Date | null; items: Array<{ description: string; quantity: number; unit?: string | null; productCatalogItemId?: number | null; supplierProductId?: number | null; canonicalProductId?: number | null; requiredBy?: Date | null }> }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for RFQs.");
  const rfqId = insertedId(await db.insert(marketplaceRfqRequests).values({ ownerUserId: values.ownerUserId, organizationId: values.organizationId ?? null, projectId: values.projectId ?? null, title: values.title, deliveryLocation: values.deliveryLocation ?? null, needBy: values.needBy ?? null, status: "draft" }));
  if (values.items.length) await db.insert(marketplaceRfqItems).values(values.items.map((item) => ({ rfqId, ownerUserId: values.ownerUserId, ...item, unit: item.unit ?? null, productCatalogItemId: item.productCatalogItemId ?? null, supplierProductId: item.supplierProductId ?? null, canonicalProductId: item.canonicalProductId ?? null, requiredBy: item.requiredBy ?? null })));
  return rfqId;
}

export async function listRfqs(ownerUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(marketplaceRfqRequests).where(eq(marketplaceRfqRequests.ownerUserId, ownerUserId)).orderBy(desc(marketplaceRfqRequests.updatedAt));
}

export async function createSupplierQuote(values: { rfqId: number; supplierOrganizationId: number; supplierUserId: number; subtotalKes: number; deliveryKes: number; leadTimeDays?: number | null; deliveryPromise?: string | null; validUntil?: Date | null; evidence?: Record<string, unknown> | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for supplier quotes.");
  const rfq = (await db.select().from(marketplaceRfqRequests).where(eq(marketplaceRfqRequests.id, values.rfqId)).limit(1))[0];
  if (!rfq) throw new Error("RFQ not found.");
  const totalKes = values.subtotalKes + values.deliveryKes;
  const quoteId = insertedId(await db.insert(marketplaceQuotes).values({ ...values, totalKes, status: "submitted", deliveryKes: values.deliveryKes, subtotalKes: values.subtotalKes, leadTimeDays: values.leadTimeDays ?? null, deliveryPromise: values.deliveryPromise ?? null, validUntil: values.validUntil ?? null, evidence: values.evidence ?? null }));
  await db.update(marketplaceRfqRequests).set({ status: "quoted" }).where(eq(marketplaceRfqRequests.id, values.rfqId));
  return quoteId;
}

export async function createPurchaseOrder(values: { quoteId: number; rfqId: number; ownerUserId: number; organizationId?: number | null; projectId?: number | null; subtotalKes: number; deliveryKes: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for purchase orders.");
  const reference = `WJ-PO-${Date.now()}-${values.ownerUserId}`;
  const totalKes = values.subtotalKes + values.deliveryKes;
  const id = insertedId(await db.insert(marketplacePurchaseOrders).values({ ...values, organizationId: values.organizationId ?? null, projectId: values.projectId ?? null, reference, totalKes, status: "pending_approval" }));
  await db.insert(marketplaceOrderTrackingEvents).values({ purchaseOrderId: id, ownerUserId: values.ownerUserId, status: "pending_approval", location: null, note: "Purchase order created and awaiting approval.", evidenceFileId: null });
  return id;
}

export async function listPurchaseOrders(ownerUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(marketplacePurchaseOrders).where(eq(marketplacePurchaseOrders.ownerUserId, ownerUserId)).orderBy(desc(marketplacePurchaseOrders.updatedAt));
}

export async function updatePurchaseOrderStatus(id: number, ownerUserId: number, status: "approved" | "submitted" | "fulfilling" | "delivered" | "invoiced" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for purchase-order updates.");
  const current = (await db.select().from(marketplacePurchaseOrders).where(and(eq(marketplacePurchaseOrders.id, id), eq(marketplacePurchaseOrders.ownerUserId, ownerUserId))).limit(1))[0];
  if (!current) throw new Error("Purchase order not found.");
  await db.update(marketplacePurchaseOrders).set({ status, approvedByUserId: status === "approved" ? ownerUserId : current.approvedByUserId, approvedAt: status === "approved" ? new Date() : current.approvedAt }).where(eq(marketplacePurchaseOrders.id, id));
  await db.insert(marketplaceOrderTrackingEvents).values({ purchaseOrderId: id, ownerUserId, status, location: null, note: `Order status changed to ${status}.`, evidenceFileId: null });
}

export async function createSupplierFacility(values: { supplierOrganizationId: number; name: string; location: string; deliveryZones?: string[] | null; businessHours?: Record<string, string> | null; paymentTerms?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for supplier facilities.");
  return insertedId(await db.insert(supplierFacilities).values({ ...values, deliveryZones: values.deliveryZones ?? null, businessHours: values.businessHours ?? null, paymentTerms: values.paymentTerms ?? null, status: "draft" }));
}

export async function listSupplierFacilities(supplierOrganizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supplierFacilities).where(eq(supplierFacilities.supplierOrganizationId, supplierOrganizationId)).orderBy(desc(supplierFacilities.updatedAt));
}

export async function upsertSupplierReliability(values: { supplierOrganizationId: number; fulfilmentRate: number; onTimeRate: number; responseRate: number; disputeRate: number; completedOrders: number; evidence?: Record<string, unknown> | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for reliability metrics.");
  await db.insert(supplierReliabilityMetrics).values({ ...values, evidence: values.evidence ?? null }).onDuplicateKeyUpdate({ set: { fulfilmentRate: values.fulfilmentRate, onTimeRate: values.onTimeRate, responseRate: values.responseRate, disputeRate: values.disputeRate, completedOrders: values.completedOrders, evidence: values.evidence ?? null, calculatedAt: new Date() } });
}

export async function listSupplierReviews(supplierOrganizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supplierVerifiedReviews).where(and(eq(supplierVerifiedReviews.supplierOrganizationId, supplierOrganizationId), eq(supplierVerifiedReviews.status, "published"))).orderBy(desc(supplierVerifiedReviews.createdAt));
}

export async function createProjectOperation(values: { projectId: number; organizationId: number; projectType?: string | null; scope?: string | null; stage?: string | null; timelineStart?: Date | null; timelineEnd?: Date | null; ownerUserId?: number | null; contractorOrganizationId?: number | null; forecastKes?: number; actualSpendKes?: number; cashFlow?: unknown }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for project operations.");
  await db.insert(projectOperations).values({ ...values, projectType: values.projectType ?? null, scope: values.scope ?? null, stage: values.stage ?? null, timelineStart: values.timelineStart ?? null, timelineEnd: values.timelineEnd ?? null, ownerUserId: values.ownerUserId ?? null, contractorOrganizationId: values.contractorOrganizationId ?? null, forecastKes: values.forecastKes ?? 0, actualSpendKes: values.actualSpendKes ?? 0, cashFlow: values.cashFlow ?? null }).onDuplicateKeyUpdate({ set: { projectType: values.projectType ?? null, scope: values.scope ?? null, stage: values.stage ?? null, timelineStart: values.timelineStart ?? null, timelineEnd: values.timelineEnd ?? null, ownerUserId: values.ownerUserId ?? null, contractorOrganizationId: values.contractorOrganizationId ?? null, forecastKes: values.forecastKes ?? 0, actualSpendKes: values.actualSpendKes ?? 0, cashFlow: values.cashFlow ?? null } });
}

export async function createProjectSite(values: { projectId: number; organizationId: number; name: string; address?: string | null; latitude?: string | null; longitude?: string | null; metadata?: unknown }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for project sites.");
  return insertedId(await db.insert(projectSites).values({ ...values, address: values.address ?? null, latitude: values.latitude ?? null, longitude: values.longitude ?? null, metadata: values.metadata ?? null, status: "planning" }));
}

export async function listProjectSites(projectId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectSites).where(and(eq(projectSites.projectId, projectId), eq(projectSites.organizationId, organizationId))).orderBy(desc(projectSites.updatedAt));
}

export async function createProjectAsset(values: { projectId: number; organizationId: number; siteId?: number | null; assetType: "building" | "team_member" | "document" | "drawing" | "boq" | "task" | "risk" | "cost" | "site_record" | "inspection" | "issue" | "delivery" | "photo" | "approval"; title: string; description?: string | null; status?: string; assignedToUserId?: number | null; dueDate?: Date | null; amountKes?: number | null; linkedRecordId?: string | null; fileId?: number | null; metadata?: unknown; createdByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for project assets.");
  return insertedId(await db.insert(projectAssets).values({ ...values, siteId: values.siteId ?? null, description: values.description ?? null, status: values.status ?? "open", assignedToUserId: values.assignedToUserId ?? null, dueDate: values.dueDate ?? null, amountKes: values.amountKes ?? null, linkedRecordId: values.linkedRecordId ?? null, fileId: values.fileId ?? null, metadata: values.metadata ?? null }));
}

export async function listProjectAssets(projectId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectAssets).where(and(eq(projectAssets.projectId, projectId), eq(projectAssets.organizationId, organizationId))).orderBy(desc(projectAssets.updatedAt));
}

export async function appendProjectEvent(values: { projectId: number; organizationId: number; actorUserId: number; eventType: string; entityType: string; entityId: string; previousState?: unknown; nextState?: unknown; evidence?: unknown }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for project events.");
  return insertedId(await db.insert(projectEventLog).values({ ...values, previousState: values.previousState ?? null, nextState: values.nextState ?? null, evidence: values.evidence ?? null }));
}

export async function listProjectEvents(projectId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectEventLog).where(and(eq(projectEventLog.projectId, projectId), eq(projectEventLog.organizationId, organizationId))).orderBy(desc(projectEventLog.createdAt));
}

export async function assertOrgMember(userId: number, organizationId: number, permission?: "project.manage" | "procurement.create" | "supplier.verify") {
  const membership = await getOrganizationMembership(userId, organizationId);
  if (!membership || (permission && !membershipAllows(membership, permission))) throw new Error("You do not have the required organization permission.");
  return membership;
}

export async function assertProjectMember(userId: number, projectId: number, organizationId: number) {
  const membership = await getActiveProjectMembership(userId, projectId, organizationId);
  if (!membership) throw new Error("You do not have an active role in this project.");
  return membership;
}

export async function listOrderEvents(purchaseOrderId: number, ownerUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(marketplaceOrderTrackingEvents).where(and(eq(marketplaceOrderTrackingEvents.purchaseOrderId, purchaseOrderId), eq(marketplaceOrderTrackingEvents.ownerUserId, ownerUserId))).orderBy(desc(marketplaceOrderTrackingEvents.createdAt));
}
