# Wajenzi Dynamic Total Project Cost Intelligence Engine

**Status:** implementation slice / review required  
**Engine:** 1.0.0  
**Formula registry:** WJ-COST-FORMULAS-1.0.0

## Pilot fixture

WJ-PROJ-000078 is a mock 3-bedroom, 120 m² bungalow in Nakuru, Kenya, with an illustrative eight-month programme. All amounts in the fixture are **mock data**, not live supplier quotations, measured project BOQ, QS valuation or tax advice.

| Component | KSh |
|---|---:|
| Direct construction | 8,585,000.00 |
| Indirect and professional | 1,300,000.00 |
| Financing (interest and fees) | 250,000.00 |
| Expected risk | 210,000.00 |
| Residual contingency (5% × 9,885,000) | 494,250.00 |
| **Forecast delivery cost before tax and land** | **10,839,250.00** |
| Floor area | 120 m² |
| **Cost per m²** | **90,327.08** |

Tax base is zero in this fixture solely to preserve the agreed pre-tax subtotal; this does not imply exemption. Land is excluded.

## Four separate financial outputs

- **Technical construction estimate:** physical resource cost (materials, labour, equipment, subcontract and direct logistics).
- **Forecast delivery cost:** technical cost plus indirect costs, finance, expected risk, residual contingency and applicable project taxes.
- **Customer commercial price:** forecast delivery cost plus disclosed Wajenzi margin, service fees and applicable customer tax.
- **Funding requirement:** peak cumulative cash deficit under the programme, not the total project cost.

## Formula and pricing controls

- Procurement quantity = measured quantity × (1 + wastage).
- Landed price = supplier price + transport + handling + insurance − discount.
- Future unit price = landed price × (1 + escalation rate)^periods.
- Labour hours = work quantity ÷ output per worker-hour.
- Labour cost = worker-hours × daily wage ÷ paid hours/day.
- Finance = sum(monthly outstanding balance × monthly rate) + fees.
- Expected risk = sum(probability × impact).
- Residual contingency = eligible cost base × residual contingency rate.
- Tax status is explicit: exclusive, inclusive, exempt, zero-rated or unknown. Unknown tax status must block a final tax-inclusive customer quote.
- Delivered prices cannot receive duplicate transport; preliminaries cannot be counted again as overhead; expected risk and contingency are separate; commercial margin is not a delivery cost.

## Reproducibility

A run must preserve immutable input and result snapshots, input/result hashes, engine and formula versions, price snapshot IDs and validity dates, drawing/measurement revisions, assumptions, scenario parameters and random seed. Any change creates a new run; approved results are never overwritten.

## Monte Carlo v1 limitation

The included seeded simulator uses independent triangular multipliers for direct, indirect and finance costs, plus Bernoulli risk events. It reports empirical P50/P80/P90. It does not yet model correlation, schedule propagation, weather calendars or conditional dependencies. Percentiles are scenario estimates, not guarantees.

## Schema and security

The draft SQL migration creates a private `costing` schema with projects, models, formula registry, building systems, assemblies, quantity measurements, resource requirements, supplier price snapshots, location indices, labour productivity, schedule tasks, cashflows, risks, scenarios, calculation runs, lineage and approvals.

RLS is enabled. The schema is not exposed to browser roles; the intended API is a trusted server-side/Edge Function after project membership checks. Never expose a Supabase service-role key in the browser.

## Test

Run: `node --test src/lib/costing/engine.test.mjs`

Tests cover subtotal reconciliation, cement wastage/landed price/escalation, labour productivity, inclusive/exclusive tax, risk and contingency, customer margin separation, peak funding gap and seeded Monte Carlo determinism.

## Remaining decisions before production estimates

1. Confirm the canonical project and project-role/tenant model; map current ontology product, supplier, location and document identifiers.
2. Connect drawing revisions, takeoff evidence, unit conversions and human QS review.
3. Load verified supplier quotations by location, delivery basis, tax status and validity.
4. Load approved trade productivity and wage observations.
5. Confirm equipment hire/ownership, fuel, schedule, procurement lead times, payment terms and actual financing contracts.
6. Obtain qualified Kenyan tax review and configure item/service tax applicability; no universal tax rate is assumed.
7. Approve risk correlations, contingency policy and QS sign-off thresholds.
8. Confirm which Supabase project is the intended Wajenzi environment. Both projects visible to the connector are currently inactive/unavailable.

**Deployment boundary:** migration is prepared on a feature branch only. It has not been applied to Supabase and no production data or deployment was changed.
