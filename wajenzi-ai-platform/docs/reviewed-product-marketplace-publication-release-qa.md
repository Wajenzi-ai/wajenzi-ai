# Reviewed semantic-product marketplace publication QA

## Publishing contract

The Supplier and Manufacturer semantic extraction review tables now provide an explicit marketplace publication control for each **ready** record. The control appears only when the product has verified price and category data. A confirmation dialog precedes both publication and visibility removal.

| Control | Behavior |
| --- | --- |
| Publish reviewed product | Creates or updates the supplier-scoped marketplace item as `active`, then links the semantic record to the resolved marketplace product ID. |
| Traceability | Marketplace attributes retain semantic product ID, source document ID and name, source row/block reference, unmodified supplier product name, normalized product name, extraction confidence, classification confidence, readiness state, and classification mapping. |
| Readiness safeguard | A `needs_review` record cannot be published. The protected procedure rejects a product missing ready status, verified price, or category. |
| Remove visibility | Returns the linked marketplace item to `draft` and marks the semantic record as `unpublished`; original source evidence and normalized product records remain retained. |
| Marketplace discovery | Published reviewed products use the existing marketplace catalog data path and are included in the active marketplace status queried by public product discovery. |

## Validation

| Check | Result |
| --- | --- |
| Protected contract | An authenticated caller published a ready reviewed product, retained semantic metadata in the catalog record, received a marketplace link, and removed catalog visibility. A needs-review product was rejected. |
| Regression suite | `pnpm test` passed: **13 test files and 37 tests**. |
| Type and production validation | `pnpm check` and `pnpm build` passed. The production build emitted the pre-existing large-client-chunk advisory only. |
| Visual review | Supplier and Manufacturer dashboards continued to render without regression after publication-control integration. |

> A real, signed-in supplier or manufacturer upload-to-publication walkthrough remains the appropriate next production acceptance test. No production products were fabricated or published for validation.

