import { describe, expect, it } from "vitest";
import { matchCanonicalProduct } from "./canonicalMatching";

const catalogue = [
  { canonicalEntityId: "WJ-PROD-000123", sourceRowId: "row-1", sku: "PPR-25-PN20", title: "PPR Pipe 25mm PN20", category: "Plumbing", brand: "AquaFlow", productFamily: "PPR pipe", unitOfMeasure: "M", packSize: "4 M" },
  { canonicalEntityId: "WJ-PROD-000456", sourceRowId: "row-2", sku: "CROWN-20L", title: "Crown Vinyl Matt Emulsion", category: "Paint", brand: "Crown", productFamily: "Emulsion", unitOfMeasure: "L", packSize: "20 L" },
];

describe("canonical product matching", () => {
  it("auto-accepts a unique exact supplier SKU without changing canonical identity", () => {
    const result = matchCanonicalProduct({ normalizedProductName: "Any supplier wording", supplierSku: "PPR-25-PN20", brand: null, category: null, sizeValue: null, sizeUnit: null }, catalogue);
    expect(result).toMatchObject({ status: "matched_existing", method: "exact_sku", score: 100, decisionStatus: "auto_accepted", canonical: { canonicalEntityId: "WJ-PROD-000123" } });
  });

  it("sends a semantic-but-not-exact candidate to review", () => {
    const result = matchCanonicalProduct({ normalizedProductName: "Crown Vinyl Matt Emulsion", supplierSku: null, brand: "Crown", category: "Paint", sizeValue: "20", sizeUnit: "L" }, catalogue);
    expect(result).toMatchObject({ status: "matched_existing", method: "exact_title", decisionStatus: "auto_accepted", canonical: { canonicalEntityId: "WJ-PROD-000456" } });
  });

  it("creates no canonical identity for unmatched supplier information", () => {
    const result = matchCanonicalProduct({ normalizedProductName: "Unspecified green building material", supplierSku: null, brand: null, category: null, sizeValue: null, sizeUnit: null }, catalogue);
    expect(result).toMatchObject({ canonical: null, status: "new_canonical_candidate", method: "unmatched", decisionStatus: "needs_data" });
  });
});
