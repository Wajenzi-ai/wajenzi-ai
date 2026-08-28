export type CatalogProductStatus = "active" | "draft" | "out_of_stock";

export type ParsedCatalogProduct = {
  sku: string;
  title: string;
  category: string;
  priceKes: number;
  salePriceKes: number | null;
  availableQuantity: number;
  supplierName: string | null;
  description: string | null;
  imageUrl: string | null;
  externalUrl: string;
  buttonText: string | null;
  status: CatalogProductStatus;
  attributes: Record<string, string>;
};

export type CatalogParseResult = {
  products: ParsedCatalogProduct[];
  totalRows: number;
  skippedRows: number;
  errors: string[];
};

const aliases = {
  productId: ["id", "product id", "post id"],
  sku: ["sku", "id", "product id"],
  title: ["name", "title", "product name"],
  category: ["categories", "category", "product category"],
  regularPrice: ["regular price", "regular_price", "price", "unit price"],
  salePrice: ["sale price", "sale_price", "discount price"],
  stock: ["stock", "stock quantity", "stock_quantity", "quantity", "inventory"],
  externalUrl: ["external url", "external_url", "product url", "product_url", "url", "link", "affiliate link"],
  image: ["images", "image", "image url", "image_url", "thumbnail"],
  description: ["description", "short description", "short_description", "product description"],
  supplier: ["supplier", "supplier name", "vendor", "brand", "manufacturer"],
  buttonText: ["button text", "button_text", "link text"],
  published: ["published", "status", "visibility", "catalog visibility"],
} as const;

const MAX_CATALOG_ROWS = 15_000;

function getWajenziStoreBaseUrl(matrix: string[][], headers: string[]) {
  const imageColumn = headers.findIndex((header) => aliases.image.includes(header as never));
  if (imageColumn === -1) return null;

  for (const cells of matrix.slice(1)) {
    const imageUrl = validateHttpUrl((cells[imageColumn] ?? "").split(",")[0] ?? "");
    if (imageUrl && new URL(imageUrl).hostname === "wajenzistores.com") return new URL(imageUrl).origin;
  }

  return null;
}

function normaliseHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ").replace(/^attribute \d+ /, "");
}

function parseCsvMatrix(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (char === '"') {
      if (quoted && content[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && content[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim().length > 0)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  if (quoted) throw new Error("The CSV contains an unclosed quoted value.");
  row.push(cell);
  if (row.some((value) => value.trim().length > 0)) rows.push(row);
  return rows;
}

function getValue(row: Record<string, string>, fields: readonly string[]) {
  for (const field of fields) {
    const value = row[field];
    if (value?.trim()) return value.trim();
  }
  return "";
}

function parseAmount(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

function parseQuantity(value: string) {
  if (!value.trim()) return 0;
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.min(Math.floor(parsed), 2_147_483_647) : 0;
}

function validateHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isPublished(value: string) {
  const normalised = value.trim().toLowerCase();
  return !normalised || ["1", "true", "yes", "publish", "published", "active", "visible", "public"].includes(normalised);
}

/** Parses common WooCommerce headers and a small set of intuitive marketplace aliases. */
export function parseWooCommerceCsv(content: string): CatalogParseResult {
  const matrix = parseCsvMatrix(content.replace(/^\uFEFF/, ""));
  if (matrix.length < 2) throw new Error("The CSV needs a header row and at least one product row.");

  const headers = matrix[0].map(normaliseHeader);
  if (!headers.some((header) => aliases.title.includes(header as never))) {
    throw new Error("A product title column is required. Use Name, Title, or Product Name.");
  }

  const sourceStoreBaseUrl = getWajenziStoreBaseUrl(matrix, headers);
  const products: ParsedCatalogProduct[] = [];
  const errors: string[] = [];
  let skippedRows = 0;

  matrix.slice(1, MAX_CATALOG_ROWS + 1).forEach((cells, index) => {
    const rowNumber = index + 2;
    const row = Object.fromEntries(headers.map((header, headerIndex) => [header, cells[headerIndex] ?? ""]));
    const title = getValue(row, aliases.title);
    const sku = getValue(row, aliases.sku) || `csv-${rowNumber}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
    const explicitExternalUrl = validateHttpUrl(getValue(row, aliases.externalUrl));
    const sourceProductId = getValue(row, aliases.productId);
    const externalUrl = explicitExternalUrl ?? (sourceStoreBaseUrl && /^\d+$/.test(sourceProductId)
      ? `${sourceStoreBaseUrl}/?p=${encodeURIComponent(sourceProductId)}`
      : null);

    if (!title || !externalUrl) {
      skippedRows += 1;
      if (errors.length < 8) errors.push(`Row ${rowNumber}: ${!title ? "product title is missing" : "a valid http(s) product link is required"}.`);
      return;
    }

    const categoryValue = getValue(row, aliases.category);
    const category = categoryValue.split(/[>|]/)[0]?.trim() || "Uncategorised";
    const stockValue = getValue(row, aliases.stock);
    const availableQuantity = parseQuantity(stockValue);
    const published = isPublished(getValue(row, aliases.published));
    const regularPrice = parseAmount(getValue(row, aliases.regularPrice)) ?? 0;
    const salePrice = parseAmount(getValue(row, aliases.salePrice));
    const imageUrl = validateHttpUrl(getValue(row, aliases.image).split(",")[0] ?? "");
    const description = getValue(row, aliases.description) || null;
    const supplierName = getValue(row, aliases.supplier) || null;
    const buttonText = getValue(row, aliases.buttonText).slice(0, 60) || null;

    products.push({
      sku: sku.slice(0, 90),
      title: title.slice(0, 255),
      category: category.slice(0, 100),
      priceKes: regularPrice,
      salePriceKes: salePrice,
      availableQuantity,
      supplierName: supplierName?.slice(0, 180) ?? null,
      description,
      imageUrl,
      externalUrl,
      buttonText,
      status: published ? (stockValue.trim() && availableQuantity === 0 ? "out_of_stock" : "active") : "draft",
      attributes: { sourceCategory: categoryValue, importedFrom: "csv" },
    });
  });

  if (matrix.length - 1 > MAX_CATALOG_ROWS) errors.push(`Only the first ${MAX_CATALOG_ROWS.toLocaleString()} product rows were processed.`);
  return { products, totalRows: Math.min(matrix.length - 1, MAX_CATALOG_ROWS), skippedRows, errors };
}
