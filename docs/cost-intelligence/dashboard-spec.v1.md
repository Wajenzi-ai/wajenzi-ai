# Wajenzi Cost Intelligence Dashboard Specification v1.0

**Audience:** homeowner, contractor, quantity surveyor, project manager, Wajenzi finance/admin  
**Pilot:** WJ-PROJ-000078, mock 3-bedroom, 120 m² bungalow, Nakuru  
**Status:** design specification; no production UI wired yet

## 1. Shared project header

- Project code, name, location, project type, gross floor area, cost-model version, drawing revision and estimate date.
- Visible data badge: **MOCK DATA — NOT A LIVE QUOTATION** until all price sources are verified.
- Status: draft / in review / approved / superseded.
- Currency, price-valid-until date, last calculation time and confidence/completeness score.

## 2. Primary KPI strip

| KPI | Definition |
|---|---|
| Technical construction estimate | Sum of priced building-system resource lines |
| Forecast delivery cost | Technical + indirect + finance + expected risk + residual contingency + configured project tax |
| Customer commercial price | Forecast delivery cost + Wajenzi margin + service fees + applicable customer tax |
| Cost per m² | Selected cost output ÷ gross floor area |
| Funding requirement | Peak cumulative cash deficit from scheduled outflows/inflows and opening cash |
| Estimate confidence | Weighted evidence completeness for drawings, quantities, prices, productivity and scope |

Never label the funding requirement as project cost; never include Wajenzi margin in forecast delivery cost.

## 3. Contractor workspace

### Main layout
- Left rail: Overview, Building Systems, BOQ & Quantities, Procurement Prices, Labour & Equipment, Programme & Cashflow, Risks & Scenarios, Approvals, Audit Trail.
- Main column: forecast delivery cost, system cost waterfall, monthly cashflow, cost-to-complete and alerts.
- Right panel: estimate assumptions, data freshness, missing inputs, price validity, approval state and recommended review actions.

### Charts and tables
1. **System cost bar chart:** 10 building systems, amount, percentage of direct cost, change versus previous model.
2. **Cost composition waterfall:** direct construction → indirect → finance → risk → contingency → tax → forecast.
3. **Monthly cashflow bars:** planned outflow, inflow, net cash, cumulative balance and peak funding gap.
4. **BOQ table:** system, assembly, item, measured quantity, waste, procurement quantity, unit, supplier, base rate, landed rate, escalation, line total, source date, confidence.
5. **Procurement comparison:** supplier, SKU, location, quote validity, tax status, delivered/collection basis, transport, handling, total landed price.
6. **Schedule-linked cost curve:** planned value, actual cost, committed cost, forecast final cost; later support earned-value metrics only when progress measurement is reliable.

### Contractor actions
- Edit quantity with reason and measurement evidence.
- Compare supplier options without replacing canonical product identity.
- Override productivity or wastage only with a recorded reason.
- Create what-if scenario for location, specification, programme or supplier.
- Submit cost model for QS/owner review; only authorized approvers can approve.

## 4. Homeowner workspace

Simplify technical complexity while preserving traceability:
- Total forecast delivery cost and customer price displayed separately.
- Budget vs forecast and remaining budget.
- Stage-by-stage cost summary in plain language.
- Planned payment schedule and upcoming funding requirements.
- Change-order impact before approval.
- Price-change alerts and reasons.
- Downloadable estimate summary with assumptions, exclusions and validity date.
- Drill-down to detailed BOQ is optional and permission controlled.

## 5. Risk and scenario panel

- Sensitivity tornado chart: change in total forecast cost when cement, steel, labour, transport, duration, location index or finish specification changes.
- P50/P80/P90 percentile cards with scenario count, seed, model version and assumptions.
- Scenario comparison table: base vs selected scenario, absolute delta, percentage delta, changed variables.
- Risk register: probability, gross impact, residual probability/impact, expected exposure, owner, response and status.
- Clearly label Monte Carlo results as modelled scenarios, not guarantees.

## 6. Data quality and warnings

Block approval if:
- required drawings/specifications are missing or stale;
- quantity units cannot be converted;
- price tax status is unknown for a tax-inclusive quote;
- price is expired or unverified and the user has requested a firm quote;
- a material has no valid source price;
- direct/indirect cost allocation is duplicated;
- tax applicability is unresolved;
- model hash or calculation output hash is missing.

Warnings (non-blocking unless policy says otherwise):
- low-confidence quantity takeoff;
- low sample count for local productivity;
- supplier price older than configured freshness threshold;
- large variance between suppliers or prior estimates;
- risk correlations not represented in Monte Carlo v1.

## 7. Responsive behaviour and access

- Desktop: three-column contractor view; homeowner view uses two columns.
- Tablet: collapse right panel into drawer.
- Mobile: KPI cards horizontally scroll; charts stack; BOQ rows become detail cards.
- Homeowner sees approved commercial summary and permitted project detail.
- Contractor/QS sees technical BOQ and quantity evidence according to project role.
- Supplier sees only its own quotation/submission records, never other suppliers' prices or project margin.
- Wajenzi finance/admin access is permissioned and audited.
- Browser clients never receive service-role credentials.

## 8. API read model

Recommended server-side endpoints:
- `GET /api/projects/:projectId/cost-models/:modelId/summary`
- `GET /api/projects/:projectId/cost-models/:modelId/systems`
- `GET /api/projects/:projectId/cost-models/:modelId/boq`
- `GET /api/projects/:projectId/cost-models/:modelId/cashflow`
- `GET /api/projects/:projectId/cost-models/:modelId/scenarios`
- `POST /api/projects/:projectId/cost-models/:modelId/runs`
- `POST /api/projects/:projectId/cost-models/:modelId/submit-approval`

Every response includes model version, calculation run ID, currency, data-status, timestamp and source freshness. Mutations require project-role authorization and append-only audit events.
