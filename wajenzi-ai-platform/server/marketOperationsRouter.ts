import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  addCartItem,
  addSavedItem,
  appendProjectEvent,
  assertOrgMember,
  assertProjectMember,
  createProjectAsset,
  createProjectOperation,
  createProjectSite,
  createPurchaseOrder,
  createSavedList,
  createSupplierFacility,
  createSupplierQuote,
  createRfq,
  getOrCreateCart,
  listOrderEvents,
  listProjectAssets,
  listProjectEvents,
  listProjectSites,
  listPurchaseOrders,
  listRfqs,
  listSavedLists,
  listSupplierFacilities,
  listSupplierReviews,
  recordMarketplaceSearch,
  updatePurchaseOrderStatus,
  upsertSupplierReliability,
} from "./marketOperationsDb";

const optionalDate = z.coerce.date().optional();
const item = z.object({ description: z.string().trim().min(2).max(500), quantity: z.number().int().positive().max(1_000_000), unit: z.string().trim().max(40).optional(), productCatalogItemId: z.number().int().positive().optional(), supplierProductId: z.number().int().positive().optional(), canonicalProductId: z.number().int().positive().optional(), requiredBy: optionalDate });

export const marketOperationsRouter = router({
  recordSearch: protectedProcedure.input(z.object({ query: z.string().trim().max(180).optional(), filters: z.record(z.string(), z.unknown()).optional(), resultCount: z.number().int().nonnegative(), selectedProductId: z.number().int().positive().optional() })).mutation(({ ctx, input }) => recordMarketplaceSearch({ ownerUserId: ctx.user.id, ...input })),
  savedLists: protectedProcedure.query(({ ctx }) => listSavedLists(ctx.user.id)),
  createSavedList: protectedProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), name: z.string().trim().min(2).max(180) })).mutation(({ ctx, input }) => createSavedList({ ownerUserId: ctx.user.id, ...input })),
  addSavedItem: protectedProcedure.input(z.object({ listId: z.number().int().positive(), productCatalogItemId: z.number().int().positive().optional(), supplierProductId: z.number().int().positive().optional(), canonicalProductId: z.number().int().positive().optional(), notes: z.string().trim().max(1000).optional() })).mutation(({ ctx, input }) => addSavedItem({ ownerUserId: ctx.user.id, ...input })),
  getCart: protectedProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), projectId: z.number().int().positive().optional(), deliveryLocation: z.string().trim().max(255).optional() })).query(({ ctx, input }) => getOrCreateCart({ ownerUserId: ctx.user.id, ...input })),
  addCartItem: protectedProcedure.input(z.object({ cartId: z.number().int().positive(), productCatalogItemId: z.number().int().positive().optional(), supplierProductId: z.number().int().positive().optional(), canonicalProductId: z.number().int().positive().optional(), quantity: z.number().int().positive().max(1_000_000), requiredBy: optionalDate, sourceSnapshot: z.record(z.string(), z.unknown()).optional() })).mutation(({ ctx, input }) => addCartItem({ ownerUserId: ctx.user.id, ...input })),
  createRfq: protectedProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), projectId: z.number().int().positive().optional(), title: z.string().trim().min(2).max(220), deliveryLocation: z.string().trim().max(255).optional(), needBy: optionalDate, items: z.array(item).min(1).max(200) })).mutation(async ({ ctx, input }) => {
    if (input.organizationId) await assertOrgMember(ctx.user.id, input.organizationId, "procurement.create");
    if (input.projectId) {
      if (!input.organizationId) throw new TRPCError({ code: "BAD_REQUEST", message: "An organization is required when attaching an RFQ to a project." });
      await assertProjectMember(ctx.user.id, input.projectId, input.organizationId);
    }
    return createRfq({ ownerUserId: ctx.user.id, ...input });
  }),
  rfqs: protectedProcedure.query(({ ctx }) => listRfqs(ctx.user.id)),
  submitSupplierQuote: protectedProcedure.input(z.object({ rfqId: z.number().int().positive(), supplierOrganizationId: z.number().int().positive(), subtotalKes: z.number().int().nonnegative(), deliveryKes: z.number().int().nonnegative(), leadTimeDays: z.number().int().nonnegative().max(365).optional(), deliveryPromise: z.string().trim().max(255).optional(), validUntil: optionalDate, evidence: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ ctx, input }) => {
    await assertOrgMember(ctx.user.id, input.supplierOrganizationId, "procurement.create");
    return createSupplierQuote({ supplierUserId: ctx.user.id, ...input });
  }),
  createPurchaseOrder: protectedProcedure.input(z.object({ quoteId: z.number().int().positive(), rfqId: z.number().int().positive(), organizationId: z.number().int().positive().optional(), projectId: z.number().int().positive().optional(), subtotalKes: z.number().int().nonnegative(), deliveryKes: z.number().int().nonnegative() })).mutation(async ({ ctx, input }) => {
    if (input.organizationId) await assertOrgMember(ctx.user.id, input.organizationId, "procurement.create");
    if (input.projectId) {
      if (!input.organizationId) throw new TRPCError({ code: "BAD_REQUEST", message: "An organization is required when attaching an order to a project." });
      await assertProjectMember(ctx.user.id, input.projectId, input.organizationId);
    }
    return createPurchaseOrder({ ownerUserId: ctx.user.id, ...input });
  }),
  purchaseOrders: protectedProcedure.query(({ ctx }) => listPurchaseOrders(ctx.user.id)),
  updatePurchaseOrderStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["approved", "submitted", "fulfilling", "delivered", "invoiced", "cancelled"]) })).mutation(({ ctx, input }) => updatePurchaseOrderStatus(input.id, ctx.user.id, input.status).then(() => ({ success: true as const }))),
  orderEvents: protectedProcedure.input(z.object({ purchaseOrderId: z.number().int().positive() })).query(({ ctx, input }) => listOrderEvents(input.purchaseOrderId, ctx.user.id)),
  supplierFacilities: protectedProcedure.input(z.object({ organizationId: z.number().int().positive() })).query(async ({ ctx, input }) => { await assertOrgMember(ctx.user.id, input.organizationId); return listSupplierFacilities(input.organizationId); }),
  createSupplierFacility: protectedProcedure.input(z.object({ organizationId: z.number().int().positive(), name: z.string().trim().min(2).max(180), location: z.string().trim().min(2).max(255), deliveryZones: z.array(z.string().trim().min(1).max(100)).max(100).optional(), businessHours: z.record(z.string(), z.string()).optional(), paymentTerms: z.string().trim().max(180).optional() })).mutation(async ({ ctx, input }) => { await assertOrgMember(ctx.user.id, input.organizationId, "project.manage"); return createSupplierFacility({ supplierOrganizationId: input.organizationId, ...input }); }),
  supplierReviews: protectedProcedure.input(z.object({ supplierOrganizationId: z.number().int().positive() })).query(async ({ ctx, input }) => { await assertOrgMember(ctx.user.id, input.supplierOrganizationId); return listSupplierReviews(input.supplierOrganizationId); }),
  upsertSupplierReliability: protectedProcedure.input(z.object({ organizationId: z.number().int().positive(), fulfilmentRate: z.number().int().min(0).max(100), onTimeRate: z.number().int().min(0).max(100), responseRate: z.number().int().min(0).max(100), disputeRate: z.number().int().min(0).max(100), completedOrders: z.number().int().nonnegative(), evidence: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ ctx, input }) => { await assertOrgMember(ctx.user.id, input.organizationId, "supplier.verify"); await upsertSupplierReliability({ supplierOrganizationId: input.organizationId, ...input }); return { success: true as const }; }),
  projectOperations: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), organizationId: z.number().int().positive() })).query(async ({ ctx, input }) => { await assertProjectMember(ctx.user.id, input.projectId, input.organizationId); return { sites: await listProjectSites(input.projectId, input.organizationId), assets: await listProjectAssets(input.projectId, input.organizationId), events: await listProjectEvents(input.projectId, input.organizationId) }; }),
  saveProjectOperation: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), organizationId: z.number().int().positive(), projectType: z.string().trim().max(120).optional(), scope: z.string().trim().max(5000).optional(), stage: z.string().trim().max(100).optional(), timelineStart: optionalDate, timelineEnd: optionalDate, ownerUserId: z.number().int().positive().optional(), contractorOrganizationId: z.number().int().positive().optional(), forecastKes: z.number().int().nonnegative().optional(), actualSpendKes: z.number().int().nonnegative().optional(), cashFlow: z.unknown().optional() })).mutation(async ({ ctx, input }) => { await assertProjectMember(ctx.user.id, input.projectId, input.organizationId); await createProjectOperation(input); await appendProjectEvent({ projectId: input.projectId, organizationId: input.organizationId, actorUserId: ctx.user.id, eventType: "PROJECT_OPERATION_UPDATED", entityType: "project", entityId: String(input.projectId), nextState: input }); return { success: true as const }; }),
  createProjectSite: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), organizationId: z.number().int().positive(), name: z.string().trim().min(2).max(180), address: z.string().trim().max(255).optional(), latitude: z.string().trim().max(40).optional(), longitude: z.string().trim().max(40).optional(), metadata: z.unknown().optional() })).mutation(async ({ ctx, input }) => { await assertProjectMember(ctx.user.id, input.projectId, input.organizationId); const id = await createProjectSite(input); await appendProjectEvent({ projectId: input.projectId, organizationId: input.organizationId, actorUserId: ctx.user.id, eventType: "PROJECT_SITE_CREATED", entityType: "site", entityId: String(id), nextState: input }); return { id }; }),
  createProjectAsset: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), organizationId: z.number().int().positive(), siteId: z.number().int().positive().optional(), assetType: z.enum(["building", "team_member", "document", "drawing", "boq", "task", "risk", "cost", "site_record", "inspection", "issue", "delivery", "photo", "approval"]), title: z.string().trim().min(2).max(220), description: z.string().trim().max(5000).optional(), status: z.string().trim().max(80).optional(), assignedToUserId: z.number().int().positive().optional(), dueDate: optionalDate, amountKes: z.number().int().nonnegative().optional(), linkedRecordId: z.string().trim().max(120).optional(), fileId: z.number().int().positive().optional(), metadata: z.unknown().optional() })).mutation(async ({ ctx, input }) => { await assertProjectMember(ctx.user.id, input.projectId, input.organizationId); const id = await createProjectAsset({ createdByUserId: ctx.user.id, ...input }); await appendProjectEvent({ projectId: input.projectId, organizationId: input.organizationId, actorUserId: ctx.user.id, eventType: "PROJECT_ASSET_CREATED", entityType: input.assetType, entityId: String(id), nextState: input }); return { id }; }),
  appendProjectEvent: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), organizationId: z.number().int().positive(), eventType: z.string().trim().min(2).max(100), entityType: z.string().trim().min(2).max(80), entityId: z.string().trim().min(1).max(120), previousState: z.unknown().optional(), nextState: z.unknown().optional(), evidence: z.unknown().optional() })).mutation(async ({ ctx, input }) => { await assertProjectMember(ctx.user.id, input.projectId, input.organizationId); const id = await appendProjectEvent({ actorUserId: ctx.user.id, ...input }); return { id }; }),
});
