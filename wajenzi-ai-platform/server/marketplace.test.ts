import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function publicContext(): TrpcContext {
  return { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("marketplace.dashboard", () => {
  it("returns the dashboard summary for the requested workspace", async () => {
    const caller = appRouter.createCaller(publicContext());
    const snapshot = await caller.marketplace.dashboard({ workspace: "logistics" });
    expect(snapshot.workspace).toBe("logistics");
    expect(snapshot.metrics).toHaveLength(3);
    expect(snapshot.attention.length).toBeGreaterThan(0);
  });

  it("supports the finance-and-risk workspace in the ten-dashboard suite", async () => {
    const caller = appRouter.createCaller(publicContext());
    const snapshot = await caller.marketplace.dashboard({ workspace: "finance" });
    expect(snapshot.workspace).toBe("finance");
    expect(snapshot.label).toBe("Finance & Risk");
  });

  it("protects workflow persistence and AI artifact generation from anonymous requests", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.workflow.record({ workspace: "contractor", actionType: "rfq_sent", resourceRef: "RFQ-1", status: "completed" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.ai.generateArtifacts({ assistantText: "Source concrete materials.", projectContext: "Nairobi residential project" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
