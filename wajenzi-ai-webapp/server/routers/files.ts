import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { listWorkspaceFiles, uploadWorkspaceFile } from "../registryService";

function serviceError(error: unknown) {
  return new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "File operation failed." });
}

export const filesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try { return await listWorkspaceFiles(ctx.user); } catch (error) { throw serviceError(error); }
  }),
  upload: protectedProcedure.input(z.object({ assetKind: z.enum(["supplier_catalogue", "product_image", "datasheet", "certificate", "csv_import", "verification_evidence", "other"]), originalFilename: z.string().min(1).max(500), mimeType: z.string().min(1).max(255), contentBase64: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    try { return await uploadWorkspaceFile(ctx.user, input); } catch (error) { throw serviceError(error); }
  }),
});
