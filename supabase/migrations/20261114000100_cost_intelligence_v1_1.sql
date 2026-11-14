-- Wajenzi Dynamic Total Project Cost Intelligence Engine v1.1.0
-- Additive, review-only migration. Do not apply to production without approval.
-- Assumes the v1.0 costing schema and base tables already exist.

create table if not exists costing.unit_registry (
  unit_code text primary key,
  display_name text not null,
  symbol text not null,
  dimension jsonb not null,
  base_unit_code text not null,
  conversion_factor_to_base numeric(24,12) not null check (conversion_factor_to_base > 0),
  is_dimensionless boolean not null default false,
  provenance text not null default 'Wajenzi controlled unit registry',
  effective_from date not null default date '2026-11-14',
  effective_to date,
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists costing.entity_registry (
  id uuid primary key default gen_random_uuid(),
  entity_code text not null unique,
  entity_type_code text not null,
  display_name text not null,
  canonical_ref text,
  status text not null default 'active' check (status in ('active','deprecated','merged','archived')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists costing.entity_property_registry (
  id uuid primary key default gen_random_uuid(),
  property_code text not null unique,
  symbol_code text not null unique,
  qualified_symbol text not null unique,
  entity_type_code text not null,
  unit_code text references costing.unit_registry(unit_code),
  dimension jsonb not null,
  value_type text not null check (value_type in ('number','integer','boolean','string','date','enum','json')),
  description text not null,
  provenance text not null,
  effective_from date not null,
  effective_to date,
  check (effective_to is null or effective_to >= effective_from)
);

alter table costing.formula_registry
  add column if not exists domain text not null default 'cost',
  add column if not exists description text,
  add column if not exists output_dimension jsonb not null default '{}',
  add column if not exists provenance jsonb not null default '{}',
  add column if not exists approval_status text not null default 'draft'
    check (approval_status in ('draft','in_review','approved','superseded','retired')),
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists approved_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

create table if not exists costing.formula_dependencies (
  id uuid primary key default gen_random_uuid(),
  formula_key text not null,
  formula_version text not null,
  depends_on_formula_key text not null,
  depends_on_formula_version text not null,
  input_name text not null,
  dependency_type text not null default 'calculation'
    check (dependency_type in ('calculation','validation','scenario','aggregation')),
  created_at timestamptz not null default now(),
  foreign key (formula_key, formula_version)
    references costing.formula_registry(formula_key, version) on delete restrict,
  foreign key (depends_on_formula_key, depends_on_formula_version)
    references costing.formula_registry(formula_key, version) on delete restrict,
  unique (formula_key, formula_version, depends_on_formula_key, depends_on_formula_version, input_name),
  check (formula_key <> depends_on_formula_key or formula_version <> depends_on_formula_version)
);

create table if not exists costing.tax_policies (
  id uuid primary key default gen_random_uuid(),
  tax_code text not null,
  jurisdiction text not null,
  applies_to text not null,
  tax_status text not null check (tax_status in ('exclusive','inclusive','exempt','zero_rated','unknown')),
  tax_rate numeric(9,6) not null default 0 check (tax_rate between 0 and 1),
  input_vat_recoverable boolean not null default false,
  effective_from date not null,
  effective_to date,
  source_name text,
  source_ref text,
  review_status text not null default 'unreviewed'
    check (review_status in ('unreviewed','reviewed','approved','superseded')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  check (effective_to is null or effective_to >= effective_from),
  unique (tax_code, jurisdiction, applies_to, effective_from)
);

create table if not exists costing.procurement_commitments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references costing.projects(id) on delete cascade,
  cost_model_id uuid not null references costing.cost_models(id) on delete cascade,
  resource_requirement_id uuid references costing.resource_requirements(id) on delete set null,
  product_ref text not null,
  supplier_ref text,
  contract_ref text,
  unit_code text not null references costing.unit_registry(unit_code),
  committed_quantity numeric(20,6) not null check (committed_quantity >= 0),
  delivered_quantity numeric(20,6) not null default 0 check (delivered_quantity >= 0),
  paid_quantity numeric(20,6) not null default 0 check (paid_quantity >= 0),
  contracted_unit_price numeric(20,6) not null check (contracted_unit_price >= 0),
  currency char(3) not null default 'KES',
  tax_status text not null check (tax_status in ('exclusive','inclusive','exempt','zero_rated','unknown')),
  tax_rate numeric(9,6) not null default 0 check (tax_rate between 0 and 1),
  delivery_basis text not null default 'ex_works'
    check (delivery_basis in ('ex_works','delivered_to_depot','delivered_to_site')),
  price_locked boolean not null default true,
  escalation_clause boolean not null default false,
  price_valid_until date,
  commitment_status text not null default 'ordered'
    check (commitment_status in ('quoted','ordered','part_delivered','delivered','cancelled','closed')),
  source_ref text,
  created_at timestamptz not null default now(),
  check (delivered_quantity <= committed_quantity),
  check (paid_quantity <= committed_quantity)
);

alter table costing.supplier_price_snapshots
  add column if not exists delivery_basis text not null default 'ex_works'
    check (delivery_basis in ('ex_works','delivered_to_depot','delivered_to_site')),
  add column if not exists price_basis text not null default 'local_quote'
    check (price_basis in ('local_quote','national_base')),
  add column if not exists transport_included boolean not null default false,
  add column if not exists input_vat_recoverable boolean not null default false,
  add column if not exists location_index_id uuid references costing.location_price_indices(id);

alter table costing.resource_requirements
  add column if not exists wastage_included_in_coefficient boolean not null default false,
  add column if not exists price_snapshot_id uuid references costing.supplier_price_snapshots(id),
  add column if not exists commitment_id uuid references costing.procurement_commitments(id),
  add column if not exists quantity_source text,
  add column if not exists price_exposure_status text not null default 'uncommitted'
    check (price_exposure_status in ('uncommitted','partially_committed','committed','delivered','closed'));

create table if not exists costing.schedule_task_dependencies (
  id uuid primary key default gen_random_uuid(),
  predecessor_task_id uuid not null references costing.project_schedule_tasks(id) on delete cascade,
  successor_task_id uuid not null references costing.project_schedule_tasks(id) on delete cascade,
  dependency_type text not null default 'finish_to_start'
    check (dependency_type in ('finish_to_start','start_to_start','finish_to_finish','start_to_finish')),
  lag_days numeric(12,3) not null default 0,
  created_at timestamptz not null default now(),
  unique (predecessor_task_id, successor_task_id, dependency_type),
  check (predecessor_task_id <> successor_task_id)
);

create table if not exists costing.calculation_run_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references costing.projects(id) on delete cascade,
  cost_model_id uuid not null references costing.cost_models(id) on delete cascade,
  calculation_run_id uuid references costing.calculation_runs(id) on delete set null,
  entity_code text,
  property_code text,
  old_value jsonb,
  new_value jsonb,
  unit_code text references costing.unit_registry(unit_code),
  change_reason text not null,
  source_ref text,
  affected_formula_keys text[] not null default '{}',
  actor_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_formula_dependencies_source
  on costing.formula_dependencies(formula_key, formula_version);
create index if not exists idx_formula_dependencies_target
  on costing.formula_dependencies(depends_on_formula_key, depends_on_formula_version);
create index if not exists idx_entity_property_symbol
  on costing.entity_property_registry(symbol_code);
create index if not exists idx_commitments_resource
  on costing.procurement_commitments(resource_requirement_id, commitment_status);
create index if not exists idx_schedule_dependency_successor
  on costing.schedule_task_dependencies(successor_task_id);
create index if not exists idx_run_events_model_time
  on costing.calculation_run_events(cost_model_id, created_at desc);
create index if not exists idx_location_index_lookup
  on costing.location_price_indices(county, locality, cost_category, observation_period);

insert into costing.unit_registry
  (unit_code, display_name, symbol, dimension, base_unit_code, conversion_factor_to_base, is_dimensionless)
values
  ('m','metre','m','{"length":1,"mass":0,"time":0,"currency":0,"count":0}','m',1,false),
  ('m2','square metre','m²','{"length":2,"mass":0,"time":0,"currency":0,"count":0}','m2',1,false),
  ('m3','cubic metre','m³','{"length":3,"mass":0,"time":0,"currency":0,"count":0}','m3',1,false),
  ('kg','kilogram','kg','{"length":0,"mass":1,"time":0,"currency":0,"count":0}','kg',1,false),
  ('t','tonne','t','{"length":0,"mass":1,"time":0,"currency":0,"count":0}','kg',1000,false),
  ('hr','hour','hr','{"length":0,"mass":0,"time":1,"currency":0,"count":0}','hr',1,false),
  ('day','eight-hour workday','day','{"length":0,"mass":0,"time":1,"currency":0,"count":0}','hr',8,false),
  ('worker_hr','worker-hour','worker-hr','{"length":0,"mass":0,"time":1,"currency":0,"count":1}','worker_hr',1,false),
  ('KES','Kenyan shilling','KES','{"length":0,"mass":0,"time":0,"currency":1,"count":0}','KES',1,false),
  ('item','item','item','{"length":0,"mass":0,"time":0,"currency":0,"count":1}','item',1,false),
  ('trip','trip','trip','{"length":0,"mass":0,"time":0,"currency":0,"count":1}','trip',1,false),
  ('ratio','ratio','1','{"length":0,"mass":0,"time":0,"currency":0,"count":0}','ratio',1,true),
  ('percent','percent','%','{"length":0,"mass":0,"time":0,"currency":0,"count":0}','ratio',0.01,true),
  ('KES_per_m2','Kenyan shillings per square metre','KES/m²','{"length":-2,"mass":0,"time":0,"currency":1,"count":0}','KES_per_m2',1,false),
  ('KES_per_unit','Kenyan shillings per item','KES/item','{"length":0,"mass":0,"time":0,"currency":1,"count":-1}','KES_per_unit',1,false),
  ('KES_per_worker_hr','Kenyan shillings per worker-hour','KES/worker-hr','{"length":0,"mass":0,"time":-1,"currency":1,"count":-1}','KES_per_worker_hr',1,false)
on conflict (unit_code) do nothing;

create or replace function costing.reject_cost_lineage_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'costing.cost_lineage is append-only; create a new calculation run';
end;
$$;

drop trigger if exists trg_cost_lineage_append_only on costing.cost_lineage;
create trigger trg_cost_lineage_append_only
before update or delete on costing.cost_lineage
for each row execute function costing.reject_cost_lineage_mutation();

create or replace function costing.protect_completed_calculation_run()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.status in ('completed','approved') then
      raise exception 'completed/approved calculation runs are immutable';
    end if;
    return old;
  end if;
  if old.status in ('completed','approved') and
    row(new.project_id,new.cost_model_id,new.run_number,new.scenario_id,new.engine_version,
        new.formula_registry_version,new.input_snapshot,new.result_snapshot,new.input_hash,
        new.result_hash,new.currency)
    is distinct from
    row(old.project_id,old.cost_model_id,old.run_number,old.scenario_id,old.engine_version,
        old.formula_registry_version,old.input_snapshot,old.result_snapshot,old.input_hash,
        old.result_hash,old.currency) then
    raise exception 'calculation snapshot is immutable; create a new run';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_calculation_run_immutable on costing.calculation_runs;
create trigger trg_calculation_run_immutable
before update or delete on costing.calculation_runs
for each row execute function costing.protect_completed_calculation_run();

alter table costing.unit_registry enable row level security;
alter table costing.entity_registry enable row level security;
alter table costing.entity_property_registry enable row level security;
alter table costing.formula_dependencies enable row level security;
alter table costing.tax_policies enable row level security;
alter table costing.procurement_commitments enable row level security;
alter table costing.schedule_task_dependencies enable row level security;
alter table costing.calculation_run_events enable row level security;

revoke all on costing.unit_registry, costing.entity_registry, costing.entity_property_registry,
  costing.formula_dependencies, costing.tax_policies, costing.procurement_commitments,
  costing.schedule_task_dependencies, costing.calculation_run_events
from public, anon, authenticated;
grant all privileges on costing.unit_registry, costing.entity_registry, costing.entity_property_registry,
  costing.formula_dependencies, costing.tax_policies, costing.procurement_commitments,
  costing.schedule_task_dependencies, costing.calculation_run_events
to service_role;

comment on table costing.formula_dependencies is 'Version-specific formula DAG edges; executor validates missing nodes and cycles before calculation.';
comment on table costing.unit_registry is 'Canonical dimensional units and conversion factors; dimensional mismatches must block calculation.';
comment on table costing.procurement_commitments is 'Price exposure boundary between committed contractual quantities and uncommitted market-exposed quantities.';
comment on table costing.calculation_run_events is 'Append-only change events that identify impacted formula nodes and calculation runs.';
comment on table costing.tax_policies is 'Versioned tax policy evidence; unknown status blocks firm customer quotes.';
