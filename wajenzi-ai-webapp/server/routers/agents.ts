import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { agentKeys, decideAgentProposal, listAgentHistory, listAgentIntakeSources, runGovernedAgent } from "../agentService";
import { protectedProcedure, router } from "../_core/trpc";

function serviceError(error: unknown) { return new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "AI agent operation failed." }); }

export const runAgentInput = z.object({ agentKey: z.enum(agentKeys), objective: z.string().min(3).max(4000), projectEntityId: z.number().int().positive().optional(), radiusKm: z.number().min(1).max(500).optional(), freshnessHours: z.number().min(1).max(24 * 30).optional(), supplierSubmissionId: z.number().int().positive().optional(), sourceFileWajenziId: z.string().regex(/^WJZ-DOC-/).optional() }).superRefine((value, context) => { if (value.agentKey === "product_intelligence" && !value.supplierSubmissionId && !value.sourceFileWajenziId) context.addIssue({ code: "custom", message: "Product Intelligence requires a supplier submission or stored catalogue file." }); });

export const agentsRouter = router({
  run: protectedProcedure.input(runAgentInput).mutation(async ({ ctx, input }) => { try { return await runGovernedAgent(ctx.user, input); } catch (error) { throw serviceError(error); } }),
  history: protectedProcedure.query(async ({ ctx }) => { try { return await listAgentHistory(ctx.user); } catch (error) { throw serviceError(error); } }),
  intakeSources: protectedProcedure.query(async ({ ctx }) => { try { return await listAgentIntakeSources(ctx.user); } catch (error) { throw serviceError(error); } }),
  decideProposal: protectedProcedure.input(z.object({ proposalId: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), rationale: z.string().min(4).max(2000) })).mutation(async ({ ctx, input }) => { try { return await decideAgentProposal(ctx.user, input); } catch (error) { throw serviceError(error); } }),
});
