import type { GitHubCanonicalProduct } from "./githubCanonicalCatalogue";

export type MatchInput = {
  normalizedProductName: string;
  supplierSku: string | null;
  brand: string | null;
  category: string | null;
  sizeValue: string | null;
  sizeUnit: string | null;
};

export type CanonicalMatchResult = {
  canonical: GitHubCanonicalProduct | null;
  status: "matched_existing" | "review_required" | "new_canonical_candidate";
  method: "exact_sku" | "exact_title" | "normalized_title" | "candidate" | "unmatched";
  score: number;
  decisionStatus: "auto_accepted" | "pending" | "needs_data";
  reason: string;
  evidence: Record<string, string | number | boolean>;
};

export const canonicalMatchThresholds = { autoAccept: 95, review: 70 } as const;

function normalized(value: string | null | undefined) { return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function terms(value: string | null | undefined) { return new Set(normalized(value).split(" ").filter((term) => term.length > 1)); }
function overlap(left: Set<string>, right: Set<string>) { return Array.from(left).filter((term) => right.has(term)).length; }

export function matchCanonicalProduct(input: MatchInput, catalogue: GitHubCanonicalProduct[]): CanonicalMatchResult {
  const inputSku = normalized(input.supplierSku);
  const inputTitle = normalized(input.normalizedProductName);
  const inputBrand = normalized(input.brand);
  const inputCategory = normalized(input.category);
  const exactSku = inputSku ? catalogue.filter((product) => normalized(product.sku) === inputSku) : [];
  if (exactSku.length === 1) return { canonical: exactSku[0], status: "matched_existing", method: "exact_sku", score: 100, decisionStatus: "auto_accepted", reason: "Exact supplier SKU equals one canonical source SKU.", evidence: { supplierSku: input.supplierSku ?? "", canonicalSku: exactSku[0].sku, unique: true } };
  const exactTitle = catalogue.filter((product) => normalized(product.title) === inputTitle);
  if (exactTitle.length === 1) return { canonical: exactTitle[0], status: "matched_existing", method: "exact_title", score: 96, decisionStatus: "auto_accepted", reason: "Normalized supplier name equals one canonical product title.", evidence: { normalizedName: input.normalizedProductName, unique: true } };
  const inputTerms = terms(input.normalizedProductName);
  const ranked = catalogue.map((product) => {
    const titleTerms = terms(product.title);
    const sharedTerms = overlap(inputTerms, titleTerms);
    const titleScore = inputTerms.size ? Math.round((sharedTerms / inputTerms.size) * 76) : 0;
    const brandMatch = Boolean(inputBrand && inputBrand === normalized(product.brand));
    const categoryMatch = Boolean(inputCategory && inputCategory === normalized(product.category));
    const packMatch = Boolean(input.sizeValue && input.sizeUnit && normalized(product.packSize).includes(normalized(`${input.sizeValue} ${input.sizeUnit}`)));
    return { product, score: Math.min(94, titleScore + (brandMatch ? 10 : 0) + (categoryMatch ? 8 : 0) + (packMatch ? 6 : 0)), sharedTerms, brandMatch, categoryMatch, packMatch };
  }).sort((left, right) => right.score - left.score);
  const candidate = ranked[0];
  const tied = candidate && ranked.filter((item) => item.score === candidate.score).length > 1;
  if (candidate && candidate.score >= canonicalMatchThresholds.review && !tied) return { canonical: candidate.product, status: "review_required", method: "normalized_title", score: candidate.score, decisionStatus: "pending", reason: "A compatible canonical candidate was found, but only deterministic exact identifier or title matches are automatically accepted.", evidence: { sharedTerms: candidate.sharedTerms, brandMatch: candidate.brandMatch, categoryMatch: candidate.categoryMatch, packMatch: candidate.packMatch, unique: true } };
  if (candidate && candidate.score > 0) return { canonical: candidate.product, status: "review_required", method: "candidate", score: candidate.score, decisionStatus: "needs_data", reason: tied ? "Multiple canonical candidates have the same score." : "The strongest canonical candidate is below the review threshold.", evidence: { tied: Boolean(tied), sharedTerms: candidate.sharedTerms, reviewThreshold: canonicalMatchThresholds.review } };
  return { canonical: null, status: "new_canonical_candidate", method: "unmatched", score: 0, decisionStatus: "needs_data", reason: "No suitable canonical candidate was found; retain this supplier submission for stewardship review.", evidence: { reviewThreshold: canonicalMatchThresholds.review } };
}
