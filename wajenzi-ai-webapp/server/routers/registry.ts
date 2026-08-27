import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createCommercialOffer, createSupplierSubmission, getDashboard, listCatalogue, listCommercialRecords, recordAvailabilityObservation, recordPriceObservation, resolveSupplierSubmission } from "../registryService";

function serviceError(error: unknown) {
  return new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Registry operation failed." });
}

export const registryRouter = router({
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    try { return await getDashboard(ctx.user); } catch (error) { throw serviceError(error); }
  }),
  catalogue: protectedProcedure.input(z.object({ search: z.string().max(200).optional() })).query(async ({ ctx, input }) => {
    try { return await listCatalogue(ctx.user, input.search); } catch (error) { throw serviceError(error); }
  }),
  submitSupplierProduct: protectedProcedure.input(z.object({ supplierOrganizationEntityId: z.number().int().positive(), submittedName: z.string().min(2).max(500), supplierSku: z.string().max(255).optional(), attributes: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ ctx, input }) => {
    try { return await createSupplierSubmission(ctx.user, input); } catch (error) { throw serviceError(error); }
  }),
  resolveSupplierSubmission: protectedProcedure.input(z.object({ submissionId: z.number().int().positive(), outcome: z.enum(["matched_existing_product", "new_canonical_product", "rejected"]), canonicalName: z.string().max(500).optional(), rationale: z.string().min(4).max(4000) })).mutation(async ({ ctx, input }) => {
    try { return await resolveSupplierSubmission(ctx.user, input); } catch (error) { throw serviceError(error); }
  }),
  commercialRecords: protectedProcedure.query(async ({ ctx }) => {
    try { return await listCommercialRecords(ctx.user); } catch (error) { throw serviceError(error); }
  }),
  createCommercialOffer: protectedProcedure.input(z.object({
    supplierOrganizationEntityId: z.number().int().positive(), facilityId: z.number().int().positive(), canonicalProductWajenziId: z.string().regex(/^WJZ-PRD-[A-F0-9]{14}$/), commercialName: z.string().min(2).max(500), supplierSku: z.string().max(255).optional(), leadTimeHours: z.number().int().min(0).max(24 * 365).optional(), minimumOrderQuantity: z.number().positive().max(100000000).optional(), orderUnit: z.string().min(1).max(64).optional(),
  })).mutation(async ({ ctx, input }) => {
    try { return await createCommercialOffer(ctx.user, input); } catch (error) { throw serviceError(error); }
  }),
  recordPriceObservation: protectedProcedure.input(z.object({
    offerWajenziId: z.string().regex(/^WJZ-OFR-[A-F0-9]{14}$/), amount: z.number().positive().max(1000000000), currencyCode: z.string().length(3).transform(value => value.toUpperCase()), unitOfMeasure: z.string().min(1).max(64), taxBasis: z.enum(["inclusive", "exclusive", "unknown"]), normalizedAmount: z.number().positive().max(1000000000).optional(), normalizedUnit: z.string().min(1).max(64).optional(), normalizationMethod: z.string().min(2).max(255).optional(), observedAt: z.coerce.date(), validUntil: z.coerce.date().optional(), evidenceFileWajenziId: z.string().regex(/^WJZ-DOC-[A-F0-9]{14}$/),
  }).refine(value => !value.validUntil || value.validUntil > value.observedAt, { message: "Price validity must end after the observed time.", path: ["validUntil"] })).mutation(async ({ ctx, input }) => {
    try { return await recordPriceObservation(ctx.user, input); } catch (error) { throw serviceError(error); }
  }),
  recordAvailabilityObservation: protectedProcedure.input(z.object({
    offerWajenziId: z.string().regex(/^WJZ-OFR-[A-F0-9]{14}$/), quantity: z.number().nonnegative().max(1000000000).optional(), unitOfMeasure: z.string().min(1).max(64), availabilityState: z.enum(["available", "reserved", "allocated", "in_transit", "damaged", "unavailable"]), observedAt: z.coerce.date(), freshnessUntil: z.coerce.date().optional(), evidenceFileWajenziId: z.string().regex(/^WJZ-DOC-[A-F0-9]{14}$/),
  }).refine(value => !value.freshnessUntil || value.freshnessUntil > value.observedAt, { message: "Availability freshness must end after the observed time.", path: ["freshnessUntil"] })).mutation(async ({ ctx, input }) => {
    try { return await recordAvailabilityObservation(ctx.user, input); } catch (error) { throw serviceError(error); }
  }),
});
