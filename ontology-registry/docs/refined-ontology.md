# WAJENZI Refined Ontology v0.2

**Status:** Draft for product-owner approval before production schema freeze  
**Author:** Manus AI  
**Jurisdiction baseline:** Kenya, with a jurisdiction-neutral core

> **Important note:** This specification is an information architecture and system-design document. It is not legal, tax, financial, insurance, or regulatory advice. Kenya-specific controls and source data must be reviewed against current official sources and qualified advisers before production use.

## 1. Ontology objective

WAJENZI should represent construction as one connected, traceable graph. The platform should be able to move from a person or organization, through a project and site, to buildings, work, quantities, requirements, products, supplier facilities, price and stock observations, procurement, logistics, delivery, payment, compliance, and project actuals.

The graph is not a single linear workflow. A person may belong to several organizations, act under different project roles, and initiate or approve different events. An organization may simultaneously be a contractor, supplier, distributor, or professional firm. A project may have multiple sites and buildings. A product may have many offers at different facilities and times. A document may evidence a decision without being the decision itself.

The ontology therefore uses **typed entities, typed relationships, temporal validity, provenance, confidence, and policy-controlled access**.

## 2. Modeling rules

| Rule | Decision |
|---|---|
| Identity | Every persistent entity receives an immutable canonical ID. External IDs are namespaced. |
| Person versus account | `Person` is the human; `UserAccount` is the authentication object. Neither is a role. |
| Organization versus company | `Organization` is the legal/operating entity. `Company` is an organization kind or UI label, not a parallel identity. |
| Role | Roles are relationships with scope and validity, not permanent user types. |
| Actor | A `Person`, `Organization`, `UserAccount`, `SystemActor`, or `AIAgent` can act in an event. |
| Location | Administrative geography, address, site, facility, property, parcel, jurisdiction, and delivery zone are distinct. |
| Product | `Product` is canonical identity; `ProductOffer` is seller/facility/time-specific commercial reality. |
| Money | Amounts are contextual facts with currency, tax basis, unit, source, and effective dates. |
| Documents | File asset, immutable version, semantic record, evidence, review, approval, and transaction are separate. |
| Events | Domain events, state transitions, audit records, notifications, and AI runs are separate but correlated. |
| History | Corrections and merges append new records; historical records are not silently overwritten. |
| AI | AI-generated classifications and recommendations are derived assertions requiring confidence, provenance, and configurable human approval. |
| Jurisdiction | Kenya-specific rules are versioned and activated by project profile, location, scope, and applicability conditions. |

## 3. Entity architecture

### 3.1 Identity, tenancy, and access

| Class | Definition | Key relationships |
|---|---|---|
| `Person` | A real human identity. | Controls accounts; belongs to organizations; holds credentials; acts in projects and events. |
| `UserAccount` | Login, authentication, and account-lifecycle object. | Represents one person; belongs to workspaces; receives permissions and notifications. |
| `Actor` | Abstract participant in an event or action. | Generalized by person, organization, system actor, or AI agent. |
| `Organization` | Legal or operating entity. | Has members, roles, facilities, contracts, projects, listings, transactions, and records. |
| `OrganizationRole` | Time-bound capacity of an organization, such as contractor, supplier, manufacturer, distributor, retailer, logistics provider, professional firm, financier, insurer, regulator, or Wajenzi unit. | Belongs to organization; valid for a period and jurisdiction. |
| `OrganizationMembership` | Person’s membership or authority relationship with an organization. | Carries employment/engagement status, title, authority scope, start/end dates, and inviter. |
| `Workspace` | Tenant or collaboration boundary for an organization, project, or platform function. | Owns access grants, data policies, settings, and membership. |
| `AccessGrant` | Permission to perform an action on an entity or workspace. | Connects subject, role, action, resource, sensitivity, purpose, conditions, and expiry. |
| `RoleDefinition` | Reusable permission role, such as organization admin, project manager, QS, buyer, or viewer. | Grants permissions; can be assigned at organization or project scope. |
| `ProjectRoleAssignment` | A person or organization acting in a role on one project. | Connects actor, project, role, scope, permissions, authority, and effective dates. |
| `Persona` | Behavioral or business-purpose classification, such as homeowner, contractor, or supplier representative. | Describes a person or organization but does not grant authority. |
| `SystemActor` | External or internal software/system participant. | Produces source records, events, callbacks, or integrations. |
| `AIAgent` | Configured AI system actor. | Has model, prompt, tools, knowledge sources, cost limits, and approval policy. |

**Core identity relationships:**

```text
Person ──controls──> UserAccount
Person ──member_of──> OrganizationMembership ──member_of──> Organization
Organization ──has_role──> OrganizationRole
Person/Organization ──assigned_to──> ProjectRoleAssignment ──on──> Project
UserAccount ──member_of──> Workspace
Workspace ──governs──> AccessGrant
Person/Organization/SystemActor/AIAgent ──acts_as──> Actor
```

A person can be a contractor in one organization, a project manager on Project A, a procurement officer on Project B, and an owner/client on Project C. These are independent scoped relationships.

### 3.2 Place, location, jurisdiction, and facilities

| Class | Definition | Important distinction |
|---|---|---|
| `Place` | Abstract superclass for geographic and operational places. | Do not use it as one flat location table. |
| `Address` | Raw and normalized postal/delivery/residential/business address. | Not equivalent to an administrative unit or project site. |
| `GeoObservation` | A measured or supplied coordinate observation with accuracy, method, timestamp, and confidence. | Never overwrite a prior observation. |
| `GeographicUnit` | Versioned administrative or service-delivery unit. | Typed as county, electoral/statistical/service-delivery sub-county, ward, division, location, or sub-location. |
| `BoundaryVersion` | Source geometry and temporal version for a geographic unit. | Stores vintage, CRS, geometry hash, license, QA, and effective interval. |
| `SpatialMembership` | Assertion that a place falls within, overlaps, or is near a geographic unit. | Carries join method, boundary version, distance, ambiguity, confidence, and provenance. |
| `PostalArea` | Postal service reference or postcode area. | Must not substitute for county, ward, or delivery zone. |
| `PostOffice` | Physical postal facility. | May be a point reference even where no postal polygon exists. |
| `Property` | Real-estate object or ownership context. | Can exist before or after a construction project. |
| `Parcel` | Land/plot unit where authoritative parcel data is available. | Not always available or legally equivalent to a property. |
| `Site` | Physical work location belonging to a project. | Has one or more coordinate observations and may be point, line, or polygon. |
| `Facility` | Operational place such as store, plant, office, depot, or service location. | A supplier can have many facilities. |
| `Warehouse` | Facility subtype that holds or fulfills stock. | Stock is facility-specific and time-dependent. |
| `DeliveryZone` | Operational service area or geofence. | Not the same as a county or postal area. |
| `Jurisdiction` | Area and authority context for planning, regulation, tax, procurement, or service. | Multiple jurisdictions may apply simultaneously. |
| `Authority` | Organization with regulatory, approval, inspection, service, or enforcement responsibility. | Authority is a party; jurisdiction is the scope. |
| `RoadSegment` | Road network feature with class, condition, restrictions, and geometry. | Source and survey vintage are required. |
| `TransportRoute` | Planned or actual route between operational points. | Not itself a delivery promise. |
| `RouteEstimate` | Timestamped computed distance/time result with engine and assumptions. | Must be separate from actual arrival. |

**Location relationships:**

```text
Project ──has_site──> Site ──has_geo_observation──> GeoObservation
Site ──addressed_by──> Address
Site ──spatially_member_of──> GeographicUnit
Site ──has_spatial_membership──> SpatialMembership ──uses──> BoundaryVersion
Site ──falls_under──> Jurisdiction ──administered_by──> Authority
Organization ──operates──> Facility ──subtype──> Warehouse
Facility ──addressed_by──> Address
Facility ──serves──> DeliveryZone
Facility ──located_in──> GeographicUnit
Warehouse ──originates──> TransportRoute ──has_estimate──> RouteEstimate
TransportRoute ──destines_at──> Site/Address
```

For Kenya, the ontology must keep county, sub-county, ward, division, location, sub-location, and postal references as typed hierarchies. The attached two-column CSV can seed county and sub-county names, but it does not provide official codes, ward data, service-delivery units, geometry, aliases, or temporal metadata [4].

### 3.3 Project, property, building, and construction structure

| Class | Definition | Key relationships |
|---|---|---|
| `Project` | A bounded construction, renovation, infrastructure, procurement, or maintenance intervention. | Has owner, initiator, sites, phases, contracts, team, budgets, documents, and events. |
| `ProjectProfile` | Jurisdiction and project context, such as private Kenya or public Kenya. | Activates rules, approval requirements, tax and procurement controls. |
| `ProjectPhase` | An instance of a lifecycle phase within a project. | Has gates, dates, deliverables, WBS nodes, and status. |
| `PhaseGate` | Approval or condition required to enter/exit a phase. | Requires evidence and authorized decision. |
| `Property` | Property being developed, renovated, or maintained. | May contain parcels, buildings, and projects. |
| `Building` | Physical building or infrastructure outcome. | Has systems, elements, floors, spaces, and assets. |
| `BuildingSystem` | Functional system such as structural, plumbing, electrical, mechanical, or roofing. | Contains elements and requires products/activities. |
| `BuildingElement` | Physical or logical element such as slab, wall, door, window, pipe, or roof. | Represented by drawings/BIM; has quantities, specifications, and installed products. |
| `Floor` | Vertical level of a building. | Contains spaces and elements. |
| `Space` | General spatial area in a building. | May contain rooms or be part of a system/element. |
| `Room` | Semantically identified space. | Has dimensions, finishes, fixtures, and use. |
| `Asset` | Operational built asset or installed equipment. | Has handover, warranty, maintenance, and inspection history. |
| `WBSNode` | Work-breakdown decomposition node. | Decomposes into child nodes, deliverables, or work packages. |
| `WorkPackage` | Scope grouping assigned to an organization or team. | Contains activities, tasks, BOQ items, requirements, and cost codes. |
| `Programme` | Project schedule/programme container. | Has baselines, updates, calendars, dependencies, and milestones. |
| `Activity` | Scheduled unit of work with duration and progress. | Belongs to WBS/programme; consumes resources and produces outputs. |
| `Task` | Actionable assignment for an actor. | Has responsible actor, due date, status, evidence, and dependencies. |
| `Milestone` | Date or outcome checkpoint. | May trigger approvals, payments, procurement, or phase transitions. |
| `Dependency` | Temporal or logical dependency between activities, tasks, approvals, deliveries, or requirements. | Supports FS/SS/FF/SF, lag/lead, constraint, and source. |
| `Resource` | Abstract construction resource. | Specialized as labour, crew, equipment, plant, material, money, or transport. |
| `Installation` | Record that a product/material/equipment was installed at an element, space, or asset. | Links source, installer, date, quantity, inspection, and warranty. |

A project creator is not automatically the project owner. `initiated_by`, `owned_by`, `administered_by`, and `project_role_assignment` must remain separate [5].

### 3.4 Design information, documents, and evidence

| Class | Definition |
|---|---|
| `DocumentAsset` | Physical file/blob and storage metadata. |
| `DocumentVersion` | Immutable version of a document asset with hash, revision, extraction status, and supersession. |
| `DocumentRecord` | Semantic record represented by one or more document versions. |
| `Drawing` | Typed design/document record with discipline, number, revision, author, reviewer, and approver. |
| `Specification` | Technical requirement record for a project, element, product, or work package. |
| `BIMModel` | Model container and exchange record. |
| `BIMElementReference` | External or internal identifier linking a physical/model element to project entities. |
| `Submittal` | Controlled submission of product data, shop drawing, method statement, sample, or technical document. |
| `Transmittal` | Controlled transfer of one or more records to named recipients. |
| `Evidence` | Claim-supporting record that points to documents, observations, events, measurements, or external sources. |
| `Review` | Evaluation performed by an authorized actor. |
| `Approval` | Formal decision with authority, scope, timestamp, decision, and evidence. |
| `Signature` | Digital or recorded signature event with signatory authority and integrity evidence. |
| `Meeting` | Collaboration record with participants, minutes, actions, and decisions. |
| `RFI` | Request for information/clarification connected to contract, drawing, specification, or activity. |
| `SiteInstruction` | Direction issued by an authorized project actor. |
| `Decision` | Recorded choice or authorization that may affect scope, cost, time, quality, or risk. |

**Key distinction:** a drawing file is not the drawing revision; a drawing revision is not an approval; an approval is not a construction event; and an invoice document is not a payment.

### 3.5 Classification, standards, and knowledge

| Class | Definition |
|---|---|
| `TaxonomyNode` | WAJENZI-controlled category, subcategory, product type, application, trade, project phase, or attribute group. |
| `ClassificationScheme` | A named scheme such as WAJENZI, OmniClass, MasterFormat, UniFormat, ETIM, CSI, IFC, NCA, or manufacturer taxonomy. |
| `ClassificationCode` | Code within a scheme. |
| `ClassificationAssignment` | Assertion assigning an entity to a code, with scheme version, method, confidence, and reviewer. |
| `Crosswalk` | Explicit mapping between classification codes in different schemes. |
| `Standard` | Technical, regulatory, manufacturer, or contractual standard. |
| `Rule` | Versioned conditional rule from a statute, regulation, code, contract, tax authority, platform policy, or operational source. |
| `RuleApplicability` | Evaluation of whether a rule applies to a project, site, product specification, organization, transaction, or event. |
| `Application` | Use case for a product/material, such as residential, commercial, structural, or coastal use. |
| `KnowledgeAssertion` | Sourced semantic statement used by retrieval and reasoning. |

The WAJENZI ontology sits above external classification schemes. It should cross-map them, not replace them. Each external code requires scheme, version, source, and licensing metadata.

### 3.6 Products and supply network

| Class | Definition | Example relationships |
|---|---|---|
| `Material` | Physical substance such as cement, sand, steel, timber, or water. | Used in products, systems, formulas, and work. |
| `ProductFamily` | Product line or family. | Groups related products and variants. |
| `Product` | Canonical standardized product identity. | Has manufacturer, brand, type, specifications, variants, standards, and relationships. |
| `ProductVariant` | Distinct sellable variant by size, grade, pack, finish, colour, model, or barcode. | Belongs to product; used by offers and inventory. |
| `ProductSpecification` | Technical identity and requirements. | Defines grade, dimensions, tolerances, standards, unit, and approved substitutions. |
| `ProductOffer` | Supplier/facility-specific offer for a variant. | Has seller, facility, SKU, price observations, stock, MOQ, lead time, delivery zone, and terms. |
| `Brand` | Commercial brand. | Owned by or licensed from an organization; associated with products. |
| `SupplierFacility` | Store, plant, depot, or service facility operated by an organization. | Holds stock and publishes offers. |
| `InventoryPosition` | Current projected stock position for a variant at a facility. | Derived from stock observations and inventory events. |
| `AvailabilityObservation` | Time-stamped evidence of quantity, reservation, or availability. | Facility- and variant-specific. |
| `PriceObservation` | Time-stamped commercial price. | Exact variant/specification, quantity, unit, tax basis, seller, facility, and source. |
| `Batch` | Production or inventory lot. | Connects product variant, supplier, manufacturer, delivery, quality, and warranty. |
| `SerialNumber` | Unique item identifier where applicable. | Connects product instance, ownership, delivery, warranty, and service. |
| `WarrantyPolicy` | Product, installation, workmanship, or service warranty terms. | Defines trigger, duration, exclusions, evidence, and resolution. |
| `ServiceOffering` | Professional, logistics, installation, maintenance, or other service that can be procured. | Uses the same offer/procurement pattern but is not forced into the product class. |

**Canonical product chain:**

```text
Material/ProductFamily → Product → ProductVariant → ProductOffer
ProductOffer → SupplierFacility → GeographicUnit / DeliveryZone
ProductOffer → PriceObservation + AvailabilityObservation
Product/Variant → Specification + Classification + Standard + WarrantyPolicy
```

### 3.7 Quantity, BOQ, cost, and project requirements

| Class | Definition |
|---|---|
| `ProjectRequirement` | Structured demand for a product, service, resource, approval, or outcome. |
| `QuantityTakeoff` | Quantity extraction from drawings, BIM, measurements, or manual input. |
| `Measurement` | Recorded dimension, area, volume, count, duration, or progress quantity. |
| `Formula` | Versioned calculation rule with inputs, output unit, assumptions, and source. |
| `Assumption` | Explicit user, professional, or AI assumption used in a calculation. |
| `BOQ` | Versioned bill of quantities. |
| `BOQSection` | Logical BOQ section such as substructure, roofing, or electrical. |
| `BOQItem` | Line item with description, classification, quantity, unit, rate, amount, source, and approval. |
| `CostCode` | Project/accounting classification for cost allocation. |
| `Rate` | Time- and source-specific unit rate. |
| `CostEstimate` | Estimate version with assumptions, rates, quantities, and scenarios. |
| `Budget` | Approved financial baseline for a project, package, or cost code. |
| `Commitment` | Approved or contracted future cost, such as a purchase order or subcontract. |
| `Expense` | Actual incurred cost. |
| `Valuation` | Measurement and financial assessment of work, materials, or deliverables. |
| `PaymentCertificate` | Authorized certification of an amount due. |
| `Variation` | Priced or instructed change to scope, quantity, time, or cost. |
| `Claim` | Asserted entitlement requiring review or determination. |
| `Risk` | Uncertain event with probability, impact, owner, response, and residual status. |
| `Issue` | Current problem requiring action; distinct from a future risk. |

**Required chain:**

```text
Project → WBSNode → Activity/Task → QuantityTakeoff/Measurement → BOQItem
BOQItem → ProjectRequirement → ProductSpecification/Product/ServiceOffering
BOQItem → CostCode → Rate → CostEstimate/Budget
Requirement → ProcurementRequest → Commitment/Order → Expense/Payment
```

The attached formula dictionary confirms the need for explicit formula, measurement, conversion, wastage, productivity, logistics, and cost-basis records [10].

### 3.8 Procurement, commerce, and financial records

| Class | Definition |
|---|---|
| `ProcurementRequest` | Demand request for one or more requirements. |
| `ProcurementLine` | Requirement line with product/service, specification, quantity, date, budget, and delivery location. |
| `RFQ` | Request sent to one or more suppliers. |
| `Quotation` | Supplier response to an RFQ or direct request. |
| `QuotationLine` | Supplier-specific product/variant, price, quantity, tax, lead time, terms, and validity. |
| `Cart` / `ProcurementBasket` | Project-aware or consumer cart that may contain multiple suppliers. |
| `CartItem` | Selected offer, quantity, price snapshot, and delivery requirement. |
| `CustomerOrder` | Marketplace order aggregate. |
| `SupplierOrder` | Supplier-specific fulfillment order split from a customer order. |
| `PurchaseOrder` | Buyer commitment to a supplier or upstream provider. |
| `SalesOrder` | Seller-side acceptance/fulfillment representation. |
| `Invoice` | Bill requesting payment. |
| `CreditNote` / `DebitNote` | Corrective commercial document. |
| `PaymentIntent` | Attempt or request to pay. |
| `Payment` | Confirmed financial movement or provider-confirmed payment event. |
| `Settlement` | Allocation/reconciliation of funds among parties, fees, tax, and financing. |
| `Refund` | Reversal or repayment connected to an original payment/order. |
| `FinancingApplication` | Request for financing. |
| `FinancingOffer` | Offer made by a financial institution. |
| `Loan` | Accepted financing agreement. |
| `Payroll` | Project/organization workforce payment aggregate. |
| `TransactionLedgerEntry` | Append-only accounting or commercial ledger event. |
| `Dispute` | Structured disagreement connected to an order, invoice, payment, delivery, product, or contract. |

A multi-supplier cart should become one parent `CustomerOrder`, multiple `SupplierOrder` records, one or more `DeliveryRequest` records, one `Checkout` context, and one or more `Payment`/`Settlement` records depending on financing and provider constraints.

### 3.9 Logistics and physical movement

| Class | Definition |
|---|---|
| `Carrier` | Logistics provider organization or independent transport actor. |
| `Vehicle` | Registered transport asset with capacity, dimensions, fuel, restrictions, status, and owner/operator. |
| `Driver` | Person authorized to operate a vehicle. |
| `DeliveryRequest` | Demand for movement of goods, equipment, returns, or transfers. |
| `Shipment` | Cargo/consignment with line items, quantity, weight, volume, and custody. |
| `DispatchAssignment` | Selected carrier, vehicle, driver, route, stops, price, and ETA. |
| `TransportRoute` | Planned or actual path. |
| `RouteEstimate` | Computed route result with engine, profile, assumptions, and timestamp. |
| `Delivery` | Execution record for movement from origin to destination. |
| `DeliveryEvent` | Time-stamped status, GPS, delay, custody, or proof event. |
| `ProofOfPickup` / `ProofOfDelivery` | Evidence of custody transfer and receipt. |
| `DeliveryPromise` | Service commitment with cutoff, window, SLA, and confidence. |
| `ReturnMovement` | Reverse logistics movement for return/warranty/dispute. |

```text
Order/PurchaseOrder/Transfer/Return → DeliveryRequest
DeliveryRequest → Shipment → DispatchAssignment
DispatchAssignment → Carrier + Vehicle + Driver + TransportRoute + DeliveryPromise
Delivery → DeliveryEvent + ProofOfDelivery → GoodsReceipt/SiteReceipt
```

### 3.10 Contracts, compliance, trust, and post-completion

| Class | Definition |
|---|---|
| `Agreement` | General legal/commercial agreement. |
| `Contract` | Project, supply, consultancy, logistics, or service agreement. |
| `ContractVersion` | Immutable version of a contract. |
| `PartyRole` | Party’s role under a contract, such as employer, contractor, consultant, supplier, or payer. |
| `Obligation` | Duty or entitlement derived from an agreement, rule, or approval. |
| `ConditionPrecedent` | Condition required before a right or action becomes effective. |
| `Permit` | Approval, licence, clearance, registration, or statutory permission. |
| `Credential` | Qualification, registration, practising licence, or capability evidence. |
| `VerificationCase` | KYC, KYB, professional, address, payment, or supplier verification process. |
| `VerificationCheck` | Individual check performed by a provider or reviewer. |
| `VerificationEvidence` | Evidence supporting a check. |
| `ProfessionalRegistration` | Professional-body registration and practising status. |
| `BusinessRegistration` | Legal registration and tax identity record. |
| `BeneficialOwnership` | Ownership/control relationship to ultimate natural persons. |
| `TaxProfile` | Jurisdiction-specific tax identity and rules. |
| `TaxInvoice` / `ETimsInvoice` | Tax-compliant invoice representation where applicable. |
| `WithholdingAssessment` | Calculation and evidence of withholding. |
| `InsurancePolicy` | Insurance coverage and limits. |
| `Bond` / `Guarantee` | Security instrument for an obligation. |
| `RetentionPolicy` / `RetentionLedger` | Contract-specific withholding and release. |
| `DefectsLiabilityPeriod` | Post-completion defect-obligation interval. |
| `Defect` / `Nonconformance` | Observed failure against requirement, specification, or acceptance criteria. |
| `CorrectiveAction` | Action to resolve a defect, NCR, issue, or risk. |
| `CompletionCertificate` | Evidence of practical, works, or final completion. |
| `HandoverPackage` | As-builts, O&M manuals, warranties, certificates, asset register, and closeout evidence. |
| `Dispute` / `Determination` / `ArbitrationProceeding` | Escalated commercial disagreement and its resolution path. |

### 3.11 Events, audit, AI, notifications, and analytics

| Class | Definition |
|---|---|
| `BusinessEvent` | Something that happened in the domain, such as order confirmed or delivery delayed. |
| `StateTransition` | Change from one state to another on an entity. |
| `AuditEvent` | Immutable record of create/read/update/delete/access/approval/action activity. |
| `SourceSystem` | POS, ERP, payment provider, government feed, mapping system, or Wajenzi service. |
| `SourceRecord` | Raw source observation or imported record. |
| `ProvenanceRecord` | Lineage, source, hash, transformation, confidence, reviewer, and licensing metadata. |
| `AIJob` | One model execution or agent run. |
| `AIOutput` | Extracted, classified, predicted, summarized, or generated result. |
| `Recommendation` | Proposed option or decision with alternatives, rationale, evidence, and confidence. |
| `ActionRequest` | Consequential action proposed by a user or AI for authorization. |
| `Notification` | Message delivered to a recipient through a channel. |
| `AnalyticsFact` | Derived reporting fact or metric with definition and calculation period. |

Every important event should carry `event_id`, `event_type`, `actor_id`, affected entity IDs, project/order/transaction context where applicable, event time, processing time, source, correlation ID, causation/parent event, location context, previous/new state, severity, schema version, and provenance.

## 4. Relationship semantics

### 4.1 Identity and organization relationships

| Subject | Predicate | Object | Temporal/provenance requirement |
|---|---|---|---|
| Person | `controls` | UserAccount | Account lifecycle and source. |
| Person | `member_of` | Organization | Membership status, authority, effective dates. |
| Organization | `has_organization_role` | OrganizationRole | Role scope, jurisdiction, effective dates. |
| Person/Organization | `has_persona` | Persona | Derived or declared; confidence if inferred. |
| Person/Organization | `assigned_project_role` | ProjectRoleAssignment | Project, role, scope, authority, effective dates. |
| Organization | `operates` | Facility | Facility type, ownership/operator, validity. |
| Organization | `owns_or_controls` | Property/Asset/Vehicle | Evidence and validity required. |
| Organization | `employs_or_authorizes` | Person | Authorization scope and end date. |
| Organization | `has_beneficial_owner` | Person/Organization | Direct/indirect ownership and evidence. |
| Organization | `authorized_by` | Organization | Brand/distribution/supplier authority, product/category/territory scope. |

### 4.2 Location relationships

| Subject | Predicate | Object | Required context |
|---|---|---|---|
| Project | `has_site` | Site | Site role, phase, effective dates. |
| Site/Facility/Person/Organization | `addressed_by` | Address | Raw/normalized address and verification. |
| Site/Facility/Vehicle/Driver | `has_geo_observation` | GeoObservation | Accuracy, capture method, timestamp, confidence. |
| Site/Facility/Address | `spatially_member_of` | GeographicUnit | Boundary version, join method, ambiguity, distance, confidence. |
| Site | `has_postal_reference` | PostalArea/PostOffice | Postal source and point/reference status. |
| Site | `falls_under` | Jurisdiction | Authority, spatial rule, effective dates. |
| Jurisdiction | `administered_by` | Authority | Mandate/source. |
| Facility | `serves` | DeliveryZone | Vehicle class, cutoff, fee, SLA, validity. |
| TransportRoute | `originates_at` | Facility/Site/Address | Planned/actual route context. |
| TransportRoute | `destines_at` | Site/Address | Exact destination point and access constraints. |
| PriceObservation | `observed_at` | Facility/Market/GeographicUnit | Observation basis and period. |

### 4.3 Project and construction relationships

| Subject | Predicate | Object |
|---|---|---|
| Project | `owned_by` | Person/Organization |
| Project | `initiated_by` | Actor |
| Project | `administered_by` | ProjectRoleAssignment |
| Project | `has_phase` | ProjectPhase |
| ProjectPhase | `has_gate` | PhaseGate |
| Project | `has_property_context` | Property/Parcel |
| Project | `has_building` | Building |
| Building | `has_system` | BuildingSystem |
| BuildingSystem | `has_element` | BuildingElement |
| Building | `has_floor` | Floor |
| Floor | `contains_space` | Space |
| Space | `contains_room` | Room |
| Project/Phase/Contract | `contains_wbs` | WBSNode |
| WBSNode | `decomposes_into` | WBSNode/WorkPackage/Deliverable |
| WorkPackage | `contains_activity` | Activity |
| Activity | `has_task` | Task |
| Programme | `schedules` | Activity/Task/Milestone |
| Activity/Task | `depends_on` | Activity/Task/Approval/Delivery |
| Activity/Task | `consumes_resource` | Resource |
| Activity | `produces` | Deliverable/Installation/ProgressMeasurement |
| Product/Material | `installed_at` | BuildingElement/Space/Asset |
| Installation | `performed_by` | ProjectRoleAssignment |

### 4.4 Design, evidence, and governance relationships

| Subject | Predicate | Object |
|---|---|---|
| DocumentRecord | `has_version` | DocumentVersion |
| Drawing | `represents` | BuildingElement/BIMElementReference |
| Specification | `specifies` | Product/ProductSpecification/WorkPackage |
| Submittal | `submitted_for` | Review/Approval |
| Evidence | `represented_by` | DocumentVersion/Observation/Event |
| Review | `performed_by` | ProjectRoleAssignment/Authority |
| Approval | `approved_by` | ProjectRoleAssignment/Authority |
| DocumentVersion | `supersedes` | DocumentVersion |
| RFI | `references` | Contract/Drawing/Specification/Activity |
| SiteInstruction | `directs` | Actor/WorkPackage/Activity |
| Decision | `affects` | Scope/BOQ/CostEstimate/Programme/Procurement |

### 4.5 Product, supply, and procurement relationships

| Subject | Predicate | Object |
|---|---|---|
| Product | `has_variant` | ProductVariant |
| Product | `has_brand` | Brand |
| Product | `manufactured_by` | Organization |
| Product | `has_material` | Material |
| Product | `classified_by` | ClassificationAssignment |
| Product | `has_specification` | ProductSpecification |
| ProductOffer | `offered_by` | Organization |
| ProductOffer | `available_at` | Facility |
| ProductOffer | `for_variant` | ProductVariant |
| ProductOffer | `has_price_observation` | PriceObservation |
| ProductOffer | `has_availability_observation` | AvailabilityObservation |
| ProductSpecification | `allows_substitution` | Product/ProductVariant |
| ProjectRequirement | `requires_specification` | ProductSpecification |
| ProjectRequirement | `satisfied_by` | Product/ProductOffer |
| BOQItem | `maps_to` | Product/ProductVariant |
| ProcurementRequest | `contains_line` | ProcurementLine |
| ProcurementLine | `fulfills` | ProjectRequirement/BOQItem |
| RFQ | `requests_response_from` | Organization |
| Quotation | `responds_to` | RFQ |
| PurchaseOrder | `placed_with` | Organization |
| PurchaseOrder | `contains_line` | PurchaseOrderLine |
| PurchaseOrderLine | `purchases` | ProductVariant/ServiceOffering |
| CustomerOrder | `splits_into` | SupplierOrder |
| SupplierOrder | `fulfilled_by` | Organization/Facility |

### 4.6 Money and logistics relationships

| Subject | Predicate | Object |
|---|---|---|
| BOQItem/Activity/WorkPackage | `priced_by` | Rate |
| Project | `has_budget` | Budget |
| Budget | `allocates_to` | CostCode/BOQItem/WorkPackage |
| PurchaseOrder/Contract | `creates_commitment` | Commitment |
| Commitment/Order/Project | `incurs` | Expense |
| Invoice | `bills` | Organization/Person |
| PaymentIntent | `attempts_to_settle` | Invoice/Order/Obligation |
| Payment | `settles` | Invoice/PaymentCertificate/Obligation |
| Settlement | `allocates` | Payment/Fees/Tax/Party |
| FinancingApplication | `finances` | Project/ProcurementRequest/Order/Payroll |
| DeliveryRequest | `moves` | Shipment |
| Shipment | `contains` | ProductVariant/Batch/SerialNumber |
| DispatchAssignment | `assigns` | Carrier/Vehicle/Driver/Route |
| Delivery | `executes` | DeliveryRequest/Shipment |
| Delivery | `delivered_to` | Site/Address/Person/Organization |
| DeliveryEvent | `occurs_at` | Site/Facility/GeoObservation |
| Delivery | `evidenced_by` | ProofOfDelivery |
| Delivery/GRN | `updates` | InventoryPosition/SiteInventory |

### 4.7 Compliance, quality, events, and AI relationships

| Subject | Predicate | Object |
|---|---|---|
| Project/Site/ProductSpecification | `has_rule_applicability` | RuleApplicability |
| Project | `requires_permit` | Permit |
| Permit | `issued_by` | Authority |
| Person/Organization | `has_verification_case` | VerificationCase |
| VerificationCase | `has_check` | VerificationCheck |
| VerificationCheck | `supported_by` | VerificationEvidence |
| Contract | `creates_obligation` | Obligation |
| Obligation | `performed_by` | PartyRole/ProjectRoleAssignment |
| Obligation | `due_by` | Milestone/Deadline |
| Inspection | `tests_or_inspects` | BuildingElement/Product/Delivery |
| Test/Inspection | `produces` | Acceptance/Nonconformance |
| Nonconformance/Defect | `corrected_by` | CorrectiveAction |
| Variation/ChangeOrder | `modifies` | Contract/Scope/BOQ/Programme |
| Claim | `arises_from` | Event/Notice/Contract |
| BusinessEvent | `caused_by` | Actor/BusinessEvent |
| BusinessEvent | `affects` | Entity |
| AuditEvent | `records` | Entity/Action |
| AIJob | `reads` | Entity/Document/KnowledgeAssertion |
| AIJob | `produces` | AIOutput/Recommendation/ActionRequest |
| Recommendation | `supported_by` | Evidence/KnowledgeAssertion |
| ActionRequest | `approved_by` | Person/Organization/Approval |
| Notification | `delivered_to` | UserAccount/Organization |

## 5. State model

Do not force one status field to carry every kind of state. Use separate axes.

| State axis | Examples |
|---|---|
| `lifecycle_state` | draft, active, superseded, deprecated, archived, cancelled |
| `workflow_state` | submitted, under_review, clarification_required, approved, rejected, completed |
| `commercial_state` | proposed, quoted, committed, invoiced, payable, paid, settled, disputed, refunded |
| `evidence_state` | missing, partial, verified, contradicted, expired |
| `compliance_state` | not_applicable, pending, verified, expired, non_compliant, exception_approved |
| `availability_state` | available, reserved, allocated, in_transit, damaged, returned, lost, unavailable |
| `access_state` | private, organization, project, counterparty, public, restricted |
| `ai_review_state` | not_required, pending_review, approved, rejected, overridden |

## 6. Universal record envelope

Every source record, assertion, document, observation, event, AI output, and derived metric should carry a common envelope where applicable:

```text
entity_id / record_id
entity_type / record_type
schema_version
canonical_name or title
source_system_id
source_record_id
source_url or storage_uri
source_content_hash
jurisdiction
workspace_id / tenant_id
project_id / site_id / contract_id where applicable
actor_id / created_by
observed_at / event_time / processing_time
valid_from / valid_until
lifecycle_state / workflow_state
confidence
provenance_id
access_classification
correlation_id / causation_id / parent_event_id
created_at / updated_at
```

## 7. The canonical cross-domain graph

```text
Person
  → UserAccount
  → OrganizationMembership
  → Organization / OrganizationRole
  → ProjectRoleAssignment
  → Project
  → Site / Address / GeoObservation / GeographicUnit / Jurisdiction
  → Property / Building / System / Element / Space
  → Phase / WBS / Activity / Task / Milestone
  → Drawing / Specification / BOQ / QuantityTakeoff / Measurement
  → ProjectRequirement / ProductSpecification
  → Product / Variant / ProductOffer
  → Supplier / Facility / Warehouse / Price / Availability
  → ProcurementRequest / RFQ / Quotation / PurchaseOrder / Order
  → Invoice / PaymentIntent / Payment / Financing / Settlement
  → DeliveryRequest / Shipment / Dispatch / Route / Delivery / GRN
  → Installation / Inspection / Acceptance / Defect / Handover
  → Project Actuals / Analytics / AI Recommendation
  → BusinessEvent / AuditEvent / KnowledgeAssertion
```

This graph supports the target query:

> For an active project in a particular Kenyan site, which delayed activities are caused by material shortages, which verified supplier facilities offer exact or approved-substitute variants, what are their current price and stock observations, what route and delivery promise is credible, how does the choice affect budget and financing, and which approvals or inspections remain outstanding?

## 8. Production freeze conditions

Do not freeze the production ontology until the product owner approves the P0 decisions in `ontology-gap-report.md`: tenant/workspace boundary, canonical ID policy, product/variant identity rule, location-source hierarchy, party/role and ownership semantics, event/audit envelope, and privacy/access model. The ontology shape is now sufficiently defined for a draft implementation and controlled pilot.

## References

[1]: file:///home/ubuntu/upload/pasted_content.txt "WAJENZI.ai Product Requirements Document and Master Product Specification"
[2]: file:///home/ubuntu/upload/pasted_content_2.txt "WAJENZI.ai User and Persona Definition Specification"
[3]: file:///home/ubuntu/upload/pasted_content_11.txt "WAJENZI Supplier POS — Revised Master Specification"
[4]: file:///home/ubuntu/wajenzi-ontology-review/location/Wajenzi.ai%3A%20Kenya%20GIS%20and%20Location-Aware%20Procurement%20Ontology%20Handoff.md "WAJENZI Kenya GIS and Location-Aware Procurement Ontology Handoff"
[5]: file:///home/ubuntu/upload/pasted_content_13.txt "WAJENZI Collaborative Project Management Workflow"
[6]: file:///home/ubuntu/wajenzi-ontology-review/commercial/Wajenzi.ai%20Kenya%20Construction-Commercial%20Ontology%20and%20Template%20Blueprint.md "WAJENZI Kenya Construction-Commercial Ontology and Template Blueprint"
[7]: file:///home/ubuntu/upload/pasted_content_19.txt "WAJENZI Notifications and Event Workflow"
[8]: file:///home/ubuntu/upload/pasted_content_20.txt "WAJENZI KYC and KYB Requirements"
[9]: file:///home/ubuntu/upload/pasted_content_12.txt "WAJENZI.ai Procurement Workflow"
[10]: file:///home/ubuntu/wajenzi-ontology-review/formulas/wajenzi_ai_formula_dictionary.csv "WAJENZI AI Construction Formula Dictionary"
[11]: file:///home/ubuntu/wajenzi-ontology-review/project/Wajenzi.ai%20%E2%80%94%20Kenya%20Construction%20Project-Management%20Source%20Catalogue%20and%20Ontology%20Blueprint.md "WAJENZI Kenya Construction Project-Management Source Catalogue and Ontology Blueprint"
[12]: file:///home/ubuntu/upload/pasted_content_15.txt "WAJENZI Cart and Order Workflow"
[13]: file:///home/ubuntu/upload/pasted_content_16.txt "WAJENZI Master Payment and Financing Workflow"
[14]: file:///home/ubuntu/upload/pasted_content_8.txt "WAJENZI Logistics Provider and Intelligent Dispatch Workflow"
[15]: file:///home/ubuntu/upload/pasted_content_18.txt "WAJENZI Warranty and Returns Workflow"


## 9. Public-reference data layer v0.3

The public-reference layer extends the ontology without promoting external data to canonical operational truth. Every imported public record must retain its source system, source record identifier, source version/vintage, retrieval timestamp, licence/terms, content hash, quality status, and provenance record. A public reference may link to a canonical entity only after matching and stewardship review.

| Public source-backed concept | Ontology classes | Integration rule |
|---|---|---|
| HDX COD-AB / IEBC Admin-0 to Admin-2 | `GeographicUnit`, `BoundaryVersion`, `SpatialMembership`, `ProvenanceRecord` | Use as a versioned 47-county/290-subcounty reference baseline; retain the 2019 validity date, 2025 review date, and 2026 resource modification date. |
| HDX American Red Cross 1,450 wards | `GeographicUnit`, `ExternalIdentifier`, `Crosswalk` | Use as a historical DHIS2-compatible ward baseline with UID/CUID/SCUID; do not represent it as a current legal delimitation source. |
| geoBoundaries open Kenya ADM3 | `GeographicUnit`, `BoundaryVersion`, `Crosswalk` | Use the CC-BY 4.0 2020 ward layer as an open comparison/crosswalk layer with its `shapeID`; keep 2 unmatched names for manual review. |
| Kenya Gazette Notice No. 15341 of 2024 | `GeographicUnit`, `Authority`, `ProvenanceRecord` | Store 669 parsed service-delivery records with notice date, level, raw name, headquarters, rename note, parent status, and `activation_status=unconfirmed` until Ministry of Interior confirmation. |
| Postal Corporation of Kenya locator | `PostOffice`, `Postcode`, `PostalReference`, `Address` | Treat postcodes as post-office reference codes; do not infer polygons or equate them to administrative units. |
| Kenya Roads Board RICS portal | `RoadSegment`, `RoadInventoryObservation`, `RoadConditionObservation` | Store 2018/2023 survey provenance only under KRB reuse consent; do not redistribute restricted data without authorization. |
| Geofabrik OpenStreetMap Kenya extract | `RoadSegment`, `TransportRoute`, `Facility`, `GeoObservation` | Use current ODbL route/feature data for routing and discovery with extract timestamp and attribution; not a legal boundary or delivery guarantee. |
| NCA Building Code 2024 and project registration | `Standard`, `Rule`, `RuleApplicability`, `NCAProjectRegistration`, `Credential`, `Permit`, `Evidence` | Version rules and evidence requirements; support compliance workflows but do not make regulatory determinations. |
| NEMA EIA/EA | `EnvironmentalAssessment`, `EIALicence`, `EnvironmentalAudit`, `EnvironmentalManagementPlan` | Model pre-commencement assessment/licence and ongoing audit separately, with project/site applicability and expert credentials. |
| PPRA standard tender documents and PPIP awards | `ProcurementRegime`, `StandardDocumentVersion`, `ProcurementAward`, `AwardedSupplier`, `DirectorDisclosure` | Version templates and historical awards; never treat an award as current stock, price, facility, or delivery capability. |
| PPRA April 2026 Market Reference Guide | `MarketReferenceGuide`, `MarketReferenceObservation`, `PriceObservation` | Store 98 construction-relevant sampled building-material/waterworks rows with town, unit, quantity, KES price, survey period, and indicative status. |
| KNBS CIPI Q2 2026 | `CostIndexSeries`, `CostIndexObservation`, `ProductClass`, `LabourClass`, `EquipmentClass` | Store macro construction cost indices with period and Q4 2019=100 base; never overwrite supplier-level prices or negotiated rates. |

### Public-data relationship chain

```text
PublicReferenceSource
  → PublicReferenceRecord
  → ProvenanceRecord / DocumentVersion / BoundaryVersion
  → GeographicUnit / RoadSegment / PostOffice / ProductClass / Authority / Rule
  → Crosswalk / SpatialMembership / RuleApplicability / MarketReferenceObservation / CostIndexObservation
  → Canonical entity only after stewarded matching
```

The public layer resolves the geographic baseline, source-backed service-delivery hierarchy, open ward comparison, initial construction-price references, macro cost indices, official compliance vocabularies, and historical public-supplier enrichment. It does not resolve private tenant policy, user consent, current supplier inventory, live quotations, confidential project records, parcel ownership, commercial KRB licensing, authenticated KRA/eTIMS verification, payment-provider access, or a complete current national address/postcode polygon layer.

## 10. Public-data implementation gate

The first implementation should load the public data into reference tables, not directly into canonical `registry_entity` records. The recommended order is: register sources; load Admin-0/Admin-1/Admin-2; load the ward baselines and crosswalk; load Gazette service-delivery records; load PPRA and KNBS reference observations; then expose only version-aware query projections to downstream modules. Any record with `unresolved`, `ambiguous_reference`, `manual_review`, `restricted`, or `unconfirmed` status must remain visibly qualified in the API.


## 11. Master canonical product layer v0.4

The WAJENZI master product catalogue is the authoritative source for the initial canonical product universe. It contains 12,663 canonical roots and 517 canonical variants in the attached export. A `simple` row is a canonical product root. A `variable` row is a canonical product family/root. A `variation` row is a canonical variant and must resolve to a root; it must not become a second root.

```text
MasterCatalogue
  → MasterProductRecord
      → Product                         (simple or variable root)
      → ProductVariant                  (variation)

SupplierOrganization
  → SupplierProductSubmission
      → CanonicalizationCandidate
          → CanonicalizationDecision
              → resolves_to existing Product/ProductVariant
              → or creates approved new Product/ProductVariant
      → ProductOffer → PriceObservation / AvailabilityObservation / DeliveryPromise
```

The CSV `ID` and `SKU` values remain namespaced source identifiers. They are not WAJENZI canonical IDs. The first bootstrap may use deterministic opaque IDs derived from the master catalogue code and source row ID to guarantee replay idempotency, while the production registry keeps its public URI and immutable-ID policy.

The current export’s 517 variations resolve completely when the importer uses the following cascade: unique parent SKU first, then `id:<source ID>` fallback. The observed split is 448 unique-SKU resolutions and 69 source-row-ID resolutions. The importer must retain the raw `Parent` value and resolution method for auditability.

A supplier’s existing match means **no new canonical creation**. The supplier row is retained as source evidence, then linked to the existing canonical product or variant through a supplier offer/listing. Only an approved `new_canonical_product` or `new_canonical_variant` decision may grow the canonical catalogue. Prices, stock, seller SKU, facility, lead time, tax basis, images, and delivery promises belong to supplier-specific commercial records and must not overwrite canonical identity.

The match hierarchy is deterministic identifiers first: authorized WAJENZI ID, exact GTIN, exact manufacturer part number with verified manufacturer/brand, exact identity-bearing attribute key, classification plus attributes, and finally fuzzy discovery. Fuzzy name or image similarity may propose a candidate but cannot create or merge canonical identity. Conflicts, non-unique keys, or incomplete identity-bearing specifications must produce `review_required`.

The master export contains data-quality conditions that the registry must preserve: 1,871 blank SKU rows, 74 duplicate nonempty SKU groups, 1,388 candidate-key collision groups, three variable roots without variation rows after the parent-ID fallback, and classification fields with varying confidence. These facts do not invalidate the master catalogue; they define the fields and cases that require provenance, conflict states, and stewardship rather than silent deduplication.
