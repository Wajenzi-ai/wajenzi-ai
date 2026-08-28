import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { sdk } from "./sdk";
import { serveStatic, setupVite } from "./vite";
import { assignSemanticCanonicalDocumentId, createDocumentProcessingJob, createSemanticSourceDocument, createSupplierDocumentLineage, createSupplierProductEvent, getLatestSemanticSourceBySupplierKey, getSemanticSourceByChecksum } from "../db";
import { semanticWorkspaces, validateSemanticSource } from "../semanticExtraction";
import { storagePut } from "../storage";
import { createHash } from "crypto";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/api/semantic-sources/upload", express.raw({ type: () => true, limit: "12mb" }), async (req, res) => {
    try {
      let user;
      try { user = await sdk.authenticateRequest(req); } catch { res.status(401).json({ error: "Sign in to upload a supplier document." }); return; }
      if (!user) { res.status(401).json({ error: "Sign in to upload a supplier document." }); return; }
      const workspace = req.header("x-wajenzi-workspace");
      if (!workspace || !semanticWorkspaces.includes(workspace as (typeof semanticWorkspaces)[number])) { res.status(403).json({ error: "Semantic extraction is available only in Supplier and Manufacturer workspaces." }); return; }
      const originalName = decodeURIComponent(req.header("x-wajenzi-original-name") ?? "").trim();
      const contentType = req.header("content-type")?.split(";")[0].trim() || "application/octet-stream";
      if (!originalName || originalName.length > 255) { res.status(400).json({ error: "A valid source filename is required." }); return; }
      if (!Buffer.isBuffer(req.body)) { res.status(400).json({ error: "A raw binary source document is required." }); return; }
      validateSemanticSource(originalName, contentType, req.body);
      const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const checksumSha256 = createHash("sha256").update(req.body).digest("hex");
      const typedWorkspace = workspace as (typeof semanticWorkspaces)[number];
      const duplicate = await getSemanticSourceByChecksum(user.id, typedWorkspace, checksumSha256);
      if (duplicate) { res.status(200).json({ sourceDocumentId: duplicate.id, canonicalDocumentId: duplicate.canonicalDocumentId, originalName: duplicate.originalName, byteSize: duplicate.byteSize, duplicate: true, status: duplicate.status }); return; }
      const suppliedKey = decodeURIComponent(req.header("x-wajenzi-supplier-source-key") ?? "").trim();
      const supplierSourceKey = (suppliedKey || `file:${safeName.toLowerCase()}`).slice(0, 180);
      const predecessor = await getLatestSemanticSourceBySupplierKey(user.id, typedWorkspace, supplierSourceKey);
      const versionNumber = (predecessor?.versionNumber ?? 0) + 1;
      const { key, url } = await storagePut(`wajenzi/${user.id}/semantic-source/${Date.now()}-${safeName}`, req.body, contentType);
      const sourceDocumentId = await createSemanticSourceDocument({ ownerUserId: user.id, workspace: typedWorkspace, supplierSourceKey, parentSourceDocumentId: predecessor?.id ?? null, versionNumber, originalName, contentType, byteSize: req.body.byteLength, checksumSha256, storageKey: key, storageUrl: url, documentType: "unknown", status: "uploaded", rawText: null, documentContext: null, errorSummary: null });
      const canonicalDocumentId = await assignSemanticCanonicalDocumentId(sourceDocumentId, user.id);
      const correlationId = `doc-${sourceDocumentId}-${checksumSha256.slice(0, 12)}`;
      const processingJobId = await createDocumentProcessingJob({ sourceDocumentId, ownerUserId: user.id, correlationId, jobType: "extraction", status: "queued" });
      await createSupplierDocumentLineage({ sourceDocumentId, parentSourceDocumentId: predecessor?.id ?? null, ownerUserId: user.id, versionNumber, changeSummary: predecessor ? { previousDocumentId: predecessor.id, reason: "supplier_source_key_revision" } : { reason: "initial_source" } });
      await createSupplierProductEvent({ eventType: "DOCUMENT_UPLOADED", entityType: "source_document", entityId: canonicalDocumentId, ownerUserId: user.id, actorUserId: user.id, sourceDocumentId, correlationId, previousState: predecessor ? { documentId: predecessor.canonicalDocumentId, version: predecessor.versionNumber } : null, nextState: { documentId: canonicalDocumentId, version: versionNumber, status: "uploaded" }, evidence: { checksumSha256, originalName, processingJobId } });
      res.status(201).json({ sourceDocumentId, canonicalDocumentId, processingJobId, originalName, byteSize: req.body.byteLength, versionNumber, duplicate: false });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Supplier document upload failed." });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
