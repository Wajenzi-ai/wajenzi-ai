import "dotenv/config";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import mysql from "mysql2/promise";
import { parse } from "csv-parse/sync";

const rootsPath = process.env.WAJENZI_CANONICAL_ROOTS || "/home/ubuntu/wajenzi-foundation/canonical_products_seed.csv";
const variantsPath = process.env.WAJENZI_CANONICAL_VARIANTS || "/home/ubuntu/wajenzi-foundation/canonical_variants_seed.csv";
const sourceSystem = "wajenzi-master-catalogue-v1";
const workspaceWajenziId = "WJZ-WSP-SYSTEM-REGISTRY";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the master catalogue bootstrap.");

function stableId(prefix, seed) {
  return `WJZ-${prefix}-${createHash("sha256").update(seed).digest("hex").slice(0, 14).toUpperCase()}`;
}

function parseCsv(path) {
  return parse(readFileSync(path, "utf8"), { columns: true, skip_empty_lines: true, relax_column_count: true, trim: true });
}

function categoryDetails(rawCategory) {
  const name = (rawCategory || "Unclassified").split(",")[0].trim() || "Unclassified";
  const code = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "unclassified";
  return { code: `catalogue_${code}`.slice(0, 160), name };
}

function nullable(value) {
  return value === "" || value === undefined ? null : value;
}

const roots = parseCsv(rootsPath);
const variants = parseCsv(variantsPath);
const sourceHash = createHash("sha256").update(readFileSync(rootsPath)).digest("hex");
const db = await mysql.createConnection(process.env.DATABASE_URL);

try {
  await db.beginTransaction();
  await db.execute(
    "INSERT INTO workspaces (wajenziId, name, status, isDemo) VALUES (?, ?, 'active', false) ON DUPLICATE KEY UPDATE name = VALUES(name)",
    [workspaceWajenziId, "WAJENZI System Registry"],
  );
  const [[workspace]] = await db.query("SELECT id FROM workspaces WHERE wajenziId = ?", [workspaceWajenziId]);
  const workspaceId = workspace.id;

  const importWajenziId = stableId("IMP", `${sourceSystem}:${sourceHash}`);
  await db.execute(
    "INSERT INTO import_batches (workspaceId, wajenziId, sourceSystem, sourceHash, importType, status, receivedRows, processedRows, rejectedRows, report, completedAt) VALUES (?, ?, ?, ?, 'master_catalogue', 'processing', ?, 0, 0, ?, NULL) ON DUPLICATE KEY UPDATE status = 'processing', receivedRows = VALUES(receivedRows)",
    [workspaceId, importWajenziId, sourceSystem, sourceHash, roots.length + variants.length, JSON.stringify({ source: sourceSystem, sourceHash, script: "import-master-catalogue.mjs" })],
  );
  const [[batch]] = await db.query("SELECT id FROM import_batches WHERE wajenziId = ?", [importWajenziId]);
  const importBatchId = batch.id;

  const categoryCache = new Map();
  const rootEntityIds = new Map();
  let rootCreates = 0;
  let variantCreates = 0;

  for (const row of roots) {
    const sourceRowId = row.source_row_id;
    const wajenziId = stableId("PRD", `${sourceSystem}:root:${sourceRowId}`);
    const { code, name } = categoryDetails(row.categories);
    if (!categoryCache.has(code)) {
      await db.execute("INSERT INTO product_categories (code, name, description, status) VALUES (?, ?, ?, 'active') ON DUPLICATE KEY UPDATE name = VALUES(name)", [code, name, `Imported category from ${sourceSystem}`]);
      const [[category]] = await db.query("SELECT id FROM product_categories WHERE code = ?", [code]);
      categoryCache.set(code, category.id);
    }
    await db.execute(
      "INSERT INTO registry_entities (wajenziId, workspaceId, entityType, canonicalName, lifecycleStatus, sourceSystem, sourceRecordKey, attributes) VALUES (?, NULL, 'product', ?, 'verified', ?, ?, ?) ON DUPLICATE KEY UPDATE canonicalName = VALUES(canonicalName), lifecycleStatus = 'verified', attributes = VALUES(attributes)",
      [wajenziId, row.canonical_name, sourceSystem, sourceRowId, JSON.stringify({ sourceRowId, sourceSku: nullable(row.source_sku), sourceContentHash: row.source_content_hash, canonicalStatus: row.canonical_status })],
    );
    const [[entity]] = await db.query("SELECT id FROM registry_entities WHERE wajenziId = ?", [wajenziId]);
    rootEntityIds.set(sourceRowId, entity.id);
    const [[existingProduct]] = await db.query("SELECT id FROM products WHERE entityId = ?", [entity.id]);
    await db.execute(
      "INSERT INTO products (entityId, categoryId, productKind, brand, unitOfMeasure, packSize, material, finish, attributes, classifications, searchTerms, verificationStatus) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 'verified') ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId), brand = VALUES(brand), unitOfMeasure = VALUES(unitOfMeasure), packSize = VALUES(packSize), attributes = VALUES(attributes), classifications = VALUES(classifications), searchTerms = VALUES(searchTerms), verificationStatus = 'verified'",
      [entity.id, categoryCache.get(code), row.source_type === "variable" ? "family" : "simple", nullable(row.canonical_brand_external), nullable(row.unit_of_measure_external), nullable(row.pack_size_text_external), nullable(row.product_family_external), JSON.stringify({ sourceRowId, published: row.published, sourceInStock: row.source_in_stock, tags: row.tags }), JSON.stringify({ omniclass: nullable(row.omniclass_code), masterformat: nullable(row.masterformat_code), uniformat: nullable(row.uniformat_code), etim: nullable(row.etim_code), icms: nullable(row.icms_code) }), `${row.canonical_name} ${row.canonical_brand_external || ""} ${row.tags || ""}`],
    );
    if (!existingProduct) rootCreates += 1;
    await db.execute(
      "INSERT INTO source_records (importBatchId, sourceRowKey, sourcePayload, sourceHash, mappedEntityId, processingStatus, qualityFlags) VALUES (?, ?, ?, ?, ?, 'created', ?) ON DUPLICATE KEY UPDATE mappedEntityId = VALUES(mappedEntityId), processingStatus = 'created', qualityFlags = VALUES(qualityFlags)",
      [importBatchId, `root:${sourceRowId}`, JSON.stringify(row), row.source_content_hash, entity.id, JSON.stringify([])],
    );
  }

  for (const row of variants) {
    const parentEntityId = rootEntityIds.get(row.parent_product_source_row_id);
    if (!parentEntityId) throw new Error(`Variant ${row.source_row_id} has no imported parent ${row.parent_product_source_row_id}.`);
    const [[parentProduct]] = await db.query("SELECT id FROM products WHERE entityId = ?", [parentEntityId]);
    const wajenziId = stableId("PRD", `${sourceSystem}:variant:${row.source_row_id}`);
    await db.execute(
      "INSERT INTO registry_entities (wajenziId, workspaceId, entityType, canonicalName, lifecycleStatus, sourceSystem, sourceRecordKey, attributes) VALUES (?, NULL, 'product_variant', ?, 'verified', ?, ?, ?) ON DUPLICATE KEY UPDATE canonicalName = VALUES(canonicalName), lifecycleStatus = 'verified', attributes = VALUES(attributes)",
      [wajenziId, row.canonical_name, sourceSystem, row.source_row_id, JSON.stringify({ sourceRowId: row.source_row_id, parentProductSourceRowId: row.parent_product_source_row_id, parentResolutionMethod: row.parent_resolution_method, sourceContentHash: row.source_content_hash })],
    );
    const [[entity]] = await db.query("SELECT id FROM registry_entities WHERE wajenziId = ?", [wajenziId]);
    const [[existingVariant]] = await db.query("SELECT id FROM product_variants WHERE entityId = ?", [entity.id]);
    await db.execute(
      "INSERT INTO product_variants (entityId, productId, variantLabel, sku, unitOfMeasure, packSize, attributes, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active') ON DUPLICATE KEY UPDATE productId = VALUES(productId), variantLabel = VALUES(variantLabel), sku = VALUES(sku), unitOfMeasure = VALUES(unitOfMeasure), packSize = VALUES(packSize), attributes = VALUES(attributes), status = 'active'",
      [entity.id, parentProduct.id, row.canonical_name, nullable(row.source_sku), nullable(row.unit_of_measure_external), nullable(row.pack_size_text_external), JSON.stringify({ attribute1: { name: nullable(row.attribute_1_name), value: nullable(row.attribute_1_value) }, attribute2: { name: nullable(row.attribute_2_name), value: nullable(row.attribute_2_value) }, sourceRowId: row.source_row_id })],
    );
    if (!existingVariant) variantCreates += 1;
    await db.execute(
      "INSERT INTO source_records (importBatchId, sourceRowKey, sourcePayload, sourceHash, mappedEntityId, processingStatus, qualityFlags) VALUES (?, ?, ?, ?, ?, 'created', ?) ON DUPLICATE KEY UPDATE mappedEntityId = VALUES(mappedEntityId), processingStatus = 'created', qualityFlags = VALUES(qualityFlags)",
      [importBatchId, `variant:${row.source_row_id}`, JSON.stringify(row), row.source_content_hash, entity.id, JSON.stringify([])],
    );
  }

  await db.execute(
    "UPDATE import_batches SET status = 'completed', processedRows = ?, rejectedRows = 0, completedAt = NOW(), report = ? WHERE id = ?",
    [roots.length + variants.length, JSON.stringify({ source: sourceSystem, sourceHash, canonicalRoots: roots.length, canonicalVariants: variants.length, newlyCreatedRoots: rootCreates, newlyCreatedVariants: variantCreates, idempotent: true }), importBatchId],
  );
  await db.commit();
  console.log(JSON.stringify({ status: "completed", canonicalRoots: roots.length, canonicalVariants: variants.length, newlyCreatedRoots: rootCreates, newlyCreatedVariants: variantCreates, importWajenziId }, null, 2));
} catch (error) {
  await db.rollback();
  throw error;
} finally {
  await db.end();
}
