# WAJENZI Ontology Refinement: Gap Report and Decisions

**Document status:** Draft v0.2 — refined from attached PRD and ontology guides  
**Author:** Manus AI  
**Scope:** Identity, location, users, organizations, projects, products, procurement, commerce, logistics, finance, documents, compliance, events, and AI traceability

> **Important note:** This is an information-architecture and data-modeling specification, not legal, tax, financial, or regulatory advice. The Kenya-specific controls must be reviewed against current official sources and by qualified Kenyan professionals before production use.

## 1. Executive conclusion

The attached material is unusually comprehensive in describing workflows, but it is not yet a single implementable ontology. It contains a strong north-star graph—person or user → organization → project → site → building → work → BOQ → product → supplier → procurement → logistics → payment → event—and it correctly emphasizes permanent identity, provenance, and traceability [1] [2]. The main work required before implementation is to **separate concepts that are currently overloaded**, especially user versus person, company versus role, location versus address, product versus offer, document versus evidence, and event versus audit record.

The ontology should be implemented as a **typed, temporal, provenance-aware graph**. A shared registry should own identity and canonical relationships; project, marketplace, POS, procurement, logistics, finance, compliance, and AI should be bounded contexts that reference the same IDs and publish events. The ontology must not become one giant table, and the operational modules must not create competing identities.

## 2. What is already strong in the source material

| Strength | Source evidence | Refinement retained |
|---|---|---|
| Permanent identity for major entities | The PRD requires every important entity, transaction, document, project, person, organization, location, activity, and event to be identifiable [1]. | Retain a universal registry with immutable canonical IDs and namespaced external IDs. |
| Person/account/organization/role distinction | The user-persona specification explicitly separates Person, User Account, Organization, Persona, Role, Actor, and Project Role [2]. | Make these separate classes and avoid a single `user_type` field. |
| Canonical product versus supplier offer | The supplier POS specification states that Wajenzi owns product identity while the supplier owns the commercial offer [3]. | Use `Product`, `ProductOffer`, `Facility`, `PriceObservation`, and `AvailabilityObservation`. |
| Location-aware procurement | The Kenya location guide separates county, sub-county, ward, division, location, sub-location, postal, supplier facility, route, and delivery-zone concepts [4]. | Use typed geographic hierarchies, versioned boundaries, spatial-join assertions, and facility-level supply. |
| Project ownership versus initiation | The collaborative-project workflow states that the creator is not automatically the owner [5]. | Model `ProjectInitiator` and `ProjectOwner` separately, with project-scoped party roles. |
| Evidence-linked commercial lifecycle | The Kenya commercial blueprint models contracts, obligations, milestones, measurements, payment applications, certificates, retention, evidence, claims, and closeout [6]. | Add typed commercial records and evidence/approval relationships instead of storing only documents. |
| Event-driven traceability | The event workflow requires actor, entity, project, order, transaction, timestamp, location, state change, source, correlation, and parent-event fields [7]. | Separate business events, audit events, workflow events, and notifications while preserving correlation. |
| Human-in-the-loop AI | The PRD and AI/persona material require AI confidence, sources, tools, actions, and human approval for consequential actions [1] [2]. | Add `AIJob`, `AIOutput`, `Recommendation`, `ActionRequest`, and approval/provenance links. |

## 3. Critical gaps before production ontology freeze

### 3.1 Identity and multi-tenancy

The source material names User ID, Person ID, Account ID, Organization ID, Business ID, Supplier ID, Professional ID, and many role-specific IDs, but it does not define which are canonical identities and which are views or credentials. It also requires multi-tenancy but does not define the tenant boundary [1].

**Required decision:** Use `Person` as the human identity, `UserAccount` as the authentication/account object, `Organization` as the legal or operating entity, `OrganizationMembership` as the person-to-organization relationship, and `ProjectRoleAssignment` as the project-scoped responsibility. Use `OrganizationRole` for supplier, contractor, manufacturer, distributor, retailer, logistics provider, and similar capacities. Do not create a new canonical person or organization identity for every persona or role.

**Still missing:** the tenant model, workspace model, organization hierarchy, account recovery rules, delegated administration, user consent, and whether a project can be jointly owned by multiple parties.

### 3.2 Company, supplier, contractor, manufacturer, and professional modeling

The PRD lists Company, Contractor, Supplier, Manufacturer, Distributor, Consultant, and similar items as if they are parallel entity types [1]. The persona guide correctly says that these should not be mutually exclusive account types [2].

**Required decision:** `Organization` is the base class. `Company` is an organization kind or UI label, not a second identity. Supplier, contractor, manufacturer, distributor, retailer, professional firm, logistics provider, and financial institution are organization roles with effective dates and verification requirements. A single organization may hold multiple roles, and a person may act for multiple organizations.

**Still missing:** authoritative rules for parent/subsidiary relationships, branches, franchises, joint ventures, consortiums, authorized representatives, agency, and whether an individual can sell as an unincorporated business.

### 3.3 Location and jurisdiction

The attached Kenya CSV contains only `County` and `Sub_County` names. It has no official codes, aliases, boundary geometries, ward data, service-delivery hierarchy, postal references, address points, road network, spatial reference system, source metadata, or temporal validity [8]. The location guide warns that electoral, statistical, county-planning, and national-government service-delivery hierarchies must not be collapsed [4].

**Required decision:** model `Place` as an abstract family and separate `Address`, `GeoObservation`, `GeographicUnit`, `Facility`, `Site`, `Property`, `Parcel`, `Jurisdiction`, `DeliveryZone`, and `Route`. Every `located_in` result becomes a temporal `SpatialMembership` assertion with hierarchy type, boundary version, method, distance-to-boundary, confidence, and provenance.

**Still missing:** authoritative and licensed feeds for current wards, divisions, locations, sub-locations, postal areas, roads, parcels, planning jurisdictions, and address normalization. The current CSV is suitable only as a bootstrap seed and must not be treated as the final operational location authority.

### 3.4 Project, property, site, building, and asset

The PRD uses Project, Property, Site, Building, Floor, Space, Room, Structure, System, Element, and Component, but does not define their cardinality or lifecycle [1]. A property can exist before a project, a project can include multiple sites, and a building can contain systems and elements that later become operational assets.

**Required decision:** `Property` and `Parcel` represent the real-estate context; `Project` represents a temporary or ongoing intervention; `Site` represents a project work location; `Building` and `Asset` represent physical built outcomes; `BuildingElement`, `System`, `Space`, and `Room` represent the digital-twin decomposition. A project may have many sites and may create, modify, or maintain many assets.

**Still missing:** parcel/property identity source, ownership evidence, building/asset identifiers, BIM/IFC identity policy, coordinate reference system, as-built data standard, and operation/maintenance ownership after handover.

### 3.5 Product identity and supply chain

The source material alternates between Product, Product Variant, Material, Component, Equipment, Tool, Fixture, Fitting, Consumable, Supplier Listing, Supplier Offer, and SKU. It also sometimes treats the canonical product as a family and sometimes as a sellable 50 kg/size/grade item [1] [3] [9].

**Required decision:** use `Material` for a substance, `ProductFamily` for a product line, `Product` for the canonical standardized sellable/specification identity, optional `ProductVariant` when a product has distinct pack/finish/size variants, and `ProductOffer` for a supplier/facility-specific commercial offer. A supplier SKU, barcode, manufacturer part number, and Wajenzi Product ID are different identifiers.

**Still missing:** the product identity key, manufacturer-authority policy, barcode/MPN rules, batch/lot/serial model, product-service model, unit-conversion authority, specification tolerances, substitution approval rules, warranty ownership, and duplicate-resolution thresholds.

### 3.6 Time-dependent commercial truth

The source material correctly says prices and inventory are location-specific, but it sometimes describes them as mutable fields [3] [9]. A price, stock position, route estimate, delivery promise, warranty, licence, or classification is valid only in a context and time interval.

**Required decision:** store append-only `PriceObservation`, `AvailabilityObservation`, `InventoryPosition`, `RouteEstimate`, `DeliveryPromise`, `WarrantyPolicy`, `Credential`, and `RuleApplicability` records with `observed_at`, `valid_from`, `valid_until`, source, and confidence. Keep current values as projections, not as the historical truth.

**Still missing:** currency conversion policy, tax-inclusive versus tax-exclusive semantics, price basis, discount precedence, inventory reservation rules, stale-data thresholds, timezone policy, and event-time versus processing-time rules.

### 3.7 Project controls, BOQ, quantity, and cost

The PRD and formulas package provide strong workflows for WBS, BOQ, measurement, quantities, formulas, productivity, wastage, direct/indirect cost, contingency, landed cost, and estimate-to-complete [1] [10]. However, the source guide correctly warns not to equate WBS nodes, activities, tasks, BOQ items, and payment lines [11].

**Required decision:** make `WBSNode`, `Activity`, `Task`, `Milestone`, `BOQ`, `BOQSection`, `BOQItem`, `QuantityTakeoff`, `Measurement`, `Formula`, `Assumption`, `Rate`, `CostEstimate`, `Budget`, `Commitment`, `Expense`, and `PaymentCertificate` separate classes connected by explicit predicates.

**Still missing:** authoritative classification of cost codes, rate sources, formula versioning, rounding and pack rules, labour burden definitions, equipment ownership/hire rules, provisional-sum treatment, contingency policy, earned-value policy, and professional approval authority for AI-generated quantities.

### 3.8 Procurement and commerce

The procurement, cart, order, POS, and project workflows provide a strong end-to-end chain, but `RFQ`, `Quote`, `Quotation`, `Order`, `PurchaseOrder`, `SalesOrder`, `Invoice`, `Transaction`, and `Payment` are not consistently separated [9] [12] [13].

**Required decision:** model `ProcurementRequest` as demand, `RFQ` as a request to suppliers, `Quotation` as a supplier response, `PurchaseOrder` as a buyer commitment, `SalesOrder` as the seller-side acceptance, `CustomerOrder` as the marketplace aggregate, `Invoice` as a bill, `PaymentIntent` as an attempted payment, `Payment` as a confirmed financial event, and `Settlement` as allocation/reconciliation. A multi-supplier cart creates one parent order and multiple supplier orders.

**Still missing:** order-party semantics, procurement approval policies, contract/framework relationships, tax-point rules, credit terms, returns/credits, disputes, invoice numbering, eTIMS integration behavior, and the exact boundary between Wajenzi marketplace orders and direct POS sales.

### 3.9 Logistics and physical movement

The logistics material distinguishes provider, vehicle, driver, route, shipment, delivery, proof of pickup, proof of delivery, consolidation, and actual events, which is correct [14] [15]. However, the terms Delivery Request, Logistics Order, Shipment, Delivery, and Delivery Event overlap.

**Required decision:** use `DeliveryRequest` for demand, `Shipment` for the cargo/consignment, `DispatchAssignment` for provider/vehicle/driver/route selection, `TransportRoute` for planned or actual path, `Delivery` for the execution record, and `DeliveryEvent` for time-stamped status/GPS/proof events. A single delivery may contain multiple shipments and stops.

**Still missing:** legal responsibility for cargo, loading/unloading custody, insurance, dangerous goods, vehicle/axle restrictions, route-source licensing, driver consent for live location, retention of GPS traces, and exception handling for failed or partial deliveries.

### 3.10 Documents, evidence, approvals, and versioning

The workflows often use Document as if it were both a file and the fact represented by the file. The commercial blueprint explicitly says that a document is a representation of an event, obligation, assessment, approval, payment, security, or evidence record [6].

**Required decision:** separate `DocumentAsset` (file/blob), `DocumentVersion` (immutable content version), `DocumentRecord` (typed semantic record such as Drawing, BOQ, Invoice, Certificate, or Report), `Evidence`, `Submission`, `Review`, `Approval`, `Decision`, and `Signature`. A drawing revision is not a new project and an invoice PDF is not the payment itself.

**Still missing:** document classification, extraction status, page/region references, OCR confidence, redaction, access scope, retention, legal hold, digital signature provider, and document-to-entity linking rules.

### 3.11 Compliance, KYC/KYB, and trust

The KYC/KYB guide provides progressive verification levels, business ownership, professional credentials, licences, address verification, payment-account verification, AML screening, risk, and audit requirements [16]. The commercial and project guides add NCA, county approvals, National Building Code, professional bodies, public procurement, tax, eTIMS, retention, securities, defects, and dispute records [6] [11].

**Required decision:** treat verification as a case and evidence process. `VerificationProfile` is the current projection; `VerificationCheck`, `VerificationDocument`, `Credential`, `Licence`, `TaxProfile`, `ProfessionalRegistration`, `BeneficialOwnership`, `SanctionsScreening`, `RiskAssessment`, `Permit`, `Approval`, and `Restriction` are the underlying records.

**Still missing:** the authoritative verification providers, exact data-retention periods, lawful basis/consent, data-subject rights, escalation policy, sanctions-list refresh process, professional-body adapters, risk thresholds, and the boundary between platform verification and a regulator’s legal determination.

### 3.12 Events, audit, AI, and data governance

The source material requires event-driven notifications, audit trails, AI traceability, data ownership, multi-tenancy, and human approval [1] [7]. It does not consistently distinguish a business event from an audit event, an AI run, a notification, a workflow transition, or a derived analytics record.

**Required decision:** use `BusinessEvent` for something that happened in the domain, `StateTransition` for a lifecycle change, `AuditEvent` for an immutable record of a change or access, `AIJob`/`AIOutput` for machine work, `ActionRequest` for a proposed consequential action, `Notification` for delivery to a recipient, and `AnalyticsFact` for derived reporting data. All must carry actor, source, correlation, causation, timestamps, and affected entity references.

**Still missing:** event naming governance, schema versioning, ordering and deduplication rules, offline synchronization, data retention, deletion/erasure exceptions, analytics definitions, AI model registry, prompt/version registry, and human approval SLAs.

## 4. Contradictions that must be resolved by the model

| Source tension | Why it matters | Resolution in v0.2 |
|---|---|---|
| User versus Person versus Account | Authentication, ownership, and activity become ambiguous. | Person = human; UserAccount = login; Actor = participant; OrganizationMembership = affiliation. |
| Company versus Supplier/Contractor/Manufacturer | One business can have multiple capacities. | Organization + time-bound OrganizationRole. |
| Project creator versus project owner | A professional may initiate a client project. | Separate `initiatedBy` from `ownedBy`; owner is a party, not necessarily the creator. |
| County/SubCounty/Ward versus Division/Location/SubLocation | Kenya has overlapping administrative and service-delivery hierarchies. | Typed `GeographicUnit` and `SpatialMembership`; no universal tree. |
| Product versus Variant versus Listing/Offer | A global product must not be duplicated for each seller, facility, or SKU. | Product is canonical; Offer is seller/facility/time-specific; external identifiers remain source-scoped. |
| Master POS as “system of record” versus operational source systems | Blindly copying POS data would corrupt history and ownership. | Registry and append-only ledgers are authoritative; Master POS is a governed projection/analytics view. |
| Project stage as entity versus state | Creating a new project per stage breaks continuity. | `ProjectPhase` is an instance within a project; status is separate. |
| Document versus represented fact | A PDF, approval, invoice, and payment are not the same object. | File, version, semantic record, evidence, approval, and transaction are separate. |
| Delivery estimate versus delivery promise versus delivery actual | Route distance cannot guarantee arrival. | Estimate, promise, and actual event are separate records. |
| AI classification versus verified fact | Machine confidence is not legal or professional approval. | AI output is derived and reviewable; authoritative assertions require provenance and approval. |
| Supplier marketplace participation as ontology | “No opt-out” is a commercial policy, not an entity type. | Store it as a versioned platform policy/configuration. |

## 5. Required decisions before production freeze

The following decisions should be approved by the product owner and, where applicable, qualified advisers before production schemas are frozen.

| Decision | Recommended default |
|---|---|
| Canonical identity | Opaque UUIDv7 plus a human display code; never encode mutable category, role, or location in the primary key. |
| Company model | `Organization` with `organization_kind=company`; roles are separate and time-bound. |
| Tenant model | Organization or project workspace can be a tenant boundary; explicit `Workspace` and `AccessGrant` are required. |
| Product model | Material → ProductFamily → Product → optional ProductVariant → ProductOffer. |
| Location model | Typed geographic and operational places with versioned spatial joins; no single Kenya location tree. |
| Project ownership | Project has one or more owner parties with effective dates; initiator and project administrator are distinct. |
| Commercial history | Append-only observations and ledger events; current values are projections. |
| Document truth | Files and document versions are evidence; structured domain records carry business meaning. |
| Approval model | Generic approval policy plus typed approval steps; no hard-coded universal approver. |
| Access control | RBAC + ABAC + project role + organization membership + data sensitivity + purpose. |
| AI action | AI can recommend; consequential actions require configured authorization and audit. |
| Kenya localization | Start with Kenya profile and source metadata, but keep ontology jurisdiction-neutral. |

## 6. Data needed to proceed confidently

| Priority | Missing input | Why it is needed |
|---|---|---|
| P0 | Tenant/workspace and access-policy decision | Determines who can see projects, prices, quotations, KYC, and financial data. |
| P0 | Canonical ID policy approval | Prevents incompatible identifiers from emerging in each module. |
| P0 | Product identity and variant policy | Determines deduplication, SKU matching, offer structure, warranty, and inventory. |
| P0 | Location hierarchy and boundary-source policy | Determines location-aware search, jurisdiction, delivery, and price comparison. |
| P0 | Party/role and ownership policy | Determines legal responsibility, project ownership, company capacity, and approvals. |
| P0 | Event and audit envelope | Determines traceability, idempotency, replay, analytics, and AI explanations. |
| P1 | Kenya geographic feeds beyond the two-column CSV | Needed for wards, service-delivery units, postal references, roads, boundaries, and spatial QA. |
| P1 | Supplier/facility/product sample data | Needed to test canonicalization and location-based offers. |
| P1 | Anonymized executed project records | Needed to validate BOQ, schedules, RFI, submittal, inspection, variation, payment, and closeout structures. |
| P1 | Controlled vocabulary register | Needed for roles, project types, trades, units, classifications, statuses, and approval types. |
| P1 | Standards and classification licensing | Needed before importing or redistributing external classification content. |
| P2 | Payment, POS, logistics, KYC, professional-registration, and government adapters | Needed for production integrations but not for the core ontology shape. |

## 7. Recommendation

The ontology can now be built as a **draft v0.2** with the decisions marked “recommended default.” Production freeze should wait for the P0 decisions and a small set of representative test records: one homeowner-led residential project, one contractor-led project, one supplier with two facilities, one manufacturer-distributor-supplier chain, one multi-supplier procurement order, one partial delivery, one payment/financing case, and one document/approval/revision chain.

The next implementation step should be the registry extension and relationship validation—not the marketplace UI. The core test is whether one person, one organization, one project, one site in a Kenya location hierarchy, one canonical product, two supplier facility offers, one project requirement, one procurement request, one order, one delivery, and one payment can be traversed without duplicating identity or leaking restricted data.

## References

[1]: file:///home/ubuntu/upload/pasted_content.txt "WAJENZI.ai Product Requirements Document and Master Product Specification"
[2]: file:///home/ubuntu/upload/pasted_content_2.txt "WAJENZI.ai User and Persona Definition Specification"
[3]: file:///home/ubuntu/upload/pasted_content_11.txt "WAJENZI Supplier POS — Revised Master Specification"
[4]: file:///home/ubuntu/wajenzi-ontology-review/location/Wajenzi.ai%3A%20Kenya%20GIS%20and%20Location-Aware%20Procurement%20Ontology%20Handoff.md "WAJENZI Kenya GIS and Location-Aware Procurement Ontology Handoff"
[5]: file:///home/ubuntu/upload/pasted_content_13.txt "WAJENZI Collaborative Project Management Workflow"
[6]: file:///home/ubuntu/wajenzi-ontology-review/commercial/Wajenzi.ai%20Kenya%20Construction-Commercial%20Ontology%20and%20Template%20Blueprint.md "WAJENZI Kenya Construction-Commercial Ontology and Template Blueprint"
[7]: file:///home/ubuntu/upload/pasted_content_19.txt "WAJENZI Notifications and Event Workflow"
[8]: file:///home/ubuntu/upload/kenya_counties_subcounties.csv "Kenya counties and sub-counties bootstrap CSV"
[9]: file:///home/ubuntu/upload/pasted_content_12.txt "WAJENZI.ai Procurement Workflow"
[10]: file:///home/ubuntu/wajenzi-ontology-review/formulas/wajenzi_ai_formula_dictionary.csv "WAJENZI AI Construction Formula Dictionary"
[11]: file:///home/ubuntu/wajenzi-ontology-review/project/Wajenzi.ai%20%E2%80%94%20Kenya%20Construction%20Project-Management%20Source%20Catalogue%20and%20Ontology%20Blueprint.md "WAJENZI Kenya Construction Project-Management Source Catalogue and Ontology Blueprint"
[12]: file:///home/ubuntu/upload/pasted_content_15.txt "WAJENZI Cart and Order Workflow"
[13]: file:///home/ubuntu/upload/pasted_content_10.txt "WAJENZI Master POS Central Intelligence Specification"
[14]: file:///home/ubuntu/upload/pasted_content_8.txt "WAJENZI Logistics Provider and Intelligent Dispatch Workflow"
[15]: file:///home/ubuntu/upload/pasted_content_17.txt "WAJENZI Delivery and Fleet Optimization Workflow"
[16]: file:///home/ubuntu/upload/pasted_content_20.txt "WAJENZI KYC and KYB Requirements"
