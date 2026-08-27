import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { listLocations, searchProcurement, updateSiteCoordinates } from "../registryService";

function serviceError(error: unknown) {
  return new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Procurement operation failed." });
}

export const procurementRouter = router({
  locations: protectedProcedure.query(async ({ ctx }) => {
    try { return await listLocations(ctx.user); } catch (error) { throw serviceError(error); }
  }),
  updateSiteCoordinates: protectedProcedure.input(z.object({ siteId: z.number().int().positive(), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), address: z.string().max(1000).optional() })).mutation(async ({ ctx, input }) => {
    try { return await updateSiteCoordinates(ctx.user, input); } catch (error) { throw serviceError(error); }
  }),
  search: protectedProcedure.input(z.object({ projectEntityId: z.number().int().positive(), productQuery: z.string().min(2).max(200), radiusKm: z.number().min(1).max(500).default(50), freshnessHours: z.number().min(1).max(720).default(24) })).query(async ({ ctx, input }) => {
    try { return await searchProcurement(ctx.user, input); } catch (error) { throw serviceError(error); }
  }),
});
