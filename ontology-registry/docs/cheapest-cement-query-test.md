# Multi-hop ontology test: cheapest cement supplier near a Nairobi project site

**Query tested:** “Find the cheapest cement supplier within 50 km of Nairobi project site with verified stock.”

**Test date:** 27 August 2026  
**Result:** **The ontology supports the query path, but the current loaded data cannot produce a supplier answer without inventing facts.**

## 1. Query semantics

The query is interpreted as a constrained procurement query rather than a simple product search. “Cement” identifies candidate canonical products but does not by itself determine the required grade, strength class, bag size, standard, or unit of comparison. “Nairobi project site” must mean a specific project-linked site geometry; the system must not silently replace it with the Nairobi county centroid. “Within 50 km” means a geodesic or route-distance policy that must be declared. “Cheapest” means the lowest comparable price per normalized unit, currency, tax basis, and pack specification. “Verified stock” means a recent availability observation whose verification status and supporting evidence meet an approved policy.

| Parameter | Required interpretation |
|---|---|
| Product intent | A canonical cement product or variant with a complete identity-bearing specification. |
| Origin/anchor | `Project → ProjectSite → Site.geometry` or an approved project-site address/geo-observation. |
| Search radius | 50,000 metres from the project site, using a declared distance method. |
| Supplier candidate | Supplier organization connected to a product offer at a facility. |
| Price | Latest comparable supplier-specific price observation, normalized by unit, currency, quantity, and tax basis. |
| Stock | Latest sufficiently fresh availability observation with accepted verification status/evidence. |
| Output | Supplier, canonical product/variant, facility, distance, price basis, stock quantity, observation times, confidence, and evidence. |

## 2. Ontology traversal

```text
Project
  → ProjectSite
    → Site
      → geometry / GeoObservation
        → distance filter ≤ 50 km
          → Facility
            → Organization / Supplier
            → ProductOffer
              → Product / ProductVariant
              → PriceObservation
              → AvailabilityObservation
                → verification status and Evidence
```

The ontology contains the required conceptual objects and relationships. The operational registry still needs the corresponding records before the traversal can be executed.

## 3. Executed test result

The deterministic test ran against the current WAJENZI canonical and reference package. It found **12,663 canonical product roots** and **76 lexical cement/concrete-related candidate roots**. The 76 are discovery candidates, not a validated cement product set; the sample includes concrete tools and tile grout as well as cement products, demonstrating why product type, specification, and category constraints are necessary.

The test also found **2 PPRA reference rows containing cement-related text**, but those are public market-reference observations, not supplier offers tied to a WAJENZI facility, project site, verified stock observation, or live commercial agreement. They must not be used to claim a cheapest supplier.

| Gate | Result | Explanation |
|---|---|---|
| Canonical product resolution | **PASS** | The master catalogue can produce candidate canonical products. |
| Project-site anchor | **FAIL** | No project/site geometry or approved Nairobi project-site record is loaded. |
| Facility distance filter | **NOT EXECUTED** | No supplier facility geometries are loaded. |
| Supplier resolution | **FAIL** | No operational supplier organization/offer records are loaded in the test package. |
| Supplier-specific price | **FAIL** | No supplier `PriceObservation` records are loaded. |
| Verified stock | **FAIL** | No `AvailabilityObservation` records are loaded, and the current availability schema lacks an explicit verification-status field. |
| Cheapest supplier result | **NOT ANSWERABLE** | Returning a supplier would be fabricated. |

## 4. Query shape for the operational database

The following PostgreSQL/PostGIS shape is the intended query after the missing records and verification field are available. It deliberately uses a project site, not a Nairobi centroid, and compares prices only after an explicit normalization policy is supplied.

```sql
WITH project_anchor AS (
    SELECT s.entity_id AS site_id,
           s.geometry::geography AS site_geography
    FROM project p
    JOIN project_site ps ON ps.project_entity_id = p.entity_id
    JOIN site s ON s.entity_id = ps.site_entity_id
    WHERE p.entity_id = :project_id
      AND ps.site_role = 'primary'
      AND s.geometry IS NOT NULL
), eligible_offers AS (
    SELECT po.entity_id AS offer_id,
           po.product_variant_entity_id AS variant_id,
           po.seller_organization_id AS supplier_id,
           po.facility_entity_id AS facility_id,
           f.geometry::geography AS facility_geography,
           ST_Distance(f.geometry::geography, pa.site_geography) AS distance_m,
           pr.amount,
           pr.currency_code,
           pr.unit_entity_id AS price_unit_id,
           pr.tax_basis,
           pr.observed_at AS price_observed_at,
           av.quantity AS stock_quantity,
           av.unit_entity_id AS stock_unit_id,
           av.availability_state,
           av.observed_at AS stock_observed_at,
           av.verification_status,
           av.verification_evidence_id
    FROM project_anchor pa
    JOIN product_offer po ON po.status = 'active'
    JOIN facility f ON f.entity_id = po.facility_entity_id
    JOIN LATERAL (
        SELECT p1.*
        FROM price_observation p1
        WHERE p1.product_offer_entity_id = po.entity_id
        ORDER BY p1.observed_at DESC
        LIMIT 1
    ) pr ON true
    JOIN LATERAL (
        SELECT a1.*
        FROM availability_observation a1
        WHERE a1.product_offer_entity_id = po.entity_id
          AND a1.availability_state = 'available'
          AND a1.verification_status = 'verified'
          AND a1.observed_at >= now() - (:stock_freshness_hours || ' hours')::interval
        ORDER BY a1.observed_at DESC
        LIMIT 1
    ) av ON true
    WHERE ST_DWithin(f.geometry::geography, pa.site_geography, 50000)
), comparable AS (
    SELECT eo.*
    FROM eligible_offers eo
    WHERE eo.currency_code = :currency_code
      AND eo.price_unit_id = :normalized_price_unit_id
      AND eo.tax_basis = :tax_basis
      AND eo.variant_id = ANY(:accepted_cement_variant_ids)
)
SELECT c.*, o.canonical_name AS supplier_name, v.canonical_name AS variant_name
FROM comparable c
JOIN registry_entity o ON o.entity_id = c.supplier_id
JOIN registry_entity v ON v.entity_id = c.variant_id
ORDER BY c.amount ASC, c.distance_m ASC, c.stock_observed_at DESC;
```

The query requires a small v0.5 schema patch adding availability verification fields and evidence linkage. It also requires a price-normalization function or policy; raw amounts from different units, pack sizes, currencies, or tax bases must not be sorted as if directly comparable.

## 5. Data needed to make the answer operational

The minimum complete test fixture is one project with a primary site geometry, two or more verified supplier organizations, two or more supplier facilities with coordinates, supplier offers attached to canonical cement products or variants, current price observations with currency/unit/tax basis, current availability observations with verification status and evidence, and a declared freshness window such as 24 hours.

Once that fixture exists, the expected assertion is that the answer includes the chosen supplier, canonical product/variant ID, facility ID, distance method and value, normalized price, stock quantity, observation timestamps, verification evidence, and a warning if any observation is stale or estimated.

## 6. Conclusion

This test proves that the WAJENZI ontology is structurally capable of answering the multi-hop question. It also proves that the current foundation is correctly refusing to answer it prematurely. The next implementation gate is not more taxonomy; it is loading operational supplier, facility, offer, project-site, price, and verified-stock records and adding the verification/evidence fields required for a defensible result.
