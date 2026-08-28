export type GitHubCanonicalProduct = {
  canonicalEntityId: string;
  sourceRowId: string;
  sku: string;
  title: string;
  category: string;
  brand: string | null;
  productFamily: string | null;
  unitOfMeasure: string | null;
  packSize: string | null;
};

type CsvRecord = Record<string, string>;

const REPOSITORY_URL = "https://github.com/Wajenzi-ai/wajenzi-ai";
const SOURCE_URL = "https://raw.githubusercontent.com/Wajenzi-ai/wajenzi-ai/main/ontology-registry/data/normalized/products/canonical_products_seed.csv";
const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedProducts: GitHubCanonicalProduct[] | null = null;
let cachedAt = 0;

function parseCsvRows(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let insideQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];
    if (character === '"' && insideQuotes && nextCharacter === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      insideQuotes = !insideQuotes;
    } else if (character === "," && !insideQuotes) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function mapCsvRecords(source: string): CsvRecord[] {
  const rows = parseCsvRows(source);
  const [header, ...records] = rows;
  if (!header) throw new Error("GitHub canonical catalogue has no header row.");
  return records.map((cells) => Object.fromEntries(header.map((key, index) => [key, cells[index] ?? ""])));
}

function firstCategory(value: string) {
  return value.split(",").map((part) => part.trim()).find(Boolean) ?? "Uncategorised";
}

export function parseGitHubCanonicalProducts(source: string): GitHubCanonicalProduct[] {
  return mapCsvRecords(source)
    .filter((row) => row.canonical_entity_type === "Product" && row.canonical_status === "master_canonical" && row.published === "1" && row.catalog_visibility === "visible")
    .map((row) => ({
      canonicalEntityId: row.canonical_entity_id,
      sourceRowId: row.source_row_id,
      sku: row.source_sku,
      title: row.canonical_name,
      category: firstCategory(row.categories),
      brand: row.canonical_brand_external?.trim() || null,
      productFamily: row.product_family_external?.trim() || null,
      unitOfMeasure: row.unit_of_measure_external?.trim() || null,
      packSize: row.pack_size_text_external?.trim() || null,
    }))
    .filter((product) => Boolean(product.canonicalEntityId && product.title));
}

export function filterGitHubCanonicalProducts(products: GitHubCanonicalProduct[], search?: string, limit = 4) {
  const needle = search?.trim().toLowerCase();
  const results = needle
    ? products.filter((product) => [product.title, product.category, product.sku, product.brand ?? "", product.productFamily ?? ""].join(" ").toLowerCase().includes(needle))
    : products;
  return results.slice(0, limit);
}

export async function getGitHubCanonicalCatalogue(input: { search?: string; limit?: number }) {
  const products = await getGitHubCanonicalProductIndex();
  return {
    repositoryUrl: REPOSITORY_URL,
    sourceUrl: SOURCE_URL,
    sourceLabel: "WAJENZI master canonical catalogue",
    fetchedAt: new Date(cachedAt),
    totalProducts: products.length,
    products: filterGitHubCanonicalProducts(products, input.search, input.limit ?? 4),
  };
}

export async function getGitHubCanonicalProductIndex() {
  if (!cachedProducts || Date.now() - cachedAt > CACHE_TTL_MS) {
    const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(15_000), headers: { Accept: "text/csv" } });
    if (!response.ok) throw new Error(`GitHub canonical catalogue request failed (${response.status}).`);
    const parsed = parseGitHubCanonicalProducts(await response.text());
    if (!parsed.length) throw new Error("GitHub canonical catalogue did not contain published canonical products.");
    cachedProducts = parsed;
    cachedAt = Date.now();
  }
  return cachedProducts;
}
