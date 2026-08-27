# WAJENZI Master Canonical Product and Supplier Ingestion Contract

**Version:** 0.4 draft  
**Source catalogue:** `WAJENZI_EXTERNAL_SOURCE_ENRICHED_PRODUCTS.csv`  
**Catalogue authority:** WAJENZI master product catalogue  
**Author:** Manus AI

## 1. Core decision

The attached WAJENZI product export is the **master canonical catalogue**. Its rows are not supplier listings. They are the initial canonical product roots and canonical variants that WAJENZI intends to serve. The catalogue is append-only in identity terms: it may grow when an approved supplier submission represents a product that cannot be matched to an existing canonical product or variant, but existing canonical identity must never be replaced by a supplier title, SKU, price, image, or stock value.

The CSV `ID` is the **source-row identifier** from the WAJENZI master export. It is not automatically the public WAJENZI registry ID. The registry must assign an immutable opaque entity ID and retain the source identifier as a namespaced external identifier:

```text
namespace: wajenzi-master-catalogue-v1
identifier_type: source_row_id
identifier_value: <CSV ID>
```

A source `SKU` is also retained as an external identifier, but it is not globally unique and must not be used as the canonical entity ID.

## 2. What each source row means

| Source `Type` | WAJENZI meaning | Registry action |
|---|---|---|
| `simple` | One canonical product root with no declared variations | Create one `Product` root and retain all source fields as evidence. |
| `variable` | One canonical product family/root that has one or more canonical variants | Create one `Product` root; create `ProductVariant` entities for its variation rows. |
| `variation` | A canonical variant belonging to a variable product root | Resolve the parent and create one `ProductVariant`; do not create another product root. |

The initial export contains **13,180 rows**: 12,612 simple roots, 51 variable roots, and 517 variation rows. This yields 12,663 canonical root records and 517 canonical variant records before any future supplier submissions are added.

## 3. Parent resolution for the current export

The export uses two parent-reference conventions. The import must resolve them in this order:

1. Match `variation.Parent` to the unique `SKU` of a `simple` or `variable` root.
2. If the value has the form `id:<source ID>`, match the suffix to the root row’s source `ID`. This is required because 69 current variation rows refer to variable roots whose SKU is blank.
3. If neither method yields exactly one root, place the variation in `canonicalization_review` and do not publish it as an unattached canonical variant.

The current source resolves all 517 variation rows: **448 by unique parent SKU and 69 by source row ID**. The 69 ID-based links are valid source-structure resolutions and should not be treated as missing products.

## 4. Canonical ID and source evidence policy

Every root and variant receives an immutable WAJENZI registry entity ID. The import must be idempotent on `(source_system, source_record_id)`. Replaying the master CSV must resolve to the same WAJENZI entity and must not create a duplicate.

The registry must retain the full raw source row or a content-addressed source record. Canonical attributes such as name, category, brand, unit, pack size, dimensions, classification codes, description, and images must carry field-level provenance where possible. A later supplier submission may add evidence or propose an update, but it may not overwrite a master canonical field without an explicit stewardship decision and audit event.

## 5. Supplier submission semantics

A supplier submission is a **source-specific commercial record**. It must first be stored as `SupplierProductSubmission` / `source_record` with the supplier, submission batch, supplier SKU, title, brand, manufacturer part number, barcode, unit, pack, dimensions, specification, category, price, stock, facility, and evidence links. It must not directly create a canonical product.

The canonicalization service evaluates the submission against the master catalogue and any later approved canonical additions. The outcomes are:

| Outcome | Meaning | Canonical effect |
|---|---|---|
| `matched_existing_product` | Submission describes an existing canonical root | No new product ID. Attach a supplier offer/listing to the existing product or its resolved variant. |
| `matched_existing_variant` | Submission matches an existing pack/specification/variant | No new product or variant ID. Attach a supplier offer to that variant. |
| `review_required` | Candidate matches conflict, are incomplete, or are below auto-accept confidence | No canonical creation or attachment until a steward decides. |
| `new_canonical_candidate` | No existing candidate is suitable after review | Create a new canonical root/variant only through the controlled registry workflow. |
| `rejected` | Submission is invalid, duplicate, prohibited, or unsupported | Retain the evidence and reason; create no canonical entity. |

“Skipped” therefore means **skipped for canonical creation**, not discarded. The supplier submission, supplier SKU, price, stock, facility, and decision evidence remain queryable.

## 6. Match-precedence rules

The service should use deterministic identifiers before fuzzy text. The recommended precedence is:

| Priority | Signal | Default treatment |
|---:|---|---|
| 1 | Explicit WAJENZI canonical entity ID or source-row ID supplied by an authorized supplier | Exact match, subject to authorization and active status. |
| 2 | Exact GTIN/UPC/EAN/ISBN with no conflicting product identity | Auto-match to the unique canonical variant/product; conflict means review. |
| 3 | Exact manufacturer part number plus verified manufacturer/brand | Auto-match only when unique and compatible with specification/pack. |
| 4 | Exact product-family plus normalized brand, unit, pack, specification, and dimensions | Candidate match; auto-accept only when unique and all identity-bearing fields agree. |
| 5 | Classification code plus normalized name and identity-bearing attributes | Candidate discovery and review; classification alone is never identity. |
| 6 | Fuzzy name, category, description, or image similarity | Discovery only; never an automatic canonical merge. |

The identity-bearing attributes depend on the product type. For paint they may include brand, product family, finish, colour, pack size, and unit. For cable they may include conductor, insulation, cross-section, voltage, length, and pack. For tiles they may include material, finish, dimensions, thickness, and pack coverage. For fittings they may include standard, material, diameter, connection type, and quantity. A generic name such as “cement,” “tile,” or “cable” is insufficient for automatic matching.

## 7. Required supplier submission fields

A submission may be received with incomplete data, but the following fields are required before it can create a new canonical entity: supplier organization, supplier source record ID, title, product type/category, unit of sale, country/jurisdiction, evidence or attestation, and a canonicalization decision. GTIN, manufacturer part number, brand, pack size, specification, and dimensions are strongly recommended and should be required for automatic matching when relevant to the product type.

Supplier price, stock, minimum order, lead time, facility, delivery promise, tax treatment, and commercial terms belong to `ProductOffer`, `PriceObservation`, `AvailabilityObservation`, and logistics entities. They are not canonical product identity attributes.

## 8. Stewardship and conflict rules

A match candidate must carry its evidence, algorithm/version, score, conflicting fields, and reviewer decision. A low-confidence or conflicting match must remain visible as `review_required`. A merge is allowed only between canonical entities after steward approval; the losing ID remains resolvable as a redirect.

The master catalogue is authoritative for initial canonical identity, but it is not assumed to be perfect. The current export has 74 duplicate nonempty SKU groups, 1,871 blank SKU rows, 1,388 candidate-key collision groups among roots, and 20 variable roots with no resolved variations when counting by SKU alone. The last figure is largely explained by blank-SKU roots and is corrected by the source-ID parent fallback; three variable roots still have no variation rows after the fallback. These facts require provenance and review states, not silent deduplication.

## 9. Recommended import sequence

First create the master source system and import every CSV row into `source_record`. Second create canonical roots from `simple` and `variable` rows using idempotency on the source row ID. Third resolve and create variants from `variation` rows using the two-step parent rule. Fourth attach taxonomy, brand, units, dimensions, descriptions, and classification assertions with field-level provenance. Fifth publish the master projection only after validation. Later supplier files follow the submission–candidate–decision–attach-or-create path and never bypass the registry.

## 10. Acceptance tests

The first product-registry build is accepted only when the same master CSV can be replayed without creating duplicate canonical entities; all 517 variations resolve to one root; a supplier row that matches an existing canonical product creates no new canonical product; a supplier row with a unique new identity creates exactly one new canonical product after approval; two suppliers with the same SKU remain distinct because supplier/source namespaces differ; supplier prices and stock observations do not modify canonical identity; and every match, skip, creation, merge, and rejection is auditable.
