-- Wajenzi Cost Intelligence registry seed and governance v1.1.1
-- Additive only. Review and apply to a development branch only after schema review.
-- Depends on 20261113000100_cost_intelligence_engine.sql and 20261114000100_cost_intelligence_v1_1.sql.

create table if not exists costing.entity_type_registry (
  entity_type_code text primary key,
  display_name text not null,
  id_pattern text not null,
  symbol_namespace text not null,
  taxonomy_version text not null,
  effective_from date not null,
  status text not null default 'active' check (status in ('active','deprecated','retired'))
);

create table if not exists costing.relationship_type_registry (
  relationship_code text primary key,
  description text not null,
  is_directional boolean not null default true,
  effective_from date not null default date '2026-11-14'
);

create table if not exists costing.entity_relationships (
  id uuid primary key default gen_random_uuid(),
  from_entity_id uuid not null references costing.entity_registry(id) on delete restrict,
  to_entity_id uuid not null references costing.entity_registry(id) on delete restrict,
  relationship_code text not null references costing.relationship_type_registry(relationship_code),
  cost_model_id uuid references costing.cost_models(id) on delete cascade,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  metadata jsonb not null default '{}',
  check (from_entity_id <> to_entity_id),
  check (valid_to is null or valid_to > valid_from)
);

create table if not exists costing.cost_category_registry (
  category_code text primary key,
  parent_category_code text references costing.cost_category_registry(category_code),
  display_name text not null,
  included_scope jsonb not null default '[]',
  taxonomy_version text not null,
  effective_from date not null,
  effective_to date,
  status text not null default 'active' check (status in ('active','deprecated','retired')),
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists costing.formula_symbol_registry (
  symbol_code text primary key check (symbol_code ~ '^[A-Z][A-Z0-9_]*$'),
  qualified_symbol text not null unique,
  value_type text not null check (value_type in ('number','integer','boolean','string','json')),
  unit_expression text not null,
  description text not null,
  provenance text not null,
  effective_from date not null,
  effective_to date,
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists costing.formula_validation_rules (
  id uuid primary key default gen_random_uuid(),
  formula_key text not null,
  formula_version text not null,
  rule_code text not null unique,
  severity text not null check (severity in ('blocking','warning','informational')),
  rule_expression text not null,
  message text not null,
  provenance text not null,
  effective_from date not null,
  foreign key (formula_key, formula_version)
    references costing.formula_registry(formula_key, version) on delete restrict
);

create table if not exists costing.cost_model_cost_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references costing.projects(id) on delete cascade,
  cost_model_id uuid not null references costing.cost_models(id) on delete cascade,
  line_code text not null,
  cost_scope text not null check (cost_scope in ('direct','indirect','finance','project_tax','service_fee','commercial_adjustment')),
  category_code text references costing.cost_category_registry(category_code),
  description text not null,
  amount numeric(20,6) not null check (amount >= 0),
  currency char(3) not null default 'KES',
  unit_code text references costing.unit_registry(unit_code),
  tax_status text not null default 'unknown'
    check (tax_status in ('exclusive','inclusive','exempt','zero_rated','unknown')),
  tax_rate numeric(9,6) not null default 0 check (tax_rate between 0 and 1),
  input_vat_recoverable boolean not null default false,
  delivery_basis text not null default 'not_applicable'
    check (delivery_basis in ('not_applicable','ex_works','delivered_to_depot','delivered_to_site')),
  cost_owner_key text not null,
  source_type text not null default 'manual'
    check (source_type in ('manual','supplier_quote','verified_invoice','approved_fee_schedule','mock_fixture')),
  source_ref text,
  included_elsewhere boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (cost_model_id, line_code),
  unique (cost_model_id, cost_owner_key)
);

alter table costing.entity_registry
  add constraint entity_registry_entity_type_fk
  foreign key (entity_type_code) references costing.entity_type_registry(entity_type_code) not valid;
alter table costing.entity_property_registry
  add constraint entity_property_entity_type_fk
  foreign key (entity_type_code) references costing.entity_type_registry(entity_type_code) not valid;

alter table costing.assemblies add constraint assemblies_unit_registry_fk
  foreign key (unit_code) references costing.unit_registry(unit_code) not valid;
alter table costing.quantity_measurements add constraint quantity_measurements_unit_registry_fk
  foreign key (unit_code) references costing.unit_registry(unit_code) not valid;
alter table costing.resource_requirements add constraint resource_requirements_unit_registry_fk
  foreign key (unit_code) references costing.unit_registry(unit_code) not valid;
alter table costing.supplier_price_snapshots add constraint supplier_prices_unit_registry_fk
  foreign key (unit_code) references costing.unit_registry(unit_code) not valid;
alter table costing.labour_productivity_rates add constraint labour_productivity_unit_registry_fk
  foreign key (unit_code) references costing.unit_registry(unit_code) not valid;

create index if not exists idx_entity_relationship_from on costing.entity_relationships(from_entity_id, relationship_code);
create index if not exists idx_entity_relationship_to on costing.entity_relationships(to_entity_id, relationship_code);
create index if not exists idx_cost_lines_model_scope on costing.cost_model_cost_lines(cost_model_id, cost_scope, category_code);
create index if not exists idx_formula_validation_key on costing.formula_validation_rules(formula_key, formula_version);

insert into costing.unit_registry
  (unit_code, display_name, symbol, dimension, base_unit_code, conversion_factor_to_base, is_dimensionless)
values
  ('month','calendar month','month','{"calendar":1}'::jsonb,'month',1,false),
  ('bag_50kg','50 kg cement bag','bag','{"mass":1}'::jsonb,'kg',50,false),
  ('point','service point','point','{"count":1}'::jsonb,'point',1,false),
  ('points','service points','points','{"count":1}'::jsonb,'point',1,false),
  ('worker','worker','worker','{"count":1}'::jsonb,'worker',1,false),
  ('unit','unit','unit','{"count":1}'::jsonb,'item',1,false),
  ('units','units','units','{"count":1}'::jsonb,'item',1,false),
  ('KES_per_m','KES per metre','KES/m','{"length":-1,"currency":1}'::jsonb,'KES_per_m',1,false),
  ('KES_per_m3','KES per cubic metre','KES/m³','{"length":-3,"currency":1}'::jsonb,'KES_per_m3',1,false),
  ('KES_per_kg','KES per kilogram','KES/kg','{"mass":-1,"currency":1}'::jsonb,'KES_per_kg',1,false),
  ('KES_per_trip','KES per trip','KES/trip','{"count":-1,"currency":1}'::jsonb,'KES_per_trip',1,false),
  ('KES_per_hr','KES per hour','KES/hr','{"time":-1,"currency":1}'::jsonb,'KES_per_hr',1,false),
  ('KES_per_bag_50kg','KES per 50 kg bag','KES/bag','{"mass":-1,"currency":1}'::jsonb,'KES_per_kg',0.02,false),
  ('m2_per_worker_hr','square metres per worker-hour','m²/worker-hr','{"length":2,"time":-1,"count":-1}'::jsonb,'m2_per_worker_hr',1,false),
  ('KES_per_day','KES per eight-hour workday','KES/day','{"time":-1,"currency":1}'::jsonb,'KES_per_hr',0.125,false)
on conflict (unit_code) do nothing;

insert into costing.entity_type_registry(entity_type_code,display_name,id_pattern,symbol_namespace,taxonomy_version,effective_from)
values
  ('PRJ','Project','WJ-PROJ-*','PROJECT','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('LOC','Location','WJ-LOC-*','LOCATION','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('BLD','Building','WJ-BLD-*','BUILDING','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('SYS','Building system','WJ-SYS-*','SYSTEM','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('ASM','Assembly','WJ-ASM-*','ASSEMBLY','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('MSR','Quantity measurement','WJ-MSR-*','MEASUREMENT','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('RES','Resource requirement','WJ-RES-*','RESOURCE','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('MAT','Material/product','WJ-MAT-*','MATERIAL','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('LAB','Labour trade/task','WJ-LAB-*','LABOUR','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('EQP','Equipment','WJ-EQP-*','EQUIPMENT','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('SUP','Supplier','WJ-SUP-*','SUPPLIER','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('QTE','Supplier quotation/price snapshot','WJ-QTE-*','QUOTE','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('LOG','Logistics movement','WJ-LOG-*','LOGISTICS','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('SCH','Schedule task','WJ-SCH-*','SCHEDULE','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('RSK','Risk event','WJ-RSK-*','RISK','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('TAX','Tax policy/tax line','WJ-TAX-*','TAX','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('FIN','Finance/cashflow item','WJ-FIN-*','FINANCE','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('SCN','Scenario','WJ-SCN-*','SCENARIO','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('FRM','Formula definition','WJ-FRM-*','FORMULA','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('RUN','Calculation run','WJ-RUN-*','RUN','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('DOC','Source document/evidence','WJ-DOC-*','DOCUMENT','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('APR','Approval record','WJ-APR-*','APPROVAL','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14'),
  ('CHG','Change event','WJ-CHG-*','CHANGE','WJ-ENTITY-TAXONOMY-1.1.0',date '2026-11-14')
on conflict (entity_type_code) do nothing;

insert into costing.relationship_type_registry(relationship_code,description)
values
  ('CONTAINS','Directed Wajenzi knowledge-graph relationship: contains.'),
  ('HAS_SYSTEM','Directed Wajenzi knowledge-graph relationship: has system.'),
  ('HAS_ASSEMBLY','Directed Wajenzi knowledge-graph relationship: has assembly.'),
  ('MEASURED_BY','Directed Wajenzi knowledge-graph relationship: measured by.'),
  ('REQUIRES_RESOURCE','Directed Wajenzi knowledge-graph relationship: requires resource.'),
  ('CALCULATED_BY','Directed Wajenzi knowledge-graph relationship: calculated by.'),
  ('DEPENDS_ON','Directed Wajenzi knowledge-graph relationship: depends on.'),
  ('PRICED_BY','Directed Wajenzi knowledge-graph relationship: priced by.'),
  ('SUPPLIED_BY','Directed Wajenzi knowledge-graph relationship: supplied by.'),
  ('DELIVERED_BY','Directed Wajenzi knowledge-graph relationship: delivered by.'),
  ('SCHEDULED_FOR','Directed Wajenzi knowledge-graph relationship: scheduled for.'),
  ('PRECEDES','Directed Wajenzi knowledge-graph relationship: precedes.'),
  ('FUNDED_BY','Directed Wajenzi knowledge-graph relationship: funded by.'),
  ('TAXED_BY','Directed Wajenzi knowledge-graph relationship: taxed by.'),
  ('MITIGATED_BY','Directed Wajenzi knowledge-graph relationship: mitigated by.'),
  ('EVIDENCED_BY','Directed Wajenzi knowledge-graph relationship: evidenced by.'),
  ('APPROVED_BY','Directed Wajenzi knowledge-graph relationship: approved by.'),
  ('SUPERSEDES','Directed Wajenzi knowledge-graph relationship: supersedes.'),
  ('CHANGED_BY','Directed Wajenzi knowledge-graph relationship: changed by.')
on conflict (relationship_code) do nothing;

insert into costing.cost_category_registry(category_code,parent_category_code,display_name,included_scope,taxonomy_version,effective_from)
values
  ('01',null,'Preliminaries and site establishment','[]'::jsonb,'WJ-COST-TAXONOMY-1.1.0',date '2026-11-14'),
  ('02',null,'Substructure','[]'::jsonb,'WJ-COST-TAXONOMY-1.1.0',date '2026-11-14'),
  ('03',null,'Structural frame','[]'::jsonb,'WJ-COST-TAXONOMY-1.1.0',date '2026-11-14'),
  ('04',null,'Walls and partitions','[]'::jsonb,'WJ-COST-TAXONOMY-1.1.0',date '2026-11-14'),
  ('05',null,'Roofing','[]'::jsonb,'WJ-COST-TAXONOMY-1.1.0',date '2026-11-14'),
  ('06',null,'Doors and windows','[]'::jsonb,'WJ-COST-TAXONOMY-1.1.0',date '2026-11-14'),
  ('07',null,'Electrical','[]'::jsonb,'WJ-COST-TAXONOMY-1.1.0',date '2026-11-14'),
  ('08',null,'Plumbing and drainage','[]'::jsonb,'WJ-COST-TAXONOMY-1.1.0',date '2026-11-14'),
  ('09',null,'Finishes','[]'::jsonb,'WJ-COST-TAXONOMY-1.1.0',date '2026-11-14'),
  ('10',null,'External works','[]'::jsonb,'WJ-COST-TAXONOMY-1.1.0',date '2026-11-14'),
  ('11',null,'Indirect and professional','[]'::jsonb,'WJ-COST-TAXONOMY-1.1.0',date '2026-11-14'),
  ('12',null,'Financing and capital','[]'::jsonb,'WJ-COST-TAXONOMY-1.1.0',date '2026-11-14'),
  ('13',null,'Risk and residual contingency','[]'::jsonb,'WJ-COST-TAXONOMY-1.1.0',date '2026-11-14'),
  ('14',null,'Taxes and statutory duties','[]'::jsonb,'WJ-COST-TAXONOMY-1.1.0',date '2026-11-14'),
  ('15',null,'Commercial pricing and service fees','[]'::jsonb,'WJ-COST-TAXONOMY-1.1.0',date '2026-11-14')
on conflict (category_code) do nothing;

insert into costing.formula_registry
  (formula_key,version,name,expression,input_schema,output_unit,rounding_policy,effective_from,domain,description,output_dimension,provenance,approval_status)
values
  ('QTY.ASSEMBLY_GROSS','1.1.1','qty assembly_gross','QTY_ASSEMBLY_GROSS = QTY_MEASURED × ASSEMBLY_RESOURCE_COEFFICIENT','[["QTY_MEASURED","unit-specific"],["ASSEMBLY_RESOURCE_COEFFICIENT","ratio"]]'::jsonb,'unit-specific','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','quantity','Measured and output units must be dimensionally compatible. Coefficient must be non-negative.','{"unitExpression":"unit-specific","symbol":"QTY_ASSEMBLY_GROSS"}'::jsonb,'{"source":"Wajenzi CSEE assembly definition; measurement evidence is project-specific","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('QTY.PROCUREMENT','1.1.1','qty procurement','QTY_PROCUREMENT = QTY_ASSEMBLY_GROSS × (1 + WASTE_RATE), only when waste is not already embedded in the assembly coefficient','[["QTY_ASSEMBLY_GROSS","unit-specific"],["WASTE_RATE","ratio"],["WASTE_INCLUDED_IN_COEFFICIENT","boolean"]]'::jsonb,'unit-specific','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','quantity','Waste rate must be between 0 and 1. If waste is embedded in the coefficient, a second non-zero waste rate is rejected.','{"unitExpression":"unit-specific","symbol":"QTY_PROCUREMENT"}'::jsonb,'{"source":"Wajenzi quantity policy","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('TAX.INPUT_NORMALIZE','1.1.1','tax input_normalize','For exclusive: NET=AMOUNT, TAX=NET×RATE, GROSS=NET+TAX. For inclusive: GROSS=AMOUNT, NET=GROSS/(1+RATE), TAX=GROSS−NET. Exempt/zero-rated: TAX=0.','[["AMOUNT","KES"],["TAX_STATUS","enum"],["TAX_RATE","ratio"],["INPUT_VAT_RECOVERABLE","boolean"]]'::jsonb,'KES','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','tax','Unknown tax status blocks a firm quote. Recoverable input VAT is excluded from cost basis; non-recoverable tax remains a cost. Tax status is stored per charge, not inferred globally.','{"unitExpression":"KES","symbol":"COST_BASIS"}'::jsonb,'{"source":"Configurable transaction tax policy; subject to qualified Kenyan tax review","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('PRICE.LOCATION_ADJUST','1.1.1','price location_adjust','P_SUPPLIER_LOCAL = P_SUPPLIER_BASE × LOCATION_INDEX_CURRENT / LOCATION_INDEX_BASE, only for a national/base price','[["P_SUPPLIER_BASE","KES/unit"],["LOCATION_INDEX_CURRENT","ratio"],["LOCATION_INDEX_BASE","ratio"],["PRICE_BASIS","enum"]]'::jsonb,'KES/unit','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','price','Local supplier quotes must not receive a second location adjustment. Index values must be positive and share a base period.','{"unitExpression":"KES/unit","symbol":"P_SUPPLIER_LOCAL"}'::jsonb,'{"source":"Verified Wajenzi location-index observations; source and period required","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('PRICE.LANDED','1.1.1','price landed','P_LANDED = TAX_NORMALIZED_SUPPLIER_COST + EXTERNAL_TRANSPORT + HANDLING + INSURANCE − DISCOUNT','[["P_SUPPLIER","KES/unit"],["EXTERNAL_TRANSPORT","KES/unit"],["HANDLING","KES/unit"],["INSURANCE","KES/unit"],["DISCOUNT","KES/unit"],["DELIVERY_BASIS","enum"]]'::jsonb,'KES/unit','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','price','Delivered-to-site quote has zero additional site-transport charge. Each charge has its own tax status and recoverability. Discount cannot reduce landed cost below zero.','{"unitExpression":"KES/unit","symbol":"P_LANDED"}'::jsonb,'{"source":"Supplier price snapshot and separately evidenced logistics/handling charges","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('PRICE.ESCALATED','1.1.1','price escalated','P_FUTURE = P_LANDED × (1 + ESCALATION_RATE_PER_PERIOD)^(MONTHS_TO_NEED / ESCALATION_PERIOD_MONTHS)','[["P_LANDED","KES/unit"],["ESCALATION_RATE_PER_PERIOD","ratio"],["MONTHS_TO_NEED","month"],["ESCALATION_PERIOD_MONTHS","month"]]'::jsonb,'KES/unit','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','price','Escalation rate must be greater than -1. No escalation is applied to a fixed-price committed quantity unless contract terms permit it.','{"unitExpression":"KES/unit","symbol":"P_FUTURE"}'::jsonb,'{"source":"Approved project escalation assumption or sourced index forecast","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('COST.MATERIAL','1.1.1','cost material','C_MATERIAL = QTY_PROCUREMENT × P_FUTURE','[["QTY_PROCUREMENT","unit-specific"],["P_FUTURE","KES/unit"]]'::jsonb,'KES','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','cost','Quantity and price units must be reciprocal-compatible. Committed quantities use contractual price exposure, not current market repricing.','{"unitExpression":"KES","symbol":"C_MATERIAL"}'::jsonb,'{"source":"Calculated from approved measurement, assembly and price evidence","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('LABOUR.HOURS','1.1.1','labour hours','H_WORKER = QTY_WORK / PRODUCTIVITY_PER_WORKER_HOUR','[["QTY_WORK","unit-specific"],["PRODUCTIVITY_PER_WORKER_HOUR","unit/worker_hr"]]'::jsonb,'worker_hr','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','labour','Productivity must be positive and dimensionally compatible.','{"unitExpression":"worker_hr","symbol":"H_WORKER"}'::jsonb,'{"source":"Local trade productivity observation or approved estimator assumption","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('COST.LABOUR','1.1.1','cost labour','C_LABOUR = H_WORKER × WAGE_PER_WORKER_HOUR','[["H_WORKER","worker_hr"],["WAGE_PER_WORKER_HOUR","KES/worker_hr"]]'::jsonb,'KES','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','labour','Wage basis and productivity basis must use the same worker-hour definition.','{"unitExpression":"KES","symbol":"C_LABOUR"}'::jsonb,'{"source":"Verified labour rate or clearly marked mock assumption","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('COST.EQUIPMENT','1.1.1','cost equipment','C_EQUIPMENT = OPERATING_HOURS × HOURLY_RATE + MOBILIZATION + FUEL','[["OPERATING_HOURS","hr"],["HOURLY_RATE","KES/hr"],["MOBILIZATION","KES"],["FUEL","KES"]]'::jsonb,'KES','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','equipment','Fuel or operator cost included in hire rate must not be added again.','{"unitExpression":"KES","symbol":"C_EQUIPMENT"}'::jsonb,'{"source":"Equipment hire/ownership schedule and operating log assumptions","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('COST.LOGISTICS','1.1.1','cost logistics','C_LOGISTICS = TRIPS × RATE_PER_TRIP + LOADING + OFFLOADING + WAITING','[["TRIPS","trip"],["RATE_PER_TRIP","KES/trip"],["LOADING","KES"],["OFFLOADING","KES"],["WAITING","KES"]]'::jsonb,'KES','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','logistics','Do not charge a transport leg already included in a delivered quote. Vehicle capacity and load units must be compatible.','{"unitExpression":"KES","symbol":"C_LOGISTICS"}'::jsonb,'{"source":"Vehicle capacity, route, load, supplier delivery basis and rate card","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('COST.DIRECT','1.1.1','cost direct','C_DIRECT = C_MATERIAL + C_LABOUR + C_EQUIPMENT + C_SUBCONTRACT + C_LOGISTICS','[["C_MATERIAL","KES"],["C_LABOUR","KES"],["C_EQUIPMENT","KES"],["C_SUBCONTRACT","KES"],["C_LOGISTICS","KES"]]'::jsonb,'KES','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','cost','Every line has one primary cost owner. No indirect cost or duplicated delivered transport is included.','{"unitExpression":"KES","symbol":"C_DIRECT"}'::jsonb,'{"source":"Cost lines allocated once to a primary WJ cost code","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('COST.INDIRECT','1.1.1','cost indirect','C_INDIRECT = Σ approved project administration + professional fees + statutory approvals + surveys + utilities + insurance','[["INDIRECT_COST_LINES","KES[]"]]'::jsonb,'KES','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','cost','Preliminaries already assigned to direct systems are excluded.','{"unitExpression":"KES","symbol":"C_INDIRECT"}'::jsonb,'{"source":"Project-specific professional and statutory cost evidence","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('COST.FINANCE','1.1.1','cost finance','C_FINANCE = Σ(period outstanding drawdown balance × period rate) + fees; drawdown balances are approved external inputs and do not depend on the final funding-gap result','[["OUTSTANDING_BALANCE_PERIOD","KES"],["PERIOD_RATE","ratio"],["FEES","KES"]]'::jsonb,'KES','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','finance','Rate period must match balance period. Do not include financing costs already embedded in supplier or contractor rates. Do not derive financing balances from a cashflow output that already includes financing cost; avoid circular finance calculations.','{"unitExpression":"KES","symbol":"C_FINANCE"}'::jsonb,'{"source":"Financing term sheet, drawdown and repayment schedule","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('RISK.EXPECTED','1.1.1','risk expected','C_EXPECTED_RISK = Σ(RESIDUAL_PROBABILITY × RESIDUAL_IMPACT), excluding risk transferred or already priced elsewhere','[["RESIDUAL_PROBABILITY","ratio"],["RESIDUAL_IMPACT","KES"],["INCLUDED_ELSEWHERE","boolean"]]'::jsonb,'KES','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','risk','Probability must be 0..1. Use residual probability/impact after mitigations where available. Exclude insured or contractually transferred risk already priced.','{"unitExpression":"KES","symbol":"C_EXPECTED_RISK"}'::jsonb,'{"source":"Approved project risk register and response status","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('CONTINGENCY.RESIDUAL','1.1.1','contingency residual','C_CONTINGENCY = ELIGIBLE_COST_BASE × RESIDUAL_CONTINGENCY_RATE','[["ELIGIBLE_COST_BASE","KES"],["RESIDUAL_CONTINGENCY_RATE","ratio"]]'::jsonb,'KES','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','risk','Contingency base is explicit and excludes identified expected-risk allowance, financing and customer margin unless policy says otherwise.','{"unitExpression":"KES","symbol":"C_CONTINGENCY"}'::jsonb,'{"source":"Approved project contingency policy","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('TAX.INPUT_COST','1.1.1','tax input_cost','C_NONRECOVERABLE_INPUT_TAX = Σ tax amount for input charges whose VAT is not recoverable','[["INPUT_TAX_LINES","tax-line[]"]]'::jsonb,'KES','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','tax','Recoverable input VAT is not a cost; tax cash timing may still affect funding.','{"unitExpression":"KES","symbol":"C_NONRECOVERABLE_INPUT_TAX"}'::jsonb,'{"source":"Project tax profile reviewed by qualified tax adviser","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('PROJECT.FORECAST','1.1.1','project forecast','C_FORECAST = C_DIRECT + C_INDIRECT + C_FINANCE + C_EXPECTED_RISK + C_CONTINGENCY + C_NONRECOVERABLE_INPUT_TAX + C_OTHER_PROJECT_TAX','[["C_DIRECT","KES"],["C_INDIRECT","KES"],["C_FINANCE","KES"],["C_EXPECTED_RISK","KES"],["C_CONTINGENCY","KES"],["C_NONRECOVERABLE_INPUT_TAX","KES"],["C_OTHER_PROJECT_TAX","KES"]]'::jsonb,'KES','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','project','Customer margin and customer output tax are excluded. All tax lines are classified and not already embedded in gross cost lines.','{"unitExpression":"KES","symbol":"C_FORECAST"}'::jsonb,'{"source":"Wajenzi calculation run and approved formula versions","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('PROJECT.UNIT_COST','1.1.1','project unit_cost','COST_PER_M2 = C_FORECAST / GROSS_FLOOR_AREA_M2','[["C_FORECAST","KES"],["GROSS_FLOOR_AREA_M2","m2"]]'::jsonb,'KES_per_m2','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','project','Floor area must be greater than zero. Report the area convention and drawing revision.','{"unitExpression":"KES_per_m2","symbol":"COST_PER_M2"}'::jsonb,'{"source":"Wajenzi project measurement registry; denominator must be identified as gross floor area","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('COMMERCIAL.CUSTOMER_PRICE_BASE','1.1.1','commercial customer_price_base','P_CUSTOMER_PRETAX = (pricing_mode = markup ? C_FORECAST × (1 + rate) : C_FORECAST / (1 − rate)) + SERVICE_FEES','[["C_FORECAST","KES"],["PRICING_MODE","enum"],["PRICING_RATE","ratio"],["SERVICE_FEES","KES"]]'::jsonb,'KES','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','commercial','Exactly one pricing mode is selected per quote. Gross margin must be below 100%. Markup and gross margin are not interchangeable. Commercial margin and service fees remain outside forecast delivery cost.','{"unitExpression":"KES","symbol":"P_CUSTOMER_PRETAX"}'::jsonb,'{"source":"Wajenzi commercial pricing policy; approved markup or gross-margin mode is selected per quote","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('TAX.CUSTOMER_OUTPUT','1.1.1','tax customer_output','Apply customer tax to the commercial taxable base; inclusive tax is extracted from the gross price and never added a second time.','[["P_CUSTOMER_PRETAX","KES"],["CUSTOMER_TAX_STATUS","enum"],["CUSTOMER_TAX_RATE","ratio"]]'::jsonb,'KES','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','tax','Unknown status blocks final customer quote. Customer output tax is not included in forecast delivery cost.','{"unitExpression":"KES","symbol":"P_CUSTOMER_GROSS"}'::jsonb,'{"source":"Configured customer transaction tax policy; qualified review required","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('SCHEDULE.CASHFLOW','1.1.1','schedule cashflow','CUMULATIVE_CASH_BALANCE[t] = OPENING_CASH + Σ(INFLOW[1..t] − OUTFLOW[1..t]); periods must be chronological','[["OPENING_CASH","KES"],["INFLOW","KES[]"],["OUTFLOW","KES[]"],["PERIOD_ORDER","date[]"]]'::jsonb,'KES[]','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','schedule','Cashflow periods are ordered and non-overlapping. Funding requirement is peak deficit, not total project cost. Cashflow is a funding schedule output and does not feed financing interest unless an independently approved drawdown schedule is supplied.','{"unitExpression":"KES[]","symbol":"CUMULATIVE_CASH_BALANCE"}'::jsonb,'{"source":"Approved project schedule, payment milestones and cashflow assumptions","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('FUNDING.PEAK_GAP','1.1.1','funding peak_gap','FUNDING_REQUIREMENT = max(0, −min_t(CUMULATIVE_CASH_BALANCE[t]))','[["CUMULATIVE_CASH_BALANCE","KES[]"]]'::jsonb,'KES','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','finance','Funding requirement is peak cash deficit, not total forecast cost. Opening cash and all inflows must be explicit.','{"unitExpression":"KES","symbol":"FUNDING_REQUIREMENT"}'::jsonb,'{"source":"Wajenzi cashflow model; chronological project inflows and outflows","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review'),
  ('RISK.MONTE_CARLO','1.1.1','risk monte_carlo','Seeded simulation of cost drivers and residual risk events; report empirical P50/P80/P90','[["BASE_COST_COMPONENTS","KES[]"],["DISTRIBUTIONS","distribution[]"],["RISK_EVENTS","risk[]"],["RANDOM_SEED","integer"],["ITERATIONS","integer"]]'::jsonb,'KES','money_2dp; quantity_6dp; no intermediate rounding',date '2026-11-14','scenario','Persist seed, iteration count, model version and assumptions. Correlations must be declared; v1.1 independent distributions are an explicit limitation.','{"unitExpression":"KES","symbol":"P50_P80_P90"}'::jsonb,'{"source":"Versioned Wajenzi scenario model; distributions approved per project","registryId":"WJ-COST-FORMULAS","registryVersion":"1.1.1"}'::jsonb,'in_review')
on conflict (formula_key,version) do nothing;

insert into costing.formula_dependencies
  (formula_key,formula_version,depends_on_formula_key,depends_on_formula_version,input_name)
values
  ('QTY.PROCUREMENT','1.1.1','QTY.ASSEMBLY_GROSS','1.1.1','QTY.ASSEMBLY_GROSS'),
  ('PRICE.LANDED','1.1.1','TAX.INPUT_NORMALIZE','1.1.1','TAX.INPUT_NORMALIZE'),
  ('PRICE.LANDED','1.1.1','PRICE.LOCATION_ADJUST','1.1.1','PRICE.LOCATION_ADJUST'),
  ('PRICE.ESCALATED','1.1.1','PRICE.LANDED','1.1.1','PRICE.LANDED'),
  ('COST.MATERIAL','1.1.1','QTY.PROCUREMENT','1.1.1','QTY.PROCUREMENT'),
  ('COST.MATERIAL','1.1.1','PRICE.ESCALATED','1.1.1','PRICE.ESCALATED'),
  ('COST.LABOUR','1.1.1','LABOUR.HOURS','1.1.1','LABOUR.HOURS'),
  ('COST.DIRECT','1.1.1','COST.MATERIAL','1.1.1','COST.MATERIAL'),
  ('COST.DIRECT','1.1.1','COST.LABOUR','1.1.1','COST.LABOUR'),
  ('COST.DIRECT','1.1.1','COST.EQUIPMENT','1.1.1','COST.EQUIPMENT'),
  ('COST.DIRECT','1.1.1','COST.LOGISTICS','1.1.1','COST.LOGISTICS'),
  ('CONTINGENCY.RESIDUAL','1.1.1','COST.DIRECT','1.1.1','COST.DIRECT'),
  ('CONTINGENCY.RESIDUAL','1.1.1','COST.INDIRECT','1.1.1','COST.INDIRECT'),
  ('TAX.INPUT_COST','1.1.1','TAX.INPUT_NORMALIZE','1.1.1','TAX.INPUT_NORMALIZE'),
  ('PROJECT.FORECAST','1.1.1','COST.DIRECT','1.1.1','COST.DIRECT'),
  ('PROJECT.FORECAST','1.1.1','COST.INDIRECT','1.1.1','COST.INDIRECT'),
  ('PROJECT.FORECAST','1.1.1','COST.FINANCE','1.1.1','COST.FINANCE'),
  ('PROJECT.FORECAST','1.1.1','RISK.EXPECTED','1.1.1','RISK.EXPECTED'),
  ('PROJECT.FORECAST','1.1.1','CONTINGENCY.RESIDUAL','1.1.1','CONTINGENCY.RESIDUAL'),
  ('PROJECT.FORECAST','1.1.1','TAX.INPUT_COST','1.1.1','TAX.INPUT_COST'),
  ('PROJECT.UNIT_COST','1.1.1','PROJECT.FORECAST','1.1.1','PROJECT.FORECAST'),
  ('COMMERCIAL.CUSTOMER_PRICE_BASE','1.1.1','PROJECT.FORECAST','1.1.1','PROJECT.FORECAST'),
  ('TAX.CUSTOMER_OUTPUT','1.1.1','COMMERCIAL.CUSTOMER_PRICE_BASE','1.1.1','COMMERCIAL.CUSTOMER_PRICE_BASE'),
  ('FUNDING.PEAK_GAP','1.1.1','SCHEDULE.CASHFLOW','1.1.1','SCHEDULE.CASHFLOW'),
  ('RISK.MONTE_CARLO','1.1.1','PROJECT.FORECAST','1.1.1','PROJECT.FORECAST')
on conflict do nothing;

insert into costing.formula_symbol_registry
  (symbol_code,qualified_symbol,value_type,unit_expression,description,provenance,effective_from)
values
  ('QTY_MEASURED','WJ.COSTING.QTY_MEASURED','number','unit-specific','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('ASSEMBLY_RESOURCE_COEFFICIENT','WJ.COSTING.ASSEMBLY_RESOURCE_COEFFICIENT','number','ratio','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('QTY_ASSEMBLY_GROSS','WJ.COSTING.QTY_ASSEMBLY_GROSS','number','unit-specific','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('WASTE_RATE','WJ.COSTING.WASTE_RATE','number','ratio','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('WASTE_INCLUDED_IN_COEFFICIENT','WJ.COSTING.WASTE_INCLUDED_IN_COEFFICIENT','boolean','boolean','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('QTY_PROCUREMENT','WJ.COSTING.QTY_PROCUREMENT','number','unit-specific','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('AMOUNT','WJ.COSTING.AMOUNT','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('TAX_STATUS','WJ.COSTING.TAX_STATUS','string','enum','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('TAX_RATE','WJ.COSTING.TAX_RATE','number','ratio','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('INPUT_VAT_RECOVERABLE','WJ.COSTING.INPUT_VAT_RECOVERABLE','boolean','boolean','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('COST_BASIS','WJ.COSTING.COST_BASIS','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('P_SUPPLIER_BASE','WJ.COSTING.P_SUPPLIER_BASE','number','KES/unit','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('LOCATION_INDEX_CURRENT','WJ.COSTING.LOCATION_INDEX_CURRENT','number','ratio','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('LOCATION_INDEX_BASE','WJ.COSTING.LOCATION_INDEX_BASE','number','ratio','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('PRICE_BASIS','WJ.COSTING.PRICE_BASIS','string','enum','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('P_SUPPLIER_LOCAL','WJ.COSTING.P_SUPPLIER_LOCAL','number','KES/unit','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('P_SUPPLIER','WJ.COSTING.P_SUPPLIER','number','KES/unit','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('EXTERNAL_TRANSPORT','WJ.COSTING.EXTERNAL_TRANSPORT','number','KES/unit','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('HANDLING','WJ.COSTING.HANDLING','number','KES/unit','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('INSURANCE','WJ.COSTING.INSURANCE','number','KES/unit','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('DISCOUNT','WJ.COSTING.DISCOUNT','number','KES/unit','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('DELIVERY_BASIS','WJ.COSTING.DELIVERY_BASIS','string','enum','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('P_LANDED','WJ.COSTING.P_LANDED','number','KES/unit','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('ESCALATION_RATE_PER_PERIOD','WJ.COSTING.ESCALATION_RATE_PER_PERIOD','number','ratio','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('MONTHS_TO_NEED','WJ.COSTING.MONTHS_TO_NEED','number','month','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('ESCALATION_PERIOD_MONTHS','WJ.COSTING.ESCALATION_PERIOD_MONTHS','number','month','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('P_FUTURE','WJ.COSTING.P_FUTURE','number','KES/unit','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('C_MATERIAL','WJ.COSTING.C_MATERIAL','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('QTY_WORK','WJ.COSTING.QTY_WORK','number','unit-specific','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('PRODUCTIVITY_PER_WORKER_HOUR','WJ.COSTING.PRODUCTIVITY_PER_WORKER_HOUR','number','unit/worker_hr','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('H_WORKER','WJ.COSTING.H_WORKER','number','worker_hr','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('WAGE_PER_WORKER_HOUR','WJ.COSTING.WAGE_PER_WORKER_HOUR','number','KES/worker_hr','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('C_LABOUR','WJ.COSTING.C_LABOUR','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('OPERATING_HOURS','WJ.COSTING.OPERATING_HOURS','number','hr','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('HOURLY_RATE','WJ.COSTING.HOURLY_RATE','number','KES/hr','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('MOBILIZATION','WJ.COSTING.MOBILIZATION','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('FUEL','WJ.COSTING.FUEL','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('C_EQUIPMENT','WJ.COSTING.C_EQUIPMENT','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('TRIPS','WJ.COSTING.TRIPS','number','trip','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('RATE_PER_TRIP','WJ.COSTING.RATE_PER_TRIP','number','KES/trip','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('LOADING','WJ.COSTING.LOADING','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('OFFLOADING','WJ.COSTING.OFFLOADING','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('WAITING','WJ.COSTING.WAITING','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('C_LOGISTICS','WJ.COSTING.C_LOGISTICS','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('C_SUBCONTRACT','WJ.COSTING.C_SUBCONTRACT','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('C_DIRECT','WJ.COSTING.C_DIRECT','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('INDIRECT_COST_LINES','WJ.COSTING.INDIRECT_COST_LINES','json','KES[]','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('C_INDIRECT','WJ.COSTING.C_INDIRECT','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('OUTSTANDING_BALANCE_PERIOD','WJ.COSTING.OUTSTANDING_BALANCE_PERIOD','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('PERIOD_RATE','WJ.COSTING.PERIOD_RATE','number','ratio','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('FEES','WJ.COSTING.FEES','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('C_FINANCE','WJ.COSTING.C_FINANCE','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('RESIDUAL_PROBABILITY','WJ.COSTING.RESIDUAL_PROBABILITY','number','ratio','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('RESIDUAL_IMPACT','WJ.COSTING.RESIDUAL_IMPACT','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('INCLUDED_ELSEWHERE','WJ.COSTING.INCLUDED_ELSEWHERE','boolean','boolean','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('C_EXPECTED_RISK','WJ.COSTING.C_EXPECTED_RISK','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('ELIGIBLE_COST_BASE','WJ.COSTING.ELIGIBLE_COST_BASE','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('RESIDUAL_CONTINGENCY_RATE','WJ.COSTING.RESIDUAL_CONTINGENCY_RATE','number','ratio','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('C_CONTINGENCY','WJ.COSTING.C_CONTINGENCY','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('INPUT_TAX_LINES','WJ.COSTING.INPUT_TAX_LINES','json','tax-line[]','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('C_NONRECOVERABLE_INPUT_TAX','WJ.COSTING.C_NONRECOVERABLE_INPUT_TAX','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('C_OTHER_PROJECT_TAX','WJ.COSTING.C_OTHER_PROJECT_TAX','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('C_FORECAST','WJ.COSTING.C_FORECAST','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('GROSS_FLOOR_AREA_M2','WJ.COSTING.GROSS_FLOOR_AREA_M2','number','m2','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('COST_PER_M2','WJ.COSTING.COST_PER_M2','number','KES_per_m2','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('PRICING_MODE','WJ.COSTING.PRICING_MODE','string','enum','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('PRICING_RATE','WJ.COSTING.PRICING_RATE','number','ratio','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('SERVICE_FEES','WJ.COSTING.SERVICE_FEES','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('P_CUSTOMER_PRETAX','WJ.COSTING.P_CUSTOMER_PRETAX','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('CUSTOMER_TAX_STATUS','WJ.COSTING.CUSTOMER_TAX_STATUS','string','enum','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('CUSTOMER_TAX_RATE','WJ.COSTING.CUSTOMER_TAX_RATE','number','ratio','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('P_CUSTOMER_GROSS','WJ.COSTING.P_CUSTOMER_GROSS','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('OPENING_CASH','WJ.COSTING.OPENING_CASH','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('INFLOW','WJ.COSTING.INFLOW','json','KES[]','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('OUTFLOW','WJ.COSTING.OUTFLOW','json','KES[]','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('PERIOD_ORDER','WJ.COSTING.PERIOD_ORDER','json','date[]','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('CUMULATIVE_CASH_BALANCE','WJ.COSTING.CUMULATIVE_CASH_BALANCE','json','KES[]','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('FUNDING_REQUIREMENT','WJ.COSTING.FUNDING_REQUIREMENT','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('BASE_COST_COMPONENTS','WJ.COSTING.BASE_COST_COMPONENTS','json','KES[]','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('DISTRIBUTIONS','WJ.COSTING.DISTRIBUTIONS','json','distribution[]','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('RISK_EVENTS','WJ.COSTING.RISK_EVENTS','json','risk[]','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('RANDOM_SEED','WJ.COSTING.RANDOM_SEED','integer','integer','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('ITERATIONS','WJ.COSTING.ITERATIONS','integer','integer','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('P50_P80_P90','WJ.COSTING.P50_P80_P90','number','KES','Typed formula input/output symbol used by Wajenzi Cost Formula Registry v1.1.1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14')
on conflict (symbol_code) do nothing;

insert into costing.formula_validation_rules
  (formula_key,formula_version,rule_code,severity,rule_expression,message,provenance,effective_from)
values
  ('QTY.ASSEMBLY_GROSS','1.1.1','QTY_ASSEMBLY_GROSS_01','warning','Registry validation statement','Measured and output units must be dimensionally compatible.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('QTY.ASSEMBLY_GROSS','1.1.1','QTY_ASSEMBLY_GROSS_02','warning','Registry validation statement','Coefficient must be non-negative.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('QTY.PROCUREMENT','1.1.1','QTY_PROCUREMENT_01','warning','Registry validation statement','Waste rate must be between 0 and 1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('QTY.PROCUREMENT','1.1.1','QTY_PROCUREMENT_02','blocking','Registry validation statement','If waste is embedded in the coefficient, a second non-zero waste rate is rejected.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('TAX.INPUT_NORMALIZE','1.1.1','TAX_INPUT_NORMALIZE_01','blocking','Registry validation statement','Unknown tax status blocks a firm quote.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('TAX.INPUT_NORMALIZE','1.1.1','TAX_INPUT_NORMALIZE_02','warning','Registry validation statement','Recoverable input VAT is excluded from cost basis; non-recoverable tax remains a cost.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('TAX.INPUT_NORMALIZE','1.1.1','TAX_INPUT_NORMALIZE_03','warning','Registry validation statement','Tax status is stored per charge, not inferred globally.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('PRICE.LOCATION_ADJUST','1.1.1','PRICE_LOCATION_ADJUST_01','blocking','Registry validation statement','Local supplier quotes must not receive a second location adjustment.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('PRICE.LOCATION_ADJUST','1.1.1','PRICE_LOCATION_ADJUST_02','warning','Registry validation statement','Index values must be positive and share a base period.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('PRICE.LANDED','1.1.1','PRICE_LANDED_01','warning','Registry validation statement','Delivered-to-site quote has zero additional site-transport charge.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('PRICE.LANDED','1.1.1','PRICE_LANDED_02','warning','Registry validation statement','Each charge has its own tax status and recoverability.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('PRICE.LANDED','1.1.1','PRICE_LANDED_03','blocking','Registry validation statement','Discount cannot reduce landed cost below zero.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('PRICE.ESCALATED','1.1.1','PRICE_ESCALATED_01','warning','Registry validation statement','Escalation rate must be greater than -1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('PRICE.ESCALATED','1.1.1','PRICE_ESCALATED_02','warning','Registry validation statement','No escalation is applied to a fixed-price committed quantity unless contract terms permit it.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('COST.MATERIAL','1.1.1','COST_MATERIAL_01','warning','Registry validation statement','Quantity and price units must be reciprocal-compatible.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('COST.MATERIAL','1.1.1','COST_MATERIAL_02','warning','Registry validation statement','Committed quantities use contractual price exposure, not current market repricing.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('LABOUR.HOURS','1.1.1','LABOUR_HOURS_01','warning','Registry validation statement','Productivity must be positive and dimensionally compatible.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('COST.LABOUR','1.1.1','COST_LABOUR_01','warning','Registry validation statement','Wage basis and productivity basis must use the same worker-hour definition.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('COST.EQUIPMENT','1.1.1','COST_EQUIPMENT_01','blocking','Registry validation statement','Fuel or operator cost included in hire rate must not be added again.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('COST.LOGISTICS','1.1.1','COST_LOGISTICS_01','warning','Registry validation statement','Do not charge a transport leg already included in a delivered quote.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('COST.LOGISTICS','1.1.1','COST_LOGISTICS_02','warning','Registry validation statement','Vehicle capacity and load units must be compatible.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('COST.DIRECT','1.1.1','COST_DIRECT_01','warning','Registry validation statement','Every line has one primary cost owner.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('COST.DIRECT','1.1.1','COST_DIRECT_02','blocking','Registry validation statement','No indirect cost or duplicated delivered transport is included.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('COST.INDIRECT','1.1.1','COST_INDIRECT_01','warning','Registry validation statement','Preliminaries already assigned to direct systems are excluded.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('COST.FINANCE','1.1.1','COST_FINANCE_01','warning','Registry validation statement','Rate period must match balance period.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('COST.FINANCE','1.1.1','COST_FINANCE_02','warning','Registry validation statement','Do not include financing costs already embedded in supplier or contractor rates.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('COST.FINANCE','1.1.1','COST_FINANCE_03','warning','Registry validation statement','Do not derive financing balances from a cashflow output that already includes financing cost; avoid circular finance calculations.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('RISK.EXPECTED','1.1.1','RISK_EXPECTED_01','warning','Registry validation statement','Probability must be 0..1.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('RISK.EXPECTED','1.1.1','RISK_EXPECTED_02','warning','Registry validation statement','Use residual probability/impact after mitigations where available.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('RISK.EXPECTED','1.1.1','RISK_EXPECTED_03','warning','Registry validation statement','Exclude insured or contractually transferred risk already priced.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('CONTINGENCY.RESIDUAL','1.1.1','CONTINGENCY_RESIDUAL_01','warning','Registry validation statement','Contingency base is explicit and excludes identified expected-risk allowance, financing and customer margin unless policy says otherwise.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('TAX.INPUT_COST','1.1.1','TAX_INPUT_COST_01','warning','Registry validation statement','Recoverable input VAT is not a cost; tax cash timing may still affect funding.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('PROJECT.FORECAST','1.1.1','PROJECT_FORECAST_01','warning','Registry validation statement','Customer margin and customer output tax are excluded.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('PROJECT.FORECAST','1.1.1','PROJECT_FORECAST_02','warning','Registry validation statement','All tax lines are classified and not already embedded in gross cost lines.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('PROJECT.UNIT_COST','1.1.1','PROJECT_UNIT_COST_01','warning','Registry validation statement','Floor area must be greater than zero.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('PROJECT.UNIT_COST','1.1.1','PROJECT_UNIT_COST_02','warning','Registry validation statement','Report the area convention and drawing revision.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('COMMERCIAL.CUSTOMER_PRICE_BASE','1.1.1','COMMERCIAL_CUSTOMER_PRICE_BASE_01','warning','Registry validation statement','Exactly one pricing mode is selected per quote.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('COMMERCIAL.CUSTOMER_PRICE_BASE','1.1.1','COMMERCIAL_CUSTOMER_PRICE_BASE_02','warning','Registry validation statement','Gross margin must be below 100%.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('COMMERCIAL.CUSTOMER_PRICE_BASE','1.1.1','COMMERCIAL_CUSTOMER_PRICE_BASE_03','warning','Registry validation statement','Markup and gross margin are not interchangeable.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('COMMERCIAL.CUSTOMER_PRICE_BASE','1.1.1','COMMERCIAL_CUSTOMER_PRICE_BASE_04','warning','Registry validation statement','Commercial margin and service fees remain outside forecast delivery cost.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('TAX.CUSTOMER_OUTPUT','1.1.1','TAX_CUSTOMER_OUTPUT_01','blocking','Registry validation statement','Unknown status blocks final customer quote.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('TAX.CUSTOMER_OUTPUT','1.1.1','TAX_CUSTOMER_OUTPUT_02','warning','Registry validation statement','Customer output tax is not included in forecast delivery cost.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('SCHEDULE.CASHFLOW','1.1.1','SCHEDULE_CASHFLOW_01','warning','Registry validation statement','Cashflow periods are ordered and non-overlapping.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('SCHEDULE.CASHFLOW','1.1.1','SCHEDULE_CASHFLOW_02','warning','Registry validation statement','Funding requirement is peak deficit, not total project cost.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('SCHEDULE.CASHFLOW','1.1.1','SCHEDULE_CASHFLOW_03','warning','Registry validation statement','Cashflow is a funding schedule output and does not feed financing interest unless an independently approved drawdown schedule is supplied.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('FUNDING.PEAK_GAP','1.1.1','FUNDING_PEAK_GAP_01','warning','Registry validation statement','Funding requirement is peak cash deficit, not total forecast cost.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('FUNDING.PEAK_GAP','1.1.1','FUNDING_PEAK_GAP_02','warning','Registry validation statement','Opening cash and all inflows must be explicit.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('RISK.MONTE_CARLO','1.1.1','RISK_MONTE_CARLO_01','warning','Registry validation statement','Persist seed, iteration count, model version and assumptions.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14'),
  ('RISK.MONTE_CARLO','1.1.1','RISK_MONTE_CARLO_02','warning','Registry validation statement','Correlations must be declared; v1.1 independent distributions are an explicit limitation.','WJ-COST-FORMULAS-1.1.1',date '2026-11-14')
on conflict (rule_code) do nothing;


-- Prevent cycles in versioned formula dependencies.
create or replace function costing.reject_formula_dependency_cycle()
returns trigger language plpgsql as $$
declare cycle_found boolean;
begin
  with recursive reach(formula_key, formula_version) as (
    select new.depends_on_formula_key, new.depends_on_formula_version
    union
    select d.depends_on_formula_key, d.depends_on_formula_version
    from costing.formula_dependencies d
    join reach r on d.formula_key = r.formula_key and d.formula_version = r.formula_version
    where not (d.formula_key = new.formula_key and d.formula_version = new.formula_version)
  )
  select exists(select 1 from reach where formula_key = new.formula_key and formula_version = new.formula_version)
  into cycle_found;
  if cycle_found then raise exception 'formula dependency cycle detected'; end if;
  return new;
end;
$$;
drop trigger if exists trg_formula_dependency_cycle on costing.formula_dependencies;
create trigger trg_formula_dependency_cycle
before insert or update on costing.formula_dependencies
for each row execute function costing.reject_formula_dependency_cycle();

-- Prevent cycles in schedule task dependencies.
create or replace function costing.reject_schedule_dependency_cycle()
returns trigger language plpgsql as $$
declare cycle_found boolean;
begin
  with recursive reach(task_id) as (
    select new.successor_task_id
    union
    select d.successor_task_id
    from costing.schedule_task_dependencies d
    join reach r on d.predecessor_task_id = r.task_id
    where not (d.predecessor_task_id = new.predecessor_task_id and d.successor_task_id = new.successor_task_id)
  )
  select exists(select 1 from reach where task_id = new.predecessor_task_id)
  into cycle_found;
  if cycle_found then raise exception 'schedule dependency cycle detected'; end if;
  return new;
end;
$$;
drop trigger if exists trg_schedule_dependency_cycle on costing.schedule_task_dependencies;
create trigger trg_schedule_dependency_cycle
before insert or update on costing.schedule_task_dependencies
for each row execute function costing.reject_schedule_dependency_cycle();

-- Generic append-only protection: corrections are new versions/rows, never in-place edits.
create or replace function costing.reject_append_only_mutation()
returns trigger language plpgsql as $$
begin
  raise exception '% is append-only; create a new version or row', tg_table_schema || '.' || tg_table_name;
end;
$$;

drop trigger if exists trg_formula_registry_append_only on costing.formula_registry;
create trigger trg_formula_registry_append_only
before update or delete on costing.formula_registry
for each row execute function costing.reject_append_only_mutation();

drop trigger if exists trg_formula_dependencies_append_only on costing.formula_dependencies;
create trigger trg_formula_dependencies_append_only
before update or delete on costing.formula_dependencies
for each row execute function costing.reject_append_only_mutation();

drop trigger if exists trg_formula_validation_rules_append_only on costing.formula_validation_rules;
create trigger trg_formula_validation_rules_append_only
before update or delete on costing.formula_validation_rules
for each row execute function costing.reject_append_only_mutation();

drop trigger if exists trg_formula_symbol_registry_append_only on costing.formula_symbol_registry;
create trigger trg_formula_symbol_registry_append_only
before update or delete on costing.formula_symbol_registry
for each row execute function costing.reject_append_only_mutation();

drop trigger if exists trg_unit_registry_append_only on costing.unit_registry;
create trigger trg_unit_registry_append_only
before update or delete on costing.unit_registry
for each row execute function costing.reject_append_only_mutation();

drop trigger if exists trg_supplier_price_snapshots_append_only on costing.supplier_price_snapshots;
create trigger trg_supplier_price_snapshots_append_only
before update or delete on costing.supplier_price_snapshots
for each row execute function costing.reject_append_only_mutation();

drop trigger if exists trg_calculation_run_events_append_only on costing.calculation_run_events;
create trigger trg_calculation_run_events_append_only
before update or delete on costing.calculation_run_events
for each row execute function costing.reject_append_only_mutation();

drop trigger if exists trg_cost_approvals_append_only on costing.cost_approvals;
create trigger trg_cost_approvals_append_only
before update or delete on costing.cost_approvals
for each row execute function costing.reject_append_only_mutation();

drop trigger if exists trg_tax_policies_append_only on costing.tax_policies;
create trigger trg_tax_policies_append_only
before update or delete on costing.tax_policies
for each row execute function costing.reject_append_only_mutation();

drop trigger if exists trg_entity_relationships_append_only on costing.entity_relationships;
create trigger trg_entity_relationships_append_only
before update or delete on costing.entity_relationships
for each row execute function costing.reject_append_only_mutation();


-- Completed snapshots cannot be reopened or have their evidence changed.
create or replace function costing.enforce_calculation_run_state()
returns trigger language plpgsql as $$
begin
  if old.status = 'approved' and new.status <> 'approved' then
    raise exception 'approved calculation run status is immutable';
  end if;
  if old.status = 'completed' and new.status not in ('completed','approved','superseded') then
    raise exception 'completed calculation run cannot return to draft or failed';
  end if;
  if new.status = 'approved' and (new.approved_by is null or new.approved_at is null) then
    raise exception 'approval actor and timestamp are required';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_calculation_run_state on costing.calculation_runs;
create trigger trg_calculation_run_state
before update on costing.calculation_runs
for each row execute function costing.enforce_calculation_run_state();

alter table costing.entity_type_registry enable row level security;
alter table costing.relationship_type_registry enable row level security;
alter table costing.entity_relationships enable row level security;
alter table costing.cost_category_registry enable row level security;
alter table costing.formula_symbol_registry enable row level security;
alter table costing.formula_validation_rules enable row level security;
alter table costing.cost_model_cost_lines enable row level security;

revoke all on costing.entity_type_registry, costing.relationship_type_registry,
  costing.entity_relationships, costing.cost_category_registry, costing.formula_symbol_registry,
  costing.formula_validation_rules, costing.cost_model_cost_lines
from public, anon, authenticated;
grant all privileges on costing.entity_type_registry, costing.relationship_type_registry,
  costing.entity_relationships, costing.cost_category_registry, costing.formula_symbol_registry,
  costing.formula_validation_rules, costing.cost_model_cost_lines
to service_role;

comment on table costing.formula_symbol_registry is 'Canonical typed symbols; one producer per registry version, many consumers allowed.';
comment on table costing.cost_model_cost_lines is 'Explicit non-resource cost lines for indirects, finance, taxes and service fees; cost_owner_key prevents duplicate ownership.';
comment on table costing.entity_relationships is 'Typed, temporal graph edges between canonical Wajenzi entity instances.';
comment on table costing.formula_validation_rules is 'Versioned formula validation rules seeded from the approved registry artifact.';
