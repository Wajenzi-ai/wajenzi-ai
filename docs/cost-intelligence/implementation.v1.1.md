# Wajenzi Dynamic Total Project Cost Intelligence Engine v1.1

## Scope and status

This package extends the existing v1.0 pilot without replacing its files. It adds a typed formula registry, a versioned cost taxonomy, a deterministic calculation module, regression tests, a mock Nakuru bungalow fixture, an additive Supabase migration and a dashboard specification.

**Status: draft for technical/QS/tax review.** No migration has been applied, no production data has been changed and no deployment has been performed.

## Pilot case and baseline

All values are mock data, not supplier quotations, measured BOQ, QS valuation, approved budget or tax advice.

- Project: WJ-PROJ-000078
- Building: illustrative 3-bedroom bungalow
- Location: Nakuru, Kenya
- Gross floor area: 120 m²
- Programme: 8 months
- Direct construction: KSh 8,585,000.00
- Indirect/professional: KSh 1,300,000.00
- Finance: KSh 250,000.00 (KSh 174,000 interest + KSh 76,000 fees)
- Expected risk: KSh 210,000.00
- Contingency base: KSh 9,885,000.00
- Residual contingency: 5% × KSh 9,885,000 = KSh 494,250.00
- Forecast delivery cost before tax and land: KSh 10,839,250.00
- Cost per m²: KSh 90,327.08
- Mock cashflow: zero opening cash, no inflows, scheduled outflows totalling KSh 10,839,250; peak funding gap KSh 10,839,250.

Tax lines are empty in this baseline only to preserve the agreed pre-tax reconciliation. This does not establish exemption or zero-rating.

## Financial output contracts

1. **Technical construction estimate** = direct materials + labour + equipment + subcontract + direct logistics. Report the technical net amount and separately expose input tax.
2. **Forecast delivery cost** = technical estimate + indirect/professional + financing + expected residual risk + residual contingency + non-recoverable input tax + other configured project taxes.
3. **Customer commercial price** = forecast delivery cost + either markup or gross-margin uplift + service fees + customer output tax. Never add this to forecast delivery cost.
4. **Funding requirement** = maximum negative cumulative cash balance after opening cash and period inflows/outflows. Do not label it total project cost.

## Deterministic formula rules

### Quantities
- Assembly gross quantity = measured quantity × assembly resource coefficient.
- Procurement quantity = assembly gross quantity × (1 + wastage rate), only if waste is not already embedded in the coefficient.
- A non-zero separate waste rate combined with an embedded-waste coefficient is rejected.
- Unit conversion is allowed only when dimensional vectors match.

### Supplier price and landed cost
- Normalize each supplier and ancillary charge independently using its tax status.
- Exclusive: net = amount; tax = net × rate; gross = net + tax.
- Inclusive: gross = amount; net = gross / (1 + rate); tax = gross − net.
- Exempt/zero-rated: tax = 0.
- Unknown tax status blocks firm quotes.
- Recoverable input VAT is excluded from project cost; non-recoverable VAT is carried as a separate project cost.
- Location index = current index / base index, and applies only to national/base price evidence. A local quote is not indexed again.
- Landed net unit price = supplier net + external transport + handling + insurance − discount.
- Delivered-to-site offers reject an additional site-transport charge.
- Escalated unit price = landed price × (1 + rate per period)^(months to need / period length).
- Fixed-price committed quantities are priced at contractual unit rate. Only uncommitted or contractually exposed quantities receive current market repricing/escalation.

### Labour, equipment and logistics
- Worker-hours = work quantity / output per worker-hour.
- Labour cost = worker-hours × daily wage / paid hours per day.
- Crew duration = worker-hours / (crew size × paid hours per day), rounded up to the configured schedule precision.
- Equipment = operating hours × hourly rate + mobilization + fuel; fuel/operator inclusions must be declared.
- Logistics = trips × trip rate + loading + offloading + waiting; delivered legs cannot be charged again.

### Indirect, finance and risk
- Indirect costs are explicit cost lines and exclude preliminaries already assigned to direct works.
- Finance = sum(period outstanding balance × rate for that period) + arrangement/other fees. Rates and balance periods must align.
- Expected risk = sum(residual probability × residual impact), excluding risks already insured, transferred or priced elsewhere.
- Residual contingency = explicit eligible cost base × approved residual rate. The pilot base is direct + indirect, excluding finance and expected risk.

### Commercial and funding
- Markup price before service/tax = forecast × (1 + markup rate).
- Gross-margin price before service/tax = forecast / (1 − gross margin rate).
- The two rates are not interchangeable.
- Customer tax is calculated after the commercial amount and is never included in forecast delivery cost.
- Funding is the peak cumulative cash deficit from ordered cashflow periods.

## Dependency graph and selective recalculation

The v1.1 formula registry declares formula keys, typed inputs/outputs, units, versions, provenance, effective dates and explicit dependencies. Runtime graph rules:
1. Reject duplicate formula keys, duplicate node IDs and missing dependencies.
2. Reject cycles before any calculation.
3. Topologically sort the affected graph.
4. On a change event, traverse downstream dependents and recompute only affected formulas.
5. Reuse unchanged values only when their source hashes and formula versions match the current run.
6. Persist changed entity/property, old/new values, unit, reason, source, affected formula keys and run ID.
7. Create a new run; never overwrite an approved result.

The module includes a deterministic DAG executor and a selective dependency-closure function. The database migration adds versioned formula edges and append-only change events.

## Versioned calculation runs and controls

Each run stores:
- immutable input and result snapshots;
- SHA-256 hashes of canonicalized JSON snapshots;
- engine and formula registry versions;
- model/scenario IDs, seed and iteration count;
- price snapshot IDs and validity windows;
- drawing revision and measurement evidence references;
- assumptions, tax policies and unit conversions;
- approval actor, timestamp and decision.

The SQL migration adds protections against mutation/deletion of completed calculation snapshots and all cost-lineage rows. Corrections must produce a new run. Approval requires an authorized reviewer and reason. The application must enforce tenant/project membership before using the service role.

## Schema coverage

The v1.0 migration already supplies projects, cost models, formula registry, building systems, assemblies, measurements, resource requirements, supplier price snapshots, location indices, labour productivity, schedule tasks, cashflows, risks, scenarios, calculation runs, lineage and approvals.

The v1.1 additive migration adds:
- canonical units and dimensional metadata;
- canonical entity and property/symbol registries;
- formula dependency edges;
- tax policy evidence and effective dates;
- procurement commitments and price-lock exposure;
- supplier delivery basis, local/base price basis and VAT recoverability;
- explicit schedule dependency edges;
- calculation change events;
- immutable completed-run and append-only lineage triggers.

## Automated tests

Run from the repository root:

```bash
node --test src/lib/costing/engine-v1.1.test.mjs
```

The suite covers mock project reconciliation, cement wastage/landed price/escalation, worker-hour productivity, inclusive/exclusive VAT and recoverability, unknown tax rejection, delivered-transport duplication, location index application, committed/uncommitted price exposure, residual risk/contingency, markup versus gross margin, funding gap, DAG order/cycle/missing dependency/selective recalculation, formula registry validation, snapshot hashes and seeded Monte Carlo reproducibility.

## Assumptions and unresolved inputs

- The 10 system cost totals and cashflow schedule are aggregate mock inputs; the pilot does not contain a complete priced resource-level BOQ.
- No live Nakuru supplier quotations, delivery-basis evidence, tax classifications or current local price indices are loaded.
- Labour productivity and wages require verified trade/locality observations.
- The eight-month schedule, cashflow and financing balances are illustrative; financing must be recalculated from approved drawdown and repayment terms.
- The pilot tax base is zero for pre-tax reconciliation only. A Kenyan tax professional must configure transaction-level tax applicability and recoverability.
- Risk events are independent in the v1.1 Monte Carlo model. Correlation, schedule/weather interactions and conditional risk dependencies are not yet modelled.
- The existing v1 P50/P80/P90 values are historical mock outputs; recalculate under v1.1 and persist the exact run before using them in a live dashboard.
- The Supabase connector's skill instructions were not available in this session, so the database was not inspected or modified. Migration remains unexecuted and requires the intended project ID, development branch and authorized review.

## Deployment boundary

This is a feature-branch implementation only. No production migration, deployment, data import, financial transaction or approval has been executed.
