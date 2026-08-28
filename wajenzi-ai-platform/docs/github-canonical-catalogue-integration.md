# GitHub Canonical Catalogue Integration

## Source

Wajenzi.AI reads public canonical product reference data from the user-selected repository: [Wajenzi-ai/wajenzi-ai](https://github.com/Wajenzi-ai/wajenzi-ai). The server-side source is the normalized `canonical_products_seed.csv` file on the main branch:

```text
https://raw.githubusercontent.com/Wajenzi-ai/wajenzi-ai/main/ontology-registry/data/normalized/products/canonical_products_seed.csv
```

The repository documents this file as the WAJENZI master canonical catalogue, intended to provide product identity and initial taxonomy. Its published master projection contains approximately 12.7k canonical product roots, while the supplier-facing Marketplace continues to supply commercial listing data such as prices, stock, and source links.

## Implementation boundary

The backend downloads and parses the public CSV with a five-minute in-memory cache. The `catalog.canonicalGithub` typed endpoint returns only published canonical product roots and identity metadata: canonical ID, source row ID, SKU, name, category, brand, product family, unit, and pack text. The browser never receives a GitHub credential, and the feature does not write remote data into the marketplace database.

The Marketplace includes an expandable GitHub catalogue-source panel that searches the backend result. It makes the repository-backed canonical data visible alongside, but separate from, supplier-specific products and prices. The interface states this distinction explicitly.

## Validation

The live Marketplace panel retrieved canonical products from the backend and filtered an entered `Crown Vinyl` query to matching canonical records. The end-to-end browser assertion confirmed the known **Crown Vinyl Matt Emulsion Xtreme APS Shades** canonical product rendered, the published-canonical-product total was shown, and the unavailable-state message was absent. A direct live request to `catalog.canonicalGithub` returned HTTP `200`, the expected raw GitHub source URL, `12,657` published canonical products, and the same known Crown product. Automated parser coverage verifies that the integration retains published `Product` roots, excludes variants and hidden records, preserves identity metadata, and filters by title, SKU, category, brand, and product family.

## Operational note

This public-source integration is a read-only reference layer. Promoting canonical GitHub data into persisted marketplace records or synchronizing private data should use an authenticated server integration, commit/version pinning, validation, and controlled administrator approval before writing to production tables.
