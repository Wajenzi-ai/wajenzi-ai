# WAJENZI Foundation Workspace

This workspace contains the first implementation slice for WAJENZI: the **ontology and ID registry**. It is intentionally independent of the marketplace UI so that identity, taxonomy, provenance, and canonicalization can stabilize before downstream systems are built.

## Files

| File | Purpose |
|---|---|
| `ontology-and-id-registry.md` | Human-readable product and architecture specification. |
| `ontology.json` | Machine-readable classes, predicates, lifecycle states, and identifier rules. |
| `registry_schema.sql` | PostgreSQL schema for the authoritative registry and catalog foundation. |
| `seed.sql` | Small taxonomy and unit seed for development and testing. |
| `ontology-gap-report.md` | Missing concepts, contradictions, unresolved decisions, and data-acquisition gaps. |
| `refined-ontology.md` | Refined v0.4 ontology specification across identity, location, projects, supply, commerce, logistics, finance, compliance, documents, events, AI, and canonical product ingestion. |
| `refined-ontology.json` | Machine-readable v0.4 ontology manifest and predicate vocabulary. |
| `registry_schema_v02_extension.sql` | PostgreSQL/PostGIS extension for tenancy, project roles, spatial joins, facilities, offers, observations, procurement demand, provenance, and business events. |
| `registry_schema_v03_public_data.sql` | Public-reference layer for versioned boundaries, crosswalks, Gazette units, PPRA references, KNBS indices, and source provenance. |
| `registry_schema_v04_canonical_catalogue.sql` | Master-catalogue authority, source-row maps, supplier submissions, candidate matches, decisions, and product identity keys. |
| `canonical-product-import.md` | Canonical master-product and supplier-ingestion rules. |
| `registry-product-canonicalization.openapi.yaml` | Product-canonicalization API contract. |
| `master-catalogue-manifest.json` | Master catalogue hash, counts, identity policy, and quality notes. |
| `master_canonical_analysis.json` | Deterministic source profile and parent-resolution analysis. |
| `canonical_products_seed.csv` | 12,663 canonical product-root bootstrap records. |
| `canonical_variants_seed.csv` | 517 canonical variant bootstrap records. |
| `supplier_product_submission_template.csv` | Empty supplier submission contract template. |
| `public-data-gap-closure.md` | Public-data research, resolved gaps, residual gaps, and source references. |
| `public-data-source-manifest.json` | Machine-readable public-source authority, vintage, licence, and mapping metadata. |
| `kenya_cod_ab_units.csv` | Normalized Kenya Admin-0/Admin-1/Admin-2 reference units. |
| `kenya_hdx_wards_reference.csv` | Normalized historical HDX ward reference records. |
| `kenya_geoboundaries_adm3_reference.csv` | Normalized open geoBoundaries ADM3 ward records. |
| `kenya_ward_crosswalk_geoboundaries_to_hdx.csv` | Derived source-to-source ward crosswalk with match confidence. |
| `kenya_gazette_2024_203_service_units_enriched.csv` | Parsed and enriched Gazette service-delivery units. |
| `ppra_mrg_april_2026_construction_reference.csv` | Construction-relevant PPRA sampled price-reference rows. |
| `knbs_cipi_q2_2026_reference.csv` | Curated KNBS Q2 2026 construction-cost index observations. |
| `relationship-matrix.csv` | Flat subject–predicate–object relationship contract. |
| `wajenzi-core-ontology.png` | Master relationship diagram. |
| `wajenzi-identity-location.png` | Focused identity/location diagram. |
| `wajenzi-project-procurement.png` | Focused project/procurement diagram. |
| `wajenzi-execution-traceability.png` | Focused execution/traceability diagram. |

## Intended execution order

Create a PostgreSQL database, apply `registry_schema.sql`, then apply `seed.sql`, `registry_schema_v02_extension.sql`, `registry_schema_v03_public_data.sql`, and `registry_schema_v04_canonical_catalogue.sql` after reviewing the P0 decisions in `ontology-gap-report.md` and `canonical-product-import.md`. Load the master source rows idempotently by `(wajenzi-master-catalogue-v1, source_row_id)`, create the 12,663 canonical roots and 517 variants, and then expose product-canonicalization endpoints. Later supplier imports must write source submissions first and should not create canonical products without an explicit matching decision or approved stewardship rule.

## Refined v0.4 build gate

Before production schema freeze, approve the following: tenant/workspace boundary; canonical ID policy; company versus organization-role semantics; project ownership and project-role semantics; product versus variant versus offer identity; Kenya location-source hierarchy; event/audit envelope; data sensitivity and access rules; and the human-approval policy for AI-derived assertions and consequential actions.

The first controlled pilot should prove one complete traversal: Person → UserAccount → OrganizationMembership → OrganizationRole → ProjectRoleAssignment → Project → Site → GeoObservation → GeographicUnit → ProjectRequirement → ProductSpecification → Product → ProductVariant → ProductOffer → Facility → PriceObservation/AvailabilityObservation → ProcurementRequest → RFQ → Quotation → PurchaseOrder. The product-specific pilot must also prove: master source row → canonical product root/variant → supplier submission → candidate match → `matched_existing_product` with no new canonical ID, followed by an approved unmatched submission that creates exactly one new canonical product.

## First test scenario

1. Create two organizations representing two suppliers.
2. Create one canonical `product` entity for a 50 kg Portland cement product.
3. Create two `product_listing` entities, each with a different supplier SKU and both pointing to the same canonical product.
4. Resolve each supplier SKU through the namespaced identifier resolver.
5. Add `classified_as`, `has_product_type`, `listed_by`, and `offered_as` assertions.
6. Attempt the same import twice and confirm that the source record and external identifier remain idempotent.
7. Create a duplicate candidate, approve a merge, and confirm that the old ID resolves to the surviving entity while the audit and merge events remain available.

## Important boundary

Do not add orders, payments, escrow, delivery execution, customer recommendations, or autonomous procurement to this schema until the identity and canonicalization tests pass. Those capabilities depend on the registry but should not compromise it.
