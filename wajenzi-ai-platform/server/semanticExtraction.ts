import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import * as XLSX from "xlsx";

export const semanticWorkspaces = ["supplier", "manufacturer"] as const;
export type SemanticWorkspace = (typeof semanticWorkspaces)[number];
export type SemanticDocumentType = "catalogue" | "price_list" | "quotation" | "invoice" | "stock_list" | "unknown";
export type SemanticReadiness = "ready" | "needs_review" | "failed";

export type SemanticProduct = {
  sourceReference: string;
  supplierProductName: string;
  normalizedProductName: string;
  supplierSku: string | null;
  brand: string | null;
  category: string | null;
  productType: string | null;
  sizeValue: string | null;
  sizeUnit: string | null;
  colour: string | null;
  weightValue: string | null;
  weightUnit: string | null;
  dimensions: string | null;
  packagingUnit: string | null;
  stockQuantity: number | null;
  priceKes: number | null;
  extractionConfidence: number;
  classificationConfidence: number;
  status: SemanticReadiness;
  fieldEvidence: Record<string, string>;
  classification: Record<string, string>;
};

export type SemanticDocumentResult = {
  documentType: SemanticDocumentType;
  supplierName: string | null;
  currency: "KES" | null;
  headings: string[];
  productSections: string[];
  rawText: string;
  products: SemanticProduct[];
};

const MAX_BYTES = 12 * 1024 * 1024;
const MAX_RAW_TEXT_CHARS = 1_500_000;
const supportedExtensions = new Set(["pdf", "docx", "txt", "csv", "xlsx", "xls"]);
const colours = ["white", "black", "grey", "gray", "red", "blue", "green", "brown", "beige", "cream"];

function extension(name: string) {
  return name.toLowerCase().split(".").pop() ?? "";
}

export function validateSemanticSource(originalName: string, contentType: string, bytes: Buffer) {
  const ext = extension(originalName);
  if (!supportedExtensions.has(ext)) throw new Error("Supported sources are PDF, DOCX, TXT, CSV, XLSX, and XLS.");
  if (!bytes.byteLength) throw new Error("The selected document is empty.");
  if (bytes.byteLength > MAX_BYTES) throw new Error("Supplier documents must be 12 MB or smaller.");
  if (ext === "pdf" && bytes.subarray(0, 5).toString("utf8") !== "%PDF-") throw new Error("The PDF signature could not be verified.");
  if (["docx", "xlsx", "xls"].includes(ext) && bytes.subarray(0, 2).toString("utf8") !== "PK" && ext !== "xls") throw new Error("The Office document container could not be verified.");
  if (["txt", "csv"].includes(ext)) {
    const text = bytes.toString("utf8").trim();
    if (!text || text.includes("\u0000")) throw new Error("The text source is unreadable or empty.");
  }
  return { ext, contentType: contentType || "application/octet-stream" };
}

async function extractRawText(originalName: string, bytes: Buffer) {
  const ext = extension(originalName);
  if (ext === "txt" || ext === "csv") return bytes.toString("utf8");
  if (ext === "docx") return (await mammoth.extractRawText({ buffer: bytes })).value;
  if (ext === "xlsx" || ext === "xls") {
    const workbook = XLSX.read(bytes, { type: "buffer" });
    return workbook.SheetNames.map((sheetName) => `# ${sheetName}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])}`).join("\n\n");
  }
  const parser = new PDFParse({ data: bytes });
  try { return (await parser.getText()).text; } finally { await parser.destroy(); }
}

function parseRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(value.trim()); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; value = "";
    } else value += char;
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function repairUnquotedKesColumn(row: string[], headerCount: number, priceIndex: number) {
  if (priceIndex < 0 || row.length !== headerCount + 1) return row;
  const beforeThousands = row[priceIndex] ?? "";
  const thousands = row[priceIndex + 1] ?? "";
  if (!/(?:k\s*sh|kes|sh\.?|\d)$/i.test(beforeThousands) || !/^\d{3}(?:\.\d+)?$/.test(thousands)) return row;
  return [...row.slice(0, priceIndex), `${beforeThousands},${thousands}`, ...row.slice(priceIndex + 2)];
}

function key(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, ""); }
function findColumn(headers: string[], candidates: string[]) {
  return headers.findIndex((header) => candidates.some((candidate) => key(header).includes(candidate)));
}
function getCell(row: string[], index: number) { return index >= 0 ? row[index]?.trim() || null : null; }
function numberFrom(value: string | null) { if (!value) return null; const normalized = value.replace(/,/g, "").match(/\d+(?:\.\d+)?/); return normalized ? Number(normalized[0]) : null; }
function kesFrom(value: string | null) {
  if (!value) return null;
  const hasCurrency = /(?:k\s*sh|kes|kenya\s+shillings|sh\.?)/i.test(value) || /\/-\s*$/.test(value);
  return hasCurrency ? numberFrom(value) : null;
}
function canonicalUnit(value: string | null) {
  if (!value) return null;
  const unit = value.toLowerCase().replace(/[.]/g, "").trim();
  if (/^(kg|kgs|kilograms?)$/.test(unit)) return "KG";
  if (/^(l|ltr|ltrs|lit(res?|ers?))$/.test(unit)) return "L";
  if (/^(m|met(res?|ers?))$/.test(unit)) return "M";
  if (/^(mm|millimet(res?|ers?))$/.test(unit)) return "MM";
  if (/^(cm|centimet(res?|ers?))$/.test(unit)) return "CM";
  if (/^(pc|pcs|pieces?)$/.test(unit)) return "PCS";
  if (/^boxes?$/.test(unit)) return "BOX";
  if (/^bags?$/.test(unit)) return "BAG";
  if (/^rolls?$/.test(unit)) return "ROLL";
  return null;
}
function detectCategory(name: string) {
  const text = name.toLowerCase();
  if (/emulsion|primer|gloss|matt|enamel|sealer|putty/.test(text)) return ["Paint", "WZ-SEM-PAINT", 82] as const;
  if (/ppr|pvc|hdpe|cpvc|elbow|tee|valve|pipe/.test(text)) return ["Plumbing", "WZ-SEM-PLUMBING", 78] as const;
  if (/mcb|db|socket|cable|conduit|breaker|led/.test(text)) return ["Electrical", "WZ-SEM-ELECTRICAL", 78] as const;
  if (/rebar|reinforcement bar|tmt|mesh|channel|plate/.test(text)) return ["Steel", "WZ-SEM-STEEL", 82] as const;
  if (/tile|corrugated|ridge|flashing|gutter|fascia/.test(text)) return ["Roofing", "WZ-SEM-ROOFING", 76] as const;
  if (/cement|concrete|mortar|grout/.test(text)) return ["Concrete", "WZ-SEM-CONCRETE", 80] as const;
  return [null, "", 0] as const;
}
function nameAttributes(name: string) {
  const lower = name.toLowerCase();
  const capacity = lower.match(/\b(\d+(?:\.\d+)?)\s*(l|ltr|ltrs|litres?|liters?|kg|kgs|mm|cm|m)\b/i);
  const colour = colours.find((candidate) => new RegExp(`\\b${candidate}\\b`, "i").test(name));
  const isSteelIdentity = /rebar|reinforcement|tmt/i.test(name);
  const normalizedColour = colour === "gray" ? "Grey" : colour ? `${colour[0].toUpperCase()}${colour.slice(1)}` : null;
  let normalized = name.replace(/(?:k\s*sh|kes|sh\.?)\s*[\d,]+(?:\/-)?/ig, "").trim();
  if (capacity && !isSteelIdentity) normalized = normalized.replace(new RegExp(capacity[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), " ");
  if (colour && !/white\s+cement/i.test(normalized)) normalized = normalized.replace(new RegExp(`\\b${colour}\\b`, "ig"), " ");
  normalized = normalized.replace(/\s{2,}/g, " ").replace(/[—–-]\s*$/g, "").trim();
  return { normalized: normalized || name, capacity, colour: normalizedColour };
}
function detectDocumentType(name: string, text: string): SemanticDocumentType {
  const subject = `${name}\n${text.slice(0, 3000)}`.toLowerCase();
  if (/quotation|quote\b/.test(subject)) return "quotation";
  if (/invoice/.test(subject)) return "invoice";
  if (/price[-\s]*list|pricebook|price[-\s]*schedule/.test(subject)) return "price_list";
  if (/stock|inventory/.test(subject)) return "stock_list";
  if (/catalog|catalogue/.test(subject)) return "catalogue";
  return "unknown";
}
function supplierFromText(text: string) {
  const supplierMatch = text.match(/(?:supplier|company|vendor)\s*[:\-]\s*([^\n]{2,120})/i);
  return supplierMatch?.[1]?.trim() || null;
}

export async function parseSemanticDocument(originalName: string, contentType: string, bytes: Buffer): Promise<SemanticDocumentResult> {
  validateSemanticSource(originalName, contentType, bytes);
  const rawText = (await extractRawText(originalName, bytes)).replace(/\u0000/g, "").slice(0, MAX_RAW_TEXT_CHARS).trim();
  if (!rawText) throw new Error("No readable text was found. Image-only scans must be reviewed manually.");
  const rows = parseRows(rawText).filter((row) => row.length > 1);
  const headerRowIndex = rows.findIndex((row) => findColumn(row, ["productname", "product", "itemname", "description", "name"]) >= 0);
  const header = headerRowIndex >= 0 ? rows[headerRowIndex] : rows[0] ?? [];
  const headers = header.map((entry) => entry.trim());
  const nameIndex = findColumn(headers, ["productname", "product", "itemname", "description", "name"]);
  const skuIndex = findColumn(headers, ["sku", "itemcode", "productcode", "code"]);
  const priceIndex = findColumn(headers, ["price", "amount", "rate", "unitprice"]);
  const categoryIndex = findColumn(headers, ["category", "productcategory", "department"]);
  const stockIndex = findColumn(headers, ["stock", "quantity", "qty", "available"]);
  const brandIndex = findColumn(headers, ["brand", "make", "manufacturer"]);
  const unitIndex = findColumn(headers, ["unit", "pack", "uom"]);
  const hasStructuredHeader = nameIndex >= 0 && rows.length > headerRowIndex + 1;
  const sourceRows = hasStructuredHeader ? rows.slice(headerRowIndex + 1) : rawText.split(/\n+/).map((line) => line.split(/\s+[—–]\s+|\t+/));
  const products = sourceRows.flatMap((row, rowOffset) => {
    const structuredRow = hasStructuredHeader ? repairUnquotedKesColumn(row, headers.length, priceIndex) : row;
    const sourceName = hasStructuredHeader ? getCell(structuredRow, nameIndex) : structuredRow[0]?.trim() || null;
    if (!sourceName || sourceName.length < 2 || /^(total|subtotal|page\s+\d+|category)$/i.test(sourceName)) return [];
    const inferredPrice = hasStructuredHeader ? kesFrom(getCell(structuredRow, priceIndex)) ?? numberFrom(getCell(structuredRow, priceIndex)) : structuredRow.map((cell) => kesFrom(cell)).find((value) => value !== null) ?? null;
    const attributes = nameAttributes(sourceName);
    const [suggestedCategory, code, classificationConfidence] = getCell(structuredRow, categoryIndex) ? [getCell(structuredRow, categoryIndex), "", 72] as const : detectCategory(sourceName);
    const supplierSku = getCell(structuredRow, skuIndex);
    const brand = getCell(structuredRow, brandIndex);
    const unit = canonicalUnit(getCell(structuredRow, unitIndex));
    const capacityUnit = canonicalUnit(attributes.capacity?.[2] ?? null);
    const capacityValue = attributes.capacity?.[1] ?? null;
    const confidence = Math.min(98, 42 + (supplierSku ? 12 : 0) + (inferredPrice !== null ? 20 : 0) + (suggestedCategory ? 12 : 0) + (unit || capacityUnit ? 6 : 0));
    const status: SemanticReadiness = attributes.normalized && inferredPrice !== null && confidence >= 72 && classificationConfidence >= 60 ? "ready" : "needs_review";
    const sourceReference = hasStructuredHeader ? `row ${rowOffset + headerRowIndex + 2}` : `text block ${rowOffset + 1}`;
    return [{ sourceReference, supplierProductName: sourceName, normalizedProductName: attributes.normalized, supplierSku, brand, category: suggestedCategory, productType: null, sizeValue: capacityUnit === "L" || capacityUnit === "MM" || capacityUnit === "CM" || capacityUnit === "M" ? capacityValue : null, sizeUnit: capacityUnit === "L" || capacityUnit === "MM" || capacityUnit === "CM" || capacityUnit === "M" ? capacityUnit : null, colour: attributes.colour, weightValue: capacityUnit === "KG" ? capacityValue : null, weightUnit: capacityUnit === "KG" ? "KG" : null, dimensions: null, packagingUnit: unit, stockQuantity: numberFrom(getCell(structuredRow, stockIndex)), priceKes: inferredPrice, extractionConfidence: confidence, classificationConfidence, status, fieldEvidence: { name: sourceReference, price: inferredPrice !== null ? sourceReference : "", sku: supplierSku ? sourceReference : "", category: suggestedCategory ? sourceReference : "" }, classification: { wajenziCode: code, source: suggestedCategory ? "construction_vocabulary" : "unmapped", method: suggestedCategory ? "deterministic_cue" : "needs_review", reason: suggestedCategory ? `Matched ${suggestedCategory} construction terms` : "No confident category cue" } }];
  });
  if (!products.length) throw new Error("No product rows could be identified. Review the source and its table headings.");
  const headings = hasStructuredHeader ? headers : [];
  const sections = Array.from(new Set(products.map((product) => product.category).filter((category): category is string => Boolean(category))));
  return { documentType: detectDocumentType(originalName, rawText), supplierName: supplierFromText(rawText), currency: products.some((product) => product.priceKes !== null) ? "KES" : null, headings, productSections: sections, rawText, products };
}

function csvCell(value: unknown) {
  const rendered = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(rendered) ? `"${rendered.replaceAll('"', '""')}"` : rendered;
}

type SemanticExportProduct = Omit<SemanticProduct, "fieldEvidence" | "classification"> & { id: number; sourceDocumentName: string; supplierName: string | null; fieldEvidence: unknown; classification: unknown };

export function toWooCommerceCsv(products: SemanticExportProduct[]) {
  const headers = ["Type", "SKU", "Name", "Published", "Visibility in catalog", "Short description", "In stock?", "Stock", "Regular price", "Categories", "Tags", "Weight (unit)", "Attribute 1 name", "Attribute 1 value(s)", "Attribute 1 visible", "Attribute 2 name", "Attribute 2 value(s)", "Attribute 2 visible", "Attribute 3 name", "Attribute 3 value(s)", "Attribute 3 visible", "meta:wajenzi_product_id", "meta:source_document", "meta:source_reference", "meta:supplier_name", "meta:supplier_product_name", "meta:currency", "meta:normalization_status", "meta:quality_score", "meta:extraction_confidence", "meta:classification_confidence", "meta:wajenzi_code"];
  const rows = products.map((product) => {
    const classification = product.classification && typeof product.classification === "object" ? product.classification as Record<string, unknown> : {};
    return ["simple", product.supplierSku || `WZ-SEM-${product.id}`, product.normalizedProductName, product.status === "ready" ? "1" : "-1", product.status === "ready" ? "visible" : "hidden", [product.brand, product.productType, product.sizeValue && product.sizeUnit ? `${product.sizeValue} ${product.sizeUnit}` : null, product.colour].filter(Boolean).join(" · "), product.stockQuantity === null ? "" : product.stockQuantity > 0 ? "1" : "0", product.stockQuantity ?? "", product.priceKes ?? "", product.category ?? "", [product.brand, product.productType, product.colour].filter(Boolean).join(", "), product.weightValue ?? "", "Size", product.sizeValue && product.sizeUnit ? `${product.sizeValue} ${product.sizeUnit}` : "", product.sizeValue ? "1" : "", "Colour", product.colour ?? "", product.colour ? "1" : "", "Brand", product.brand ?? "", product.brand ? "1" : "", product.id, product.sourceDocumentName, product.sourceReference, product.supplierName ?? "", product.supplierProductName, product.priceKes !== null ? "KES" : "", product.status, product.extractionConfidence, product.extractionConfidence, product.classificationConfidence, typeof classification.wajenziCode === "string" ? classification.wajenziCode : ""];
  });
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
