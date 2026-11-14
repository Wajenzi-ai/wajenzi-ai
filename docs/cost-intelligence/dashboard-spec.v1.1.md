# Wajenzi Cost Intelligence Dashboard Specification v1.1

**Pilot:** WJ-PROJ-000078 — mock 3-bedroom, 120 m² bungalow, Nakuru, Kenya  
**Engine:** 1.1.0 · **Formula registry:** WJ-COST-FORMULAS-1.1.0  
**Status:** implementation specification; not a production-connected UI

## 1. Persistent project context

Show project code, location, building type, gross floor area, model version, drawing revision, estimate date, currency, source freshness, price-valid-until date, calculation run ID and approval state. A persistent **MOCK DATA — NOT A LIVE QUOTATION** indicator must remain visible while any required project input is mock or unverified.

## 2. Four financial views — never combine into one unlabeled total

| View | Mock pilot value | Definition |
|---|---:|---|
| Technical construction estimate | KSh 8,585,000.00 | Direct physical works, before separately identified non-recoverable input tax |
| Forecast delivery cost | KSh 10,839,250.00 | Technical + indirect + financing + expected risk + residual contingency + configured non-recoverable taxes |
| Customer commercial price | Not configured | Forecast + selected markup or gross margin + service fees + customer output tax |
| Funding requirement | KSh 10,839,250.00 | Peak cash deficit in the illustrative cashflow with zero opening cash and no inflows |

The funding figure equals the forecast only because the mock cashflow has no inflows and starts with zero cash. It is not a general identity.

## 3. Shared KPI strip

- Forecast delivery cost: KSh 10,839,250.00
- Cost per gross floor area: KSh 90,327.08/m²
- Direct construction estimate: KSh 8,585,000.00
- Funding requirement: KSh 10,839,250.00
- Estimate confidence and evidence completeness: calculated from drawing, measurement, price, productivity and scope evidence; never fabricated.
- Scenario P50/P80/P90: show iteration count, seed, engine version, formula registry version and limitations.

## 4. Contractor workspace

### Main navigation
Overview · Building Systems · BOQ & Quantities · Procurement Prices · Labour & Equipment · Programme & Cashflow · Risks & Scenarios · Approvals · Audit Trail.

### Charts and tables
1. System cost bars for the 10 pilot systems, including amount, share of direct cost and delta from prior model.
2. Cost waterfall: direct → indirect → financing → expected risk → contingency → non-recoverable input taxes → forecast delivery cost.
3. Monthly cashflow: planned outflow, inflow, net movement, cumulative balance and peak funding gap.
4. BOQ: system, assembly, measurement evidence, measured quantity, coefficient, wastage, procurement quantity, unit, resource, supplier, net price, tax status, delivery basis, location factor, escalation, committed quantity, exposed quantity and line total.
5. Supplier comparison: supplier, SKU, price validity, tax basis, VAT recoverability, delivery basis, transport inclusion, handling, insurance, discount, landed net price and source confidence.
6. Schedule-linked cost curve: baseline, committed, actual, forecast final cost and cash requirement.

### Required controls
- Quantity overrides require reason, source evidence and user identity.
- Waste already embedded in an assembly coefficient cannot be applied again.
- Delivered-to-site offers suppress separate site-transport cost.
- Local supplier quotes do not receive national location indices.
- Fixed-price committed quantities do not reprice unless the contract contains an escalation clause.
- Any override creates a change event and a new calculation run.
- QS/authorized reviewer approval is required before an estimate becomes approved.

## 5. Homeowner workspace

Show forecast delivery cost, customer commercial price, budget variance, stage-level costs, payment milestones, funding shortfall and approved changes in plain language. Detailed BOQ and supplier comparisons are permission-controlled. Margin and supplier confidential terms are not exposed to unauthorized roles.

## 6. Sensitivity and scenario outputs

Sensitivity controls cover cement, steel, labour productivity/wage, transport, local price index, finish specification and programme duration. Each scenario recalculates only impacted dependency nodes and shows absolute and percentage change against the approved baseline.

The current v1 mock simulation reference is:

| Percentile | Modelled total |
|---|---:|
| P50 | KSh 11,141,642.31 |
| P80 | KSh 11,559,696.07 |
| P90 | KSh 11,770,953.55 |

These values are inherited from the v1 pilot's seeded 10,000-iteration independent-triangle/Bernoulli-risk simulation. Re-run and persist them under v1.1 before production use. They are not quotations, guarantees or confidence intervals. Correlation, weather-calendar and schedule-dependent risk remain unresolved.

## 7. Approval blockers

Block firm quote or approval when required units are incompatible, formula graph has missing nodes/cycles, tax status is unknown, supplier quote is expired, location index is missing for a national-base price, commitment quantity exceeds requirement, delivered transport is duplicated, formula/run hashes are absent, or source evidence is below configured policy.

## 8. Role visibility

- Homeowner: approved project summary, budget, customer price and permitted stage detail.
- Contractor/QS: technical estimate, BOQ, measurements, rates, scenarios and audit lineage.
- Supplier: own offers and fulfillment status only; no competing supplier confidential prices or Wajenzi margin.
- Wajenzi finance/admin: controlled commercial and settlement visibility with audited access.

## 9. Server-side API read model

- `GET /api/projects/:projectId/cost-models/:modelId/summary`
- `GET /api/projects/:projectId/cost-models/:modelId/systems`
- `GET /api/projects/:projectId/cost-models/:modelId/boq`
- `GET /api/projects/:projectId/cost-models/:modelId/cashflow`
- `GET /api/projects/:projectId/cost-models/:modelId/scenarios`
- `POST /api/projects/:projectId/cost-models/:modelId/runs`
- `POST /api/projects/:projectId/cost-models/:modelId/submit-approval`

Every response includes data status, run ID, formula version, engine version, currency, source freshness and timestamp. The browser never receives service-role credentials.
