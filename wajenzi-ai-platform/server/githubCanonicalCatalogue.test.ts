import { describe, expect, it } from "vitest";
import { filterGitHubCanonicalProducts, parseGitHubCanonicalProducts } from "./githubCanonicalCatalogue";

const canonicalCsv = `canonical_entity_id,canonical_entity_type,canonical_status,source_row_id,source_sku,canonical_name,published,catalog_visibility,canonical_brand_external,product_family_external,categories,unit_of_measure_external,pack_size_text_external
root-1,Product,master_canonical,10469,WP022,"Crown Vinyl, Matt",1,visible,Crown,paint,Paint,L,20 L
root-2,Product,master_canonical,10952,TA01,Hole Saw Set,1,visible,,tools,Tool accessories,piece,11 piece
variant-1,ProductVariant,master_canonical,10953,TA01-2,Hole Saw Set variation,1,visible,,tools,Tool accessories,piece,2 piece
hidden-1,Product,master_canonical,10954,HID-01,Hidden item,1,hidden,Example,tools,Tools,piece,1 piece`;

describe("GitHub canonical catalogue parser", () => {
  it("keeps only published canonical product roots and preserves identity metadata", () => {
    expect(parseGitHubCanonicalProducts(canonicalCsv)).toEqual([
      expect.objectContaining({ canonicalEntityId: "root-1", sourceRowId: "10469", sku: "WP022", title: "Crown Vinyl, Matt", category: "Paint", brand: "Crown", packSize: "20 L" }),
      expect.objectContaining({ canonicalEntityId: "root-2", category: "Tool accessories", productFamily: "tools" }),
    ]);
  });

  it("filters canonical products by identity-bearing search attributes", () => {
    const products = parseGitHubCanonicalProducts(canonicalCsv);
    expect(filterGitHubCanonicalProducts(products, "crown", 4)).toHaveLength(1);
    expect(filterGitHubCanonicalProducts(products, "wp022", 4)[0]?.title).toBe("Crown Vinyl, Matt");
  });
});
