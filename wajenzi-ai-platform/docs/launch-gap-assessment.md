# Wajenzi.AI Launch-Gap Assessment and Enhancement Roadmap

## Executive assessment

Wajenzi.AI already has a distinctive public experience, an ontology-backed marketplace, supplier-linked product data, role-aware workspaces, supplier-document extraction, canonical matching, Supplier POS and Master POS foundations, and a Vercel-ready frontend. The largest remaining gap is not another dashboard. It is the **operational bridge from an attractive, data-rich interface to a trusted transaction and project system**.

The platform should now prioritize evidence-backed workflows, real organization/project data, and clear commercial handoffs. Construction marketplaces require structured project specifications and bids, supplier verification, milestone-oriented payment controls, documentation, location-aware coordination, and dispute handling rather than only a directory or product grid [1]. Construction procurement products also emphasize multi-entity cost control, approval chains, supplier catalogs, mobile access, invoice traceability, and risk management [2]. Vendor-procurement products differentiate through historical supplier performance, competitive bidding, scope-gap detection, and integrations [3].

## What is already strong

The public homepage communicates a clear construction operating-system position and routes users into marketplace and role workspaces. The marketplace successfully loads the existing supplier-linked catalog and preserves canonical identity through the Wajenzi ontology. The frontend can be hosted separately on Vercel while using the existing managed backend through the configured API proxy. The authenticated application has a broad role taxonomy, organization/project selectors, role work items, supplier semantic extraction, verification-policy boundaries, ERP-boundary placeholders, and audit-oriented lifecycle records.

## Highest-priority additions

| Priority | Addition | Why it matters | Recommended first release |
|---|---|---|---|
| P0 | **Real project workspace and project setup** | Every procurement action needs a durable project, site, budget, dates, participants, and permissions rather than illustrative dashboard context. | Project creation, project profile, site/location, budget baseline, members, activity timeline, and project-scoped permission checks. |
| P0 | **Complete RFQ-to-award workflow** | The current interface points toward RFQs and quotations, but the commercial path should be explicit and traceable. | RFQ template from BOQ or selected products; supplier invitations; deadline; quote line comparison; clarification thread; award recommendation; buyer approval; immutable version history. |
| P0 | **Supplier trust center** | “Verified suppliers” is a strong promise and needs visible evidence, status, expiry, reviewer, and limitations. | Supplier profile with evidence checklist, verification status, last reviewed date, coverage area, product categories, response history, and an honest “not verified” state. Do not add invented ratings or testimonials. |
| P0 | **Real product availability and price freshness** | Product discovery is valuable only if buyers can understand when price, stock, location, and source evidence were last updated. | Add “observed at,” source document, supplier lead time, location, MOQ, price validity, stock confidence, and stale-data warnings to product cards and comparison views. |
| P0 | **Notifications and communication center** | RFQs, quote clarifications, approvals, delivery changes, and verification requests need reliable follow-up. | In-app inbox first; event-based notifications for RFQ sent, quote received, clarification requested, approval required, verification decision, delivery status, and failed processing. Add email or WhatsApp only after provider and consent choices are defined. |
| P0 | **Commercial handoff language and controls** | The public copy mentions procurement, escrow, and delivery; the interface must clearly distinguish draft, approved, executed, and externally settled actions. | Status vocabulary, confirmation summaries, actor/time audit trail, terms acceptance, and explicit “no payment has been initiated” states until a payment provider is selected and integrated. |
| P1 | **BOQ and drawing review workspace** | Upload exists, but buyers need confidence that quantities and assumptions are reviewable before procurement. | Source preview, extracted line items, units, assumptions, confidence, manual corrections, version comparison, and export to RFQ. Treat scanned/image OCR as a separate assessed scope. |
| P1 | **Project cost and variance control** | Construction buyers need to see budget, committed, quoted, ordered, delivered, invoiced, and paid amounts in one vocabulary. | Cost-code mapping, budget baseline, quote comparison, approved commitment, change order, invoice/GRN matching, variance alerts, and exportable reports. |
| P1 | **Delivery and goods-received workflow** | Logistics is currently represented, but operational value comes from matching dispatch, delivery, site acceptance, and exceptions. | Delivery order, vehicle/driver assignment, ETA, proof of delivery, partial receipt, damaged/short quantity, site contact, and exception resolution. Keep maps optional when the provider is unavailable. |
| P1 | **Organization administration and permission UX** | The formal membership foundation exists, but users need to understand who can see and approve what. | Member invitations, role and project-scope editor, permission explanation, suspended-member handling, organization switcher, project switcher, and visible current-context indicator on every write action. |
| P1 | **Operational analytics based on real records** | Several dashboard charts and cards are explicitly illustrative. Presenting them as live metrics would weaken trust. | Replace static trend arrays with database-backed counts and timestamps; label empty states as “No activity yet”; add supplier response time, quote coverage, price freshness, procurement cycle time, and delivery exception metrics. |
| P2 | **ERP integration adapter** | ERP connectivity is useful, but the provider and credentials are not yet selected. | Keep the current inactive outbox and mapping boundary. First support one selected provider with a narrow mapping: suppliers, products, purchase orders, receipts, invoices, and sync status. Never store plaintext credentials. |
| P2 | **Mobile-first site operations and offline capture** | Site teams often work with poor connectivity and need fast capture more than dense analytics. | Installable PWA shell, offline draft for receipt/inspection notes, queued user-visible sync, camera attachments, and conflict resolution. Do not create hidden background workers. |
| P2 | **Public trust and conversion layer** | The homepage is strong visually but can convert more visitors with proof that is specific and verifiable. | Add product demo video or screenshots, transparent “how verification works,” service-area coverage, supplier onboarding expectations, FAQ, contact route, privacy/terms, and role-specific signup paths. Use only real customer evidence when available. |
| P2 | **Support, observability, and recovery** | A production marketplace needs clear failure recovery for uploads, API errors, and delayed supplier responses. | User-facing status pages for processing jobs, retry actions, request IDs, admin error queue, structured logs, uptime monitoring, and a support escalation path. |

## Three additions I would build next

### 1. The project command center

Create one durable project view that becomes the source of context for the rest of the application. It should show project identity, site, budget, timeline, team, procurement status, documents, approvals, deliveries, and activity. Every BOQ, RFQ, product shortlist, supplier decision, and delivery event should attach to this project. This will make the existing dashboards feel like coordinated views of one operating system rather than separate feature pages.

### 2. The RFQ and quotation comparison room

Turn the current marketplace-to-procurement promise into a concrete buyer workflow. A buyer should select ontology-backed products or approved BOQ lines, define quantity and delivery context, invite suppliers, receive itemized quotes, compare substitutions and exclusions, ask clarifying questions, and approve an award. The system should preserve the original RFQ, quote versions, evidence, timestamps, and actor decisions. This is the clearest path to demonstrating commercial value without prematurely integrating payments.

### 3. The supplier trust and data-freshness profile

Make supplier verification and product provenance visible at the decision point. A supplier profile should show the organization identity, verification state, evidence categories, review date, locations served, product coverage, response activity, and data freshness. A product should show canonical identity separately from supplier-specific price, stock, pack/unit, source document, and observation time. This reinforces the ontology boundary and lets buyers make informed decisions without fabricated ratings or reviews.

## Items to avoid adding yet

Do not add more role dashboards until the existing workflows produce real records. Do not publish invented reviews, ratings, testimonials, supplier performance numbers, or sample customer outcomes. Do not connect an ERP, payment provider, WhatsApp gateway, or email provider until the provider, credentials, consent, and data-retention requirements are selected. Do not advertise OCR as available while the current extraction engine remains document-text based. Do not create an in-process timer or hidden asynchronous worker; retain user-invoked processing and explicit retry states until the operating model is chosen.

## Suggested 90-day sequence

| Window | Focus | Success signal |
|---|---|---|
| Days 1–30 | Project command center, membership UX, real dashboard metrics, supplier trust profile, data-freshness indicators. | A buyer can create a project, invite a member, review real catalog data, and understand supplier evidence and price freshness. |
| Days 31–60 | RFQ, quotation comparison, clarifications, approval history, notifications, and procurement exports. | A buyer can produce a traceable RFQ, compare supplier responses, approve a decision, and see every status transition. |
| Days 61–90 | Delivery/receipt workflow, cost variance, support/recovery, one selected integration boundary, and mobile site capture. | A selected procurement decision can be tracked through dispatch, receipt, exception handling, and reporting without misleading execution claims. |

## Launch-readiness checklist

Before broad public acquisition, confirm that the site has a real support contact, privacy notice, terms of use, supplier verification explanation, clear payment language, error recovery, empty states, rate limiting, audit history, backups, and a tested route for deleting or correcting user data. Confirm that every visible metric is either database-backed or clearly labeled as an example. Confirm that the Vercel frontend has the correct root directory and backend URL/proxy configuration, while secrets remain on the backend.

## References

[1]: https://www.sharetribe.com/create/how-to-build-marketplace-for-construction-services/ "Sharetribe — How to build a construction services marketplace"

[2]: https://precoro.com/customers/construction "Precoro — Construction procurement software"

[3]: https://www.northspyre.com/vendor-procurement "Northspyre — Construction vendor procurement software"

> **Recommendation:** Build the project command center and RFQ comparison room before adding more surface area. They connect the ontology, products, supplier verification, procurement, approvals, and logistics into one measurable customer journey.

*Prepared by Manus AI for Wajenzi.AI.*
