import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const databaseMocks = vi.hoisted(() => ({
  createCatalogImport: vi.fn(),
  createFileRecord: vi.fn(),
  createWorkflowAction: vi.fn(),
  finishCatalogImport: vi.fn(),
  listCatalogItemsForAdmin: vi.fn(),
  listFilesForUser: vi.fn(),
  listMarketplaceCategories: vi.fn(),
  listMarketplaceProducts: vi.fn(),
  listRecentCatalogImports: vi.fn(),
  listWorkflowActions: vi.fn(),
  setCatalogItemStatus: vi.fn(),
  upsertCatalogItems: vi.fn(),
}));
const storageMocks = vi.hoisted(() => ({ storagePut: vi.fn() }));

vi.mock("./db", () => databaseMocks);
vi.mock("./storage", () => storageMocks);

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function context(role: AuthenticatedUser["role"] | undefined): TrpcContext {
  const user = role ? {
    id: 9,
    openId: `${role}-catalog-user`,
    name: "Catalog User",
    email: "catalog@example.com",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } : null;
  return { user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("catalog procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    databaseMocks.listMarketplaceProducts.mockResolvedValue({ items: [{ id: 1, title: "Cement 50kg" }], total: 1, page: 1, pageSize: 48, hasMore: false });
    databaseMocks.listMarketplaceCategories.mockResolvedValue([{ category: "Cement" }]);
    databaseMocks.listCatalogItemsForAdmin.mockResolvedValue([{ id: 1, title: "Cement 50kg", status: "active" }]);
  });

  it("allows public product discovery while forwarding search, category, and sort filters", async () => {
    const caller = appRouter.createCaller(context(undefined));
    await expect(caller.catalog.list({ search: "cement", category: "Cement", sort: "price_asc" })).resolves.toEqual({ items: [{ id: 1, title: "Cement 50kg" }], total: 1, page: 1, pageSize: 48, hasMore: false });
    await expect(caller.catalog.categories()).resolves.toEqual([{ category: "Cement" }]);
    expect(databaseMocks.listMarketplaceProducts).toHaveBeenCalledWith({ search: "cement", category: "Cement", sort: "price_asc", page: 1, pageSize: 48 });
  });

  it("blocks non-admin users from import management", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.catalog.adminList()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.catalog.importCsv({ originalName: "catalog.csv", contentType: "text/csv", base64: "TmFtZSxFeHRlcm5hbCBVUkwKQ2VtZW50LGh0dHBzOi8vZXhhbXBsZS5jb20=" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows administrators to update product visibility", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.catalog.setStatus({ id: 1, status: "draft" })).resolves.toEqual({ success: true });
    expect(databaseMocks.setCatalogItemStatus).toHaveBeenCalledWith(1, "draft");
  });
});
