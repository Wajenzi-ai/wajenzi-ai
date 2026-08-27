# WAJENZI Step-by-Step Implementation Roadmap

**Starting point:** Ontology and ID registry  
**Document status:** Draft v0.1  
**Author:** Manus AI

## 1. Build strategy

WAJENZI should be built as a sequence of dependable data and workflow capabilities, not as a large marketplace released all at once. The platform concept describes a future ecosystem containing a master product catalog, supplier catalogs, AI reasoning, RFQs, quotations, escrow, logistics, analytics, and construction knowledge. Those capabilities all depend on the same prerequisite: **stable identities and explicit relationships**.

The first release therefore establishes the registry as the authoritative source. Every later search index, graph, vector store, analytics model, marketplace listing, and AI agent should consume registry identifiers rather than inventing its own product or supplier identities.

## 2. Staged roadmap

| Stage | Capability | Primary outcome | Exit gate |
|---|---|---|---|
| 1 | Ontology and ID registry | Canonical entities, namespaced IDs, taxonomy, provenance, merges, and relationship assertions. | Registry acceptance tests pass with duplicate and multi-supplier scenarios. |
| 2 | Catalog ingestion and canonicalization | Import CSV/Excel/manual records into source records, normalize fields, match listings to master products, and route uncertain matches to review. | A controlled supplier catalog can be re-imported idempotently with measured match quality. |
| 3 | Supplier onboarding | Organizations, supplier roles, verification evidence, service locations, listings, stock observations, and basic supplier quality signals. | A supplier can onboard, publish a catalog, and maintain listings without changing canonical product identity. |
| 4 | Procurement marketplace | Search, product detail, comparison, cart, quotation, and RFQ workflows built on registry-backed catalog data. | Buyers can submit a small procurement request and compare supplier responses. |
| 5 | Construction knowledge graph | Compatibility, alternatives, installation requirements, standards, applications, and project dependencies. | Relationship assertions are sourced, reviewable, and useful in a bounded construction use case. |
| 6 | Pricing and logistics intelligence | Price observations, inventory, service regions, delivery promises, and historical trends. | The platform can compare offers using explicit location, time, currency, and fulfillment context. |
| 7 | Transactions and trust | Orders, payments, escrow, refunds, disputes, supplier scoring, and audit-grade financial events. | A controlled transaction flow reconciles commercially and operationally. |
| 8 | AI procurement and estimation | Retrieval, recommendations, material matching, quantity interpretation, and budget assistance. | AI outputs cite their product, relationship, and source evidence and can be reviewed. |
| 9 | Construction intelligence network | Analytics, forecasting, external integrations, autonomous workflows, and broader regional coverage. | Expansion does not compromise registry quality, provenance, privacy, or operational reliability. |

## 3. Stage 1: first implementation milestone

### 3.1 Deliverables

The Stage 1 package is contained in this workspace:

| Deliverable | Description |
|---|---|
| Ontology specification | Defines entity classes, taxonomy layers, predicates, lifecycle, and canonical/source separation. |
| ID registry rules | Defines immutable canonical IDs, namespaced external identifiers, redirects, aliases, and merge invariants. |
| PostgreSQL schema | Implements the authoritative registry, taxonomy, source records, products, listings, assertions, matches, merges, audit, and outbox. |
| Ontology manifest | Machine-readable classes, predicates, lifecycle states, and identifier rules. |
| Seed taxonomy | Small development seed across structural materials, roofing, electrical, plumbing, finishes, doors/windows, and outdoor products. |
| API contract | Minimal endpoints for entity creation, identifier resolution, assertions, and merges. |
| Workspace guide | Run order and a first end-to-end test scenario. |

### 3.2 Recommended first sprint

The first sprint should implement the registry service and test it with a deliberately small dataset. The work should be completed in this order.

| Work item | Result |
|---|---|
| Create PostgreSQL database and apply schema | Empty authoritative registry is available. |
| Apply seed taxonomy and units | Initial category, subcategory, product-type, and measurement vocabulary exists. |
| Implement entity creation | Canonical entities and source-backed records can be created idempotently. |
| Implement identifier resolver | Namespaced supplier SKUs and aliases resolve to entities and merge successors. |
| Implement relationship assertions | Product classification, listing ownership, product matching, and taxonomy relationships are stored with provenance. |
| Implement merge workflow | Duplicate entities can be consolidated without deleting historical references. |
| Add audit and outbox writes | All registry changes are reviewable and ready for downstream projections. |
| Run acceptance scenarios | The registry passes the scenarios defined in `README.md`. |

## 4. Stage 1 acceptance scenarios

### Scenario A: one product, two suppliers

Create one canonical product for a 50 kg Portland cement product. Create two supplier organizations and two supplier listings with different SKUs. Both listings must resolve to the same canonical product while preserving their separate titles, SKUs, source records, and future commercial observations.

### Scenario B: idempotent re-import

Import the same source record twice. The second import must resolve to the existing source record and listing rather than create a second canonical product. If the supplier changes a description or price, the source observation may be versioned, but the product identity must remain stable.

### Scenario C: duplicate review and merge

Create two candidate products with evidence that they represent the same canonical item. The matching workflow must record the evidence and decision. After approval, the losing ID must resolve to the surviving ID, and prior assertions and source records must remain auditable.

### Scenario D: uncertain match

Import a listing with incomplete name, unit, or specification data. The system must allow a `review_required` result and must not force a low-confidence match merely to make the catalog appear complete.

## 5. Metrics for the first milestone

The first milestone should measure identity quality rather than marketplace scale.

| Metric | Initial target |
|---|---:|
| Duplicate source-record creation on replay | 0 |
| Unnamespaced external identifiers accepted | 0 |
| Registry IDs reused after deprecation or merge | 0 |
| Product listings incorrectly treated as canonical products | 0 in acceptance scenarios |
| Assertions without provenance | 0 for imported or inferred assertions |
| Merge operations without audit events | 0 |
| Low-confidence matches auto-published | 0 |
| Required resolver success on canonical IDs, active aliases, and merged IDs | 100% |

These targets are engineering gates, not business projections. They should be tested automatically in CI before the platform moves to catalog ingestion.

## 6. Decisions to keep explicit

The following decisions should be confirmed before production implementation:

| Decision | Recommended default |
|---|---|
| Authoritative store | PostgreSQL initially. |
| Canonical ID | Opaque UUIDv7 generated by the application. |
| Public resolution | Stable registry URI with redirect behavior after merges. |
| Taxonomy governance | Versioned terms with steward approval for structural changes. |
| External ID scope | Namespaced by source system, supplier, country, or issuing authority as appropriate. |
| Match policy | Exact identifiers first, deterministic normalized keys second, fuzzy/semantic candidates last, with human review for uncertainty. |
| Graph/search architecture | Later projections from the registry, not independent identity stores. |
| Sensitive information | Keep private identity, KYC, payment, and authentication data outside the public registry response. |
| First market dataset | One controlled market and a small number of categories before broad regional ingestion. |

## 7. What should be built next

The next concrete build should be a small registry service around the existing schema and API contract. It should not yet be the complete WAJENZI marketplace. The service should expose the four registry operations, load the seed taxonomy, and demonstrate the four acceptance scenarios above. Once that foundation is working, the next step is **catalog ingestion and canonicalization**, beginning with one supplier file and a measured review queue.

## References

[1]: file:///home/ubuntu/upload/WAJENZI.AI4.pdf "WAJENZI.AI4 — user-provided platform concept document; especially Chapters 9, 10, 15, 20, 21, and 22"
