# Wajenzi.AI Platform Architecture

## Product purpose

Wajenzi.AI is a construction-intelligence marketplace that connects project owners, construction teams, suppliers, delivery partners, and marketplace operators through trusted procurement, coordinated logistics, secure document handling, and AI-assisted decision support. The first release emphasizes role-specific operational clarity while retaining a shared visual system and connected workflows.

## Dashboard suite

| # | Dashboard | Primary user | Core outcome |
| --- | --- | --- | --- |
| 1 | Homeowner Command Centre | Homeowner or project owner | Discover suitable materials, estimate a project budget, upload a BOQ, and follow protected orders. |
| 2 | Contractor Operations | Contractor or site manager | Move active projects from RFQ to scheduled delivery while monitoring material cost exposure. |
| 3 | Supplier Command Centre | Hardware store, distributor, or manufacturer | Maintain catalog coverage, respond to RFQs, fulfil orders, and evaluate stock and revenue. |
| 4 | Logistics Control Tower | Dispatcher or fleet operator | Assign drivers, monitor delivery routes, resolve exceptions, and confirm site handoffs. |
| 5 | Escrow & Payments | Finance or risk operator | Monitor protected payment states, settlements, approvals, disputes, and KYC signals. |
| 6 | AI Procurement Agent | Buyer, contractor, or estimator | Turn construction requirements or a BOQ into a comparable procurement recommendation and draft RFQs. |
| 7 | Platform Admin | Marketplace operator | Monitor GMV, liquidity, users, supplier verification, and service health. |
| 8 | Project Intelligence | Developer, architect, or contractor | Review project budget, procurement milestones, delivery readiness, and cost variance. |
| 9 | Marketplace Intelligence | Commercial or growth operator | Understand supply coverage, category demand, pricing movement, and catalog quality. |
| 10 | Support & Resolution | Customer support or trust operator | Resolve customer cases, delivery exceptions, disputes, and supplier support issues. |

## Shared navigation and interaction model

Every authenticated dashboard uses the same durable sidebar shell, compact mobile header, role switcher, alert affordance, and user control. The navigation will use role-aware entry points rather than hiding the cross-platform nature of the product: users can inspect other role perspectives in this product demonstration, while production entitlements will be enforced server-side.

The dedicated procurement agent is a full workspace rather than a floating assistant. It combines a conversational panel with a project context rail, structured recommendation cards, quotation controls, document intake, and a generated cart or RFQ summary.

## Core domain entities

| Domain | Key entities | Important relationships |
| --- | --- | --- |
| Identity | User, organization, role entitlement | A user belongs to one or more organizations and has role-specific capabilities. |
| Marketplace | Product, catalog item, category, supplier, inventory snapshot, quotation | Supplier catalog items map to normalized products and can answer buyer RFQs. |
| Projects | Project, BOQ document, procurement request, material line, budget | Projects contain procurement requests, materials, delivery needs, and cost tracking. |
| Commerce | Cart, order, order line, payment, escrow case, settlement | An order is protected by escrow events and can produce a settlement record. |
| Logistics | Delivery, route, route stop, driver, vehicle, proof of delivery | An order can have a delivery route, delivery status, and a site confirmation. |
| Trust | Supplier application, verification document, KYC flag, dispute, support case | Trust operators review supplier and payment risks using linked evidence. |
| Intelligence | Agent conversation, recommendation, market signal, KPI snapshot | The procurement agent produces a human-reviewable recommendation; it does not autonomously commit purchases. |
| Files | Secure file record, S3 object key, owner, purpose, access scope | File bytes live in S3; the database stores metadata and access context only. |

## Service boundaries

The application will expose authenticated, type-safe procedures for dashboard summaries, role switching, AI procurement conversations, document registration, supplier onboarding, and delivery-route requests. AI calls run server-side, and document uploads are placed in secure S3 storage with a unique key and metadata record. The interface uses presentational operational data until each domain procedure is wired to persisted marketplace records.

Google Maps powers live dispatch visualisation, address geocoding, and driver-to-site directions from the logistics workspace. Payment, escrow, and KYC views are operational controls in this release; real payment-provider settlement and legal compliance integrations are intentionally deferred until the appropriate partners and controls are selected.

## Design direction

The product uses a premium **Construction Intelligence** language: charcoal and deep-slate structural surfaces, construction-amber emphasis, ivory workspaces, precision grids, Space Grotesk for display hierarchy, and Inter for dense operational content. Rounded panels, measured depth, contextual status colour, and restrained motion will create a calm but technical interface suitable for complex operations.

## Safety, trust, and demo-data boundaries

The initial UI will use clearly labelled operational sample data to make the platform workflows understandable. The interface will not represent AI outputs as professional quantity-surveying, legal, engineering, or payment approvals; recommendations are framed as decision support requiring review. File objects remain in S3, while database records retain their secure references and access scope.
