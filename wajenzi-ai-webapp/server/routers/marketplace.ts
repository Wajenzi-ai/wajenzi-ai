import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { listPublicMarketplaceProducts } from "../registryService";

export const marketplaceRouter = router({
  catalogue: publicProcedure
    .input(z.object({ search: z.string().max(200).optional() }))
    .query(async ({ input }) => listPublicMarketplaceProducts(input.search)),
});
