# WAJENZI Foundation: Ontology and ID Registry Specification

**Document status:** Draft v0.1  
**Author:** Manus AI  
**Scope:** First implementation phase for the WAJENZI construction-intelligence platform

## 1. Purpose

The first platform capability should not be the marketplace interface. It should be the **identity and meaning layer** underneath the marketplace: a canonical ontology that defines what WAJENZI knows, and an ID registry that ensures every important object can be identified, referenced, reconciled, audited, and connected over time.

This approach follows the central architectural principle in the supplied WAJENZI concept: **one master product, many supplier listings, many prices, and many inventory positions** [1]. The registry must therefore distinguish canonical entities from source-specific records instead of treating every supplier SKU as a new product.

> **Design principle:** A supplier listing is evidence about a product; it is not automatically the product itself.

The foundation must support the later marketplace, supplier onboarding, RFQ, pricing, logistics, knowledge graph, recommendations, estimation, and AI-agent capabilities without requiring a destructive rewrite of identifiers.

## 2. Requirements extracted from the WAJENZI concept

The supplied document establishes the following requirements for the foundation layer.

| Requirement | Implication for the ontology and registry |
|---|---|
| Master catalog separate from supplier catalogs | Create a canonical `Product` entity and a separate `ProductListing` entity. |
| One product linked to many suppliers | Use explicit `offered_by` / listing relationships rather than copying supplier records into products. |
| Taxonomy from category to product type to attributes and applications | Represent taxonomy terms and hierarchical relationships as first-class, versionable records. |
| Supplier verification and scoring | Represent organizations, organization roles, verification evidence, and later performance observations separately. |
| Construction knowledge graph | Support typed relationships between products, materials, standards, projects, locations, and installation knowledge. |
| Data quality and normalization pipeline | Attach source provenance, confidence, match decisions, and quality status to imported records. |
| Multiple databases in the long term | Keep the operational registry authoritative; search, vector, graph, and analytics stores become projections of it. |
| Catalog imports from CSV, Excel, PDF, images, and APIs | Give each source record an external identifier and preserve the original source evidence. |

The first milestone should implement only the identity, taxonomy, provenance, and canonicalization primitives. Commercial transactions, payments, escrow, logistics execution, AI memory, and autonomous procurement should remain later bounded contexts.

## 3. Ontology boundary

### 3.1 Foundational entity classes

The initial ontology uses the following classes. All classes receive a stable registry identifier.

| Class | Meaning | MVP status |
|---|---|---:|
| `Organization` | A legal or operating business entity. | Required |
| `OrganizationRole` | A role an organization plays, such as supplier, manufacturer, distributor, contractor, developer, or service provider. | Required |
| `Person` | A human actor associated with an account, organization, or project. | Defer sensitive profile fields |
| `Product` | The canonical master-catalog concept representing a standardized construction product. | Required |
| `ProductListing` | A supplier-specific representation of a product, including supplier SKU, title, source description, availability, and later price. | Required |
| `ProductType` | A product-class concept, such as Portland cement, reinforcement bar, roofing sheet, pipe, or paint. | Required |
| `Category` | A navigational and semantic taxonomy node, such as Structural Materials or Plumbing. | Required |
| `Brand` | A commercial brand associated with a product. | Required |
| `Material` | A material or substance used in, or represented by, a product. | Required |
| `Unit` | A measurement unit, such as bag, kilogram, metre, litre, or piece. | Required |
| `AttributeDefinition` | A defined product property, such as strength, diameter, colour, weight, or corrosion resistance. | Required |
| `Location` | A country, region, town, address, warehouse, service area, or other geographic reference. | Required |
| `Project` | A built-environment project that consumes products or defines procurement context. | Later MVP extension |
| `Standard` | A construction, safety, regulatory, or manufacturer standard. | Later MVP extension |
| `Document` | A catalog, certificate, datasheet, license, image, PDF, or other evidence artifact. | Required for provenance |
| `RelationshipAssertion` | A typed, sourced claim that connects two entities. | Required |

### 3.2 Canonical versus source-specific objects

WAJENZI should use three identity levels.

| Level | Example | Authority |
|---|---|---|
| Canonical entity | A standardized 50 kg Portland cement product concept | WAJENZI registry |
| Source record | A row from Supplier A’s Excel catalog | Supplier or import source |
| Marketplace observation | A price, stock position, delivery promise, or performance event | WAJENZI operational systems |

A `Product` may have many `ProductListing` records. A `ProductListing` must retain its source-specific title, SKU, description, images, and source reference even after it is matched to a canonical `Product`. Commercial observations must not overwrite the canonical product identity.

### 3.3 Initial taxonomy model

The first taxonomy release should support the structure below without attempting to model every construction domain at once.

```text
Category
└── Subcategory
    └── ProductType
        ├── Brand
        ├── Material
        ├── AttributeDefinition → AttributeValue
        ├── Application
        └── Applicable Standard
```

The initial seed categories should reflect the concept document’s examples: Structural Materials, Roofing, Electrical, Plumbing, Finishes, Doors and Windows, and Outdoor Products. These are seed terms, not a permanent limitation on the taxonomy.

### 3.4 Initial relationship vocabulary

Relationships are represented as typed assertions rather than hard-coded columns wherever the relationship may evolve, carry provenance, or require a confidence score.

| Predicate | Domain | Range | Meaning |
|---|---|---|---|
| `has_parent` | Category or taxonomy term | Category or taxonomy term | Places a term in a hierarchy. |
| `classified_as` | Product or ProductType | Category | Assigns a product or type to a taxonomy category. |
| `has_product_type` | Product | ProductType | Connects a canonical product to its type. |
| `has_brand` | Product | Brand | Associates a product with a brand. |
| `manufactured_by` | Product | Organization | Identifies the manufacturer where known. |
| `has_material` | Product | Material | Identifies material composition or primary material. |
| `has_attribute` | Product | AttributeDefinition | Indicates that a product has a defined attribute value. |
| `offered_as` | ProductListing | Product | Matches a source listing to a canonical product. |
| `listed_by` | ProductListing | Organization | Identifies the supplier publishing the listing. |
| `compatible_with` | Product | Product | States that two products can work together under a stated context. |
| `alternative_to` | Product | Product | States that one product may substitute for another under conditions. |
| `requires` | Product or ProductType | Product or Material | Expresses a procurement or installation dependency. |
| `used_for` | Product or Material | Application or ProjectPhase | Connects an item to a use case. |
| `applicable_standard` | Product or Project | Standard | Links an entity to a standard or compliance requirement. |
| `installed_with` | Product | Product or Tool | Links a product to required installation items. |
| `available_in` | ProductListing or Organization | Location | Records geographic availability or service coverage. |
| `evidenced_by` | Any governed entity or assertion | Document | Links a claim to source evidence. |

A relationship assertion should carry `source`, `confidence`, `valid_from`, `valid_to`, and `status`. For example, `alternative_to` is not universally true; it may depend on structural grade, local standard, climate, project phase, or an engineer’s approval.

## 4. ID registry design

### 4.1 Canonical identity

Every registry entity receives an immutable, opaque canonical identifier. The identifier is generated once and is never recycled, even if the entity is deprecated or merged.

Recommended format:

```text
Canonical database key:  UUIDv7 generated by the application
Public registry URI:     https://id.wajenzi.ai/e/{entity_uuid}
Human reference:         WJ-{TYPE}-{entity_uuid}
```

The UUID is the authoritative value. The human reference and URI are representations and must not be parsed to infer business meaning. A type prefix is for usability only; `entity_type` in the registry remains authoritative.

The application should generate UUIDv7 values to provide time-ordered identifiers. A database-generated random UUID fallback may be used during early development, but the public contract should remain opaque and stable.

### 4.2 Identifier categories

The registry must distinguish WAJENZI identifiers from identifiers assigned by other systems.

| Identifier category | Example | Mutability | Registry rule |
|---|---|---:|---|
| Canonical entity ID | WAJENZI product UUID | Immutable | One per entity; never reused. |
| Public registry URI | `https://id.wajenzi.ai/e/...` | Immutable | Resolves to the canonical entity or its successor. |
| Supplier SKU | Supplier A `CEM-50KG-001` | Source-controlled | Unique only within the supplier/source namespace. |
| Manufacturer part number | Manufacturer code | Source-controlled | Preserve exactly and normalize only for matching. |
| Business registration number | Legal registration identifier | Source-controlled | Namespace by country and authority. |
| External catalog record ID | ERP or import row ID | Source-controlled | Must include source-system namespace. |
| Alias or former ID | Old product code or spelling | Mutable reference | Redirect to the canonical entity; never silently delete. |

The unique key for external identifiers is `(namespace, identifier_type, identifier_value)`, not the identifier value by itself. The same SKU may legally occur at different suppliers.

### 4.3 Registry invariants

The following rules are non-negotiable.

1. **An ID identifies an entity, not a record occurrence.** A repeated supplier upload must not create a new canonical product merely because it appears in a new file.
2. **IDs are never reused.** Deleted, blocked, deprecated, and merged entities remain resolvable as historical registry records.
3. **Merges preserve history.** When two entities are consolidated, the losing ID becomes a redirect with a `merged_into` target.
4. **External identifiers are namespaced.** A supplier SKU without its source namespace is not globally meaningful.
5. **Identity and attributes are separate.** A changed price, description, stock level, or image does not create a new product ID.
6. **Source evidence is retained.** Every imported or inferred attribute must be traceable to a source record, document, user, or system process.
7. **Confidence is explicit.** A machine match is not equivalent to an approved canonicalization decision.
8. **Sensitive identity data is isolated.** Personal contact, authentication, payment, and KYC data should not be stored in the public registry surface.
9. **Identifiers are not business logic.** Consumers must use registry lookups and typed relationships rather than decoding ID strings.
10. **Registry writes are idempotent.** Replaying the same source event must produce the same entity or a controlled new version, not duplicate identity.

### 4.4 Entity lifecycle

```text
DRAFT → ACTIVE → DEPRECATED
   │        │          │
   └──────→ BLOCKED    └──→ MERGED → REDIRECT
```

`DRAFT` is used for imported or manually created entities that have not passed minimum validation. `ACTIVE` is publishable. `DEPRECATED` remains valid for historical references but should not be selected for new transactions. `BLOCKED` is retained but excluded from normal use. `MERGED` points to a surviving entity and must be resolvable through the registry.

## 5. Registry architecture

The registry is the authoritative operational service. Other systems consume projections.

```text
Source systems
  ├── Supplier catalog uploads
  ├── Manufacturer feeds
  ├── Manual entry
  ├── PDF / image extraction
  └── ERP or API integrations
          │
          ▼
Source records + documents
          │
          ▼
Validation → normalization → candidate matching → stewardship approval
          │
          ▼
Canonical registry (authoritative)
          ├── Product catalog projection
          ├── Search projection
          ├── Knowledge-graph projection
          ├── Vector / embedding projection
          └── Analytics projection
```

For the first implementation, PostgreSQL is sufficient as the authoritative registry and catalog store. A graph database, search engine, and vector store should be treated as later read models. The registry must publish change events or an outbox stream so those projections can be rebuilt without changing canonical IDs.

### 5.1 Required registry components

| Component | Responsibility |
|---|---|
| Entity registry | Stores canonical identity, entity type, lifecycle state, and timestamps. |
| Identifier resolver | Resolves canonical IDs, external IDs, aliases, and merged IDs. |
| Ontology catalog | Stores classes, categories, attributes, units, and predicate definitions. |
| Source registry | Records source systems, import batches, documents, and source-record IDs. |
| Match queue | Holds candidate matches requiring automated or human review. |
| Assertion store | Stores typed relationships with provenance and confidence. |
| Merge and redirect service | Consolidates duplicates while preserving historical references. |
| Audit/outbox | Records changes and emits projection events. |

## 6. MVP data contracts

### 6.1 Create a canonical entity

```json
{
  "entity_type": "product",
  "canonical_name": "Portland cement, 50 kg bag",
  "status": "draft",
  "source": {
    "source_system": "supplier-import",
    "source_record_id": "supplier-a:row:1842",
    "document_id": "doc_01J..."
  },
  "identifiers": [
    {
      "namespace": "supplier-a",
      "identifier_type": "supplier_sku",
      "value": "CEM-50KG-001"
    }
  ]
}
```

The create operation should be idempotent on a source-record key. It should return the canonical entity ID, whether the record was newly created, matched to an existing entity, or placed in a review queue.

### 6.2 Resolve an identifier

```json
{
  "namespace": "supplier-a",
  "identifier_type": "supplier_sku",
  "value": "CEM-50KG-001"
}
```

Response shape:

```json
{
  "resolved": true,
  "entity_id": "0190f000-0000-7000-8000-000000000001",
  "entity_type": "product_listing",
  "canonical_entity_id": "0190f000-0000-7000-8000-000000000002",
  "resolution": "external_identifier",
  "status": "active"
}
```

The resolver must follow merge redirects and return both the matched source entity and, when available, the canonical product entity.

### 6.3 Assert a relationship

```json
{
  "subject_id": "0190f000-0000-7000-8000-000000000002",
  "predicate": "classified_as",
  "object_id": "0190f000-0000-7000-8000-000000000010",
  "context": {
    "taxonomy_version": "2026.1"
  },
  "provenance": {
    "source_record_id": "supplier-a:row:1842",
    "method": "steward_approved"
  },
  "confidence": 0.98,
  "status": "active"
}
```

### 6.4 Merge duplicate entities

```json
{
  "from_entity_id": "0190f000-0000-7000-8000-000000000111",
  "into_entity_id": "0190f000-0000-7000-8000-000000000002",
  "reason": "same manufacturer, product type, strength, pack size, and part number",
  "approved_by": "user_01J..."
}
```

A merge must create an auditable redirect and must not physically delete the losing entity.

## 7. First implementation slice

The first build should be intentionally narrow.

### In scope

The initial release should include the entity registry, identifier resolution, category and product-type taxonomy, organizations and organization roles, canonical products, supplier product listings, source records, documents, relationship assertions, lifecycle states, audit records, and a basic match-review queue.

The first data seed should contain a small, curated catalog from one market and a limited number of categories. The goal is to validate identity rules and reconciliation quality, not to ingest the entire construction industry.

### Out of scope for this slice

Payments, escrow, orders, delivery execution, subscriptions, customer recommendations, autonomous agents, production-grade embeddings, dynamic price forecasting, full standards compliance automation, and large-scale ERP synchronization should follow after the registry has demonstrated stable identity resolution.

## 8. Acceptance criteria

| Area | Acceptance criterion |
|---|---|
| Entity creation | Creating the same source record twice is idempotent. |
| Identifier resolution | A namespaced supplier SKU resolves to the listing and its canonical product when matched. |
| Product separation | A canonical product can have at least two supplier listings without duplicating the product. |
| Provenance | Every imported field and relationship can be traced to a source record or steward decision. |
| Merge safety | A merged ID resolves to its surviving entity and remains visible in audit history. |
| Taxonomy | A product can be assigned to a category, product type, brand, material, unit, and attribute values. |
| Relationship quality | Assertions support predicate, confidence, status, validity dates, and provenance. |
| Lifecycle | Draft, active, deprecated, blocked, and merged states are enforced. |
| Sensitive data | Public registry responses do not expose private contact, payment, or KYC fields. |
| Projection readiness | Registry changes can be emitted to later search, graph, vector, and analytics projections. |

## 9. Recommended next build step

Implement the PostgreSQL migration in `registry_schema.sql`, then build a small registry API with four endpoints: create entity, resolve identifier, create relationship assertion, and merge entities. Seed the category and product-type taxonomy with a deliberately small set of construction products. Only after those workflows pass the acceptance criteria should supplier catalog ingestion and the marketplace UI begin.

## References

[1]: file:///home/ubuntu/upload/WAJENZI.AI4.pdf "WAJENZI.AI4 — user-provided platform concept document; especially Chapters 9, 10, 15, 20, 21, and 22"
