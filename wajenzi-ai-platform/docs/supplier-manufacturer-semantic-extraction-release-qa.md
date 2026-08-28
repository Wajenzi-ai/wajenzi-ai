# Supplier and Manufacturer semantic extraction release QA

## Scope

The semantic extraction workflow is available exclusively in the **Supplier** and **Manufacturer** dashboards. The Supplier dashboard presents it as **Supplier document semantic extraction**, while the Manufacturer dashboard presents it as **Product master semantic extraction**. The Architect dashboard was checked as a representative excluded professional workspace and does not render the feature.

| Area | Implemented behavior |
| --- | --- |
| Secure intake | An authenticated raw-binary upload endpoint accepts PDF, DOCX, TXT, CSV, XLSX, and XLS source files up to 12 MB. Original bytes are stored in managed object storage, not database BLOB fields. |
| Source traceability | Source records retain owner, permitted workspace, original name, MIME type, byte size, SHA-256 checksum, object-storage key and URL, raw extracted text, document context, processing state, and any error summary. |
| Semantic results | Product records preserve supplier product name separately from normalized product name, SKU, price, stock, unit, capacity, weight, colour, category, field evidence, classification evidence, and separate extraction/classification confidence scores. |
| Review and export | Products lacking verified commercial data or adequate confidence remain `needs_review`. The WooCommerce CSV exporter creates one row per normalized product and sends needs-review products as unpublished and hidden. |
| Controlled operations | Owner-scoped protected procedures list sources and results, extract a retained source, reclassify from retained raw source text, and prepare the export. The binary endpoint accepts only `supplier` and `manufacturer` workspace values. |

## Validation

| Check | Result |
| --- | --- |
| Source-format and parsing tests | Passed. Coverage includes accepted and rejected source validation, KES normalization, canonical units, product-name normalization, missing price review status, WooCommerce hidden export behavior, and XLSX header detection after a title row. |
| Access control tests | Passed. Protected tRPC procedures reject anonymous callers and reject an excluded `architect` workspace input. The raw binary upload endpoint returned HTTP 401 without a session. |
| Automated suite | `pnpm test` passed: **13 test files and 36 tests**. |
| Type validation | `pnpm check` passed. |
| Production build | `pnpm build` passed. The build reports an existing large-client-chunk warning only. |
| Browser and responsive review | Supplier and Manufacturer pages render their dedicated semantic extraction panels. The Architect page has no semantic extraction panel. Supplier and Manufacturer responsive views were checked at 390×844. |

## Operational boundary

> This release is deterministic document understanding, not a claim that every arbitrary scan can be read flawlessly. Image-only PDFs with no extractable text are returned for manual review. A signed-in upload, extraction, review, and export walkthrough should be performed with a real supplier or manufacturer account before operational rollout.

