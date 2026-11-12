-- Wajenzi Dynamic Total Project Cost Intelligence Engine
-- Draft migration on feature branch only. Review before applying to any database.
create schema if not exists costing;
comment on schema costing is 'Private costing domain; access through trusted server-side services.';

create table costing.projects (
 id uuid primary key default gen_random_uuid(), project_code text not null unique,
 name text not null, owner_user_id uuid not null references auth.users(id),
 country_code char(2) not null default 'KE', county text, locality text,
 currency char(3) not null default 'KES', floor_area_m2 numeric(14,3) not null check(floor_area_m2>0),
 project_type text not null, created_at timestamptz not null default now()
);
create table costing.cost_models (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references costing.projects(id) on delete cascade,
 version integer not null check(version>0), model_name text not null, formula_registry_version text not null,
 status text not null default 'draft' check(status in('draft','in_review','approved','superseded','archived')),
 base_date date not null, price_valid_until date, assumptions jsonb not null default '{}',
 created_by uuid references auth.users(id), approved_by uuid references auth.users(id), approved_at timestamptz,
 created_at timestamptz not null default now(), unique(project_id,version),
 check(status<>'approved' or (approved_by is not null and approved_at is not null))
);
create table costing.formula_registry (
 id uuid primary key default gen_random_uuid(), formula_key text not null, version text not null,
 name text not null, expression text not null, input_schema jsonb not null default '{}',
 output_unit text not null, rounding_policy text not null default 'money_2dp',
 effective_from date not null, effective_to date, is_active boolean not null default true,
 unique(formula_key,version)
);
create table costing.building_systems (
 id uuid primary key default gen_random_uuid(), system_code text not null unique, name text not null,
 parent_system_id uuid references costing.building_systems(id), sort_order integer not null default 0,
 taxonomy_version text not null default 'WJ-COST-TAXONOMY-1.0', is_active boolean not null default true
);
create table costing.assemblies (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references costing.projects(id) on delete cascade,
 cost_model_id uuid not null references costing.cost_models(id) on delete cascade,
 building_system_id uuid not null references costing.building_systems(id),
 assembly_code text not null, name text not null, specification jsonb not null default '{}',
 measured_quantity numeric(20,6) not null default 0 check(measured_quantity>=0), unit_code text not null,
 drawing_ref text, drawing_revision text, source_confidence numeric(5,4) check(source_confidence between 0 and 1),
 unique(cost_model_id,assembly_code)
);
create table costing.quantity_measurements (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references costing.projects(id) on delete cascade,
 cost_model_id uuid not null references costing.cost_models(id) on delete cascade,
 assembly_id uuid references costing.assemblies(id) on delete set null, measurement_code text not null,
 quantity numeric(20,6) not null check(quantity>=0), unit_code text not null,
 measurement_method text not null check(measurement_method in('plan_takeoff','manual','schedule','site_measurement','imported')),
 drawing_ref text, drawing_revision text, source_document_id text,
 confidence numeric(5,4) check(confidence between 0 and 1), measured_by uuid references auth.users(id),
 measured_at timestamptz not null default now(), metadata jsonb not null default '{}'
);
create table costing.resource_requirements (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references costing.projects(id) on delete cascade,
 cost_model_id uuid not null references costing.cost_models(id) on delete cascade,
 assembly_id uuid not null references costing.assemblies(id) on delete cascade,
 resource_type text not null check(resource_type in('material','labour','equipment','subcontract','logistics','other')),
 resource_code text not null, description text not null, quantity_per_assembly numeric(20,8) not null check(quantity_per_assembly>=0),
 unit_code text not null, wastage_rate numeric(9,6) not null default 0 check(wastage_rate between 0 and 1),
 productivity_rate numeric(20,8), crew_size numeric(12,4), unit_cost numeric(20,6),
 cost_source text, metadata jsonb not null default '{}'
);
create table costing.supplier_price_snapshots (
 id uuid primary key default gen_random_uuid(), product_ref text not null, supplier_ref text, supplier_sku text,
 locality text not null, county text, unit_code text not null, unit_price numeric(20,6) not null check(unit_price>=0),
 currency char(3) not null default 'KES',
 tax_status text not null check(tax_status in('exclusive','inclusive','exempt','zero_rated','unknown')),
 tax_rate numeric(9,6) not null default 0 check(tax_rate between 0 and 1),
 transport_per_unit numeric(20,6) not null default 0, handling_per_unit numeric(20,6) not null default 0,
 insurance_per_unit numeric(20,6) not null default 0, discount_per_unit numeric(20,6) not null default 0,
 valid_from timestamptz not null, valid_until timestamptz,
 source_type text not null check(source_type in('supplier_quote','supplier_feed','verified_invoice','market_observation','mock_fixture')),
 source_ref text, is_verified boolean not null default false, captured_at timestamptz not null default now(),
 metadata jsonb not null default '{}', check(valid_until is null or valid_until>valid_from)
);
create table costing.location_price_indices (
 id uuid primary key default gen_random_uuid(), country_code char(2) not null default 'KE',
 county text not null, locality text, cost_category text not null, index_value numeric(14,6) not null check(index_value>0),
 base_index_value numeric(14,6) not null default 100, base_period text not null, observation_period text not null,
 source_name text not null, source_ref text, observed_at date not null,
 quality_status text not null default 'unverified' check(quality_status in('unverified','reviewed','verified'))
);
create table costing.labour_productivity_rates (
 id uuid primary key default gen_random_uuid(), trade_code text not null, task_code text not null,
 locality text not null, unit_code text not null, output_per_worker_hour numeric(20,8) not null check(output_per_worker_hour>0),
 daily_wage numeric(20,2) not null check(daily_wage>=0), paid_hours_per_day numeric(8,3) not null default 8,
 crew_size numeric(12,4) not null default 1, effective_from date not null, effective_to date,
 source_type text not null default 'mock_fixture', source_ref text, confidence numeric(5,4)
);
create table costing.project_schedule_tasks (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references costing.projects(id) on delete cascade,
 cost_model_id uuid not null references costing.cost_models(id) on delete cascade,
 task_code text not null, name text not null, building_system_id uuid references costing.building_systems(id),
 planned_start date not null, planned_finish date not null, planned_cost numeric(20,2) not null default 0,
 predecessor_task_ids uuid[] not null default '{}', progress_pct numeric(5,2) not null default 0,
 status text not null default 'not_started' check(status in('not_started','in_progress','complete','blocked')),
 check(planned_finish>=planned_start), unique(cost_model_id,task_code)
);
create table costing.project_cashflows (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references costing.projects(id) on delete cascade,
 cost_model_id uuid not null references costing.cost_models(id) on delete cascade,
 period_start date not null, period_end date not null, category_code text not null,
 planned_outflow numeric(20,2) not null default 0 check(planned_outflow>=0),
 planned_inflow numeric(20,2) not null default 0 check(planned_inflow>=0),
 actual_outflow numeric(20,2), actual_inflow numeric(20,2), funding_source text,
 source_task_id uuid references costing.project_schedule_tasks(id), check(period_end>=period_start)
);
create table costing.project_risk_register (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references costing.projects(id) on delete cascade,
 cost_model_id uuid not null references costing.cost_models(id) on delete cascade,
 risk_code text not null, description text not null, probability numeric(9,6) not null check(probability between 0 and 1),
 financial_impact numeric(20,2) not null check(financial_impact>=0), impact_basis text not null default 'KES',
 response_strategy text, residual_probability numeric(9,6), residual_impact numeric(20,2),
 owner_user_id uuid references auth.users(id), status text not null default 'identified',
 unique(cost_model_id,risk_code)
);
create table costing.cost_scenarios (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references costing.projects(id) on delete cascade,
 cost_model_id uuid not null references costing.cost_models(id) on delete cascade,
 scenario_code text not null, name text not null,
 scenario_type text not null default 'what_if' check(scenario_type in('base','what_if','sensitivity','monte_carlo')),
 parameters jsonb not null default '{}', random_seed bigint, simulation_count integer,
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 unique(cost_model_id,scenario_code)
);
create table costing.calculation_runs (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references costing.projects(id) on delete cascade,
 cost_model_id uuid not null references costing.cost_models(id) on delete restrict, run_number integer not null check(run_number>0),
 scenario_id uuid references costing.cost_scenarios(id), status text not null default 'completed',
 engine_version text not null, formula_registry_version text not null,
 input_snapshot jsonb not null, result_snapshot jsonb, input_hash text not null, result_hash text,
 currency char(3) not null default 'KES', started_at timestamptz not null default now(), completed_at timestamptz,
 created_by uuid references auth.users(id), approved_by uuid references auth.users(id), approved_at timestamptz,
 unique(cost_model_id,run_number),
 check(status<>'approved' or (approved_by is not null and approved_at is not null))
);
create table costing.cost_lineage (
 id uuid primary key default gen_random_uuid(), calculation_run_id uuid not null references costing.calculation_runs(id) on delete cascade,
 line_code text not null, parent_line_code text, cost_category text not null, description text not null,
 quantity numeric(20,8), unit_code text, unit_rate numeric(20,8), amount numeric(20,2) not null,
 formula_key text not null, formula_version text not null, source_type text not null, source_id text,
 input_snapshot jsonb not null default '{}', metadata jsonb not null default '{}',
 unique(calculation_run_id,line_code)
);
create table costing.cost_approvals (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references costing.projects(id) on delete cascade,
 cost_model_id uuid not null references costing.cost_models(id) on delete cascade,
 calculation_run_id uuid references costing.calculation_runs(id), action text not null
 check(action in('submitted','approved','rejected','reopened','superseded')),
 actor_user_id uuid references auth.users(id), reason text, created_at timestamptz not null default now()
);

create index idx_cost_models_project on costing.cost_models(project_id,version desc);
create index idx_assemblies_model_system on costing.assemblies(cost_model_id,building_system_id);
create index idx_supplier_price_lookup on costing.supplier_price_snapshots(product_ref,locality,valid_from desc);
create index idx_cashflows_model_period on costing.project_cashflows(cost_model_id,period_start);
create index idx_calculation_runs_model on costing.calculation_runs(cost_model_id,run_number desc);
create index idx_cost_lineage_run_category on costing.cost_lineage(calculation_run_id,cost_category);

-- Owner-scoped read/write for project root. Trusted service_role remains the only intended API writer.
alter table costing.projects enable row level security;
create policy project_owner_select on costing.projects for select to authenticated using(owner_user_id=(select auth.uid()));
create policy project_owner_insert on costing.projects for insert to authenticated with check(owner_user_id=(select auth.uid()));
create policy project_owner_update on costing.projects for update to authenticated using(owner_user_id=(select auth.uid())) with check(owner_user_id=(select auth.uid()));

do $$
declare t text;
begin
 foreach t in array array['cost_models','assemblies','quantity_measurements','resource_requirements','project_schedule_tasks','project_cashflows','project_risk_register','cost_scenarios','calculation_runs','cost_approvals'] loop
  execute format('alter table costing.%I enable row level security',t);
  execute format('create policy project_owner_access on costing.%I for all to authenticated using(exists(select 1 from costing.projects p where p.id=project_id and p.owner_user_id=(select auth.uid()))) with check(exists(select 1 from costing.projects p where p.id=project_id and p.owner_user_id=(select auth.uid())))',t);
 end loop;
end $$;

-- Global reference and lineage tables are server-only: RLS enabled, no authenticated/anon policies.
alter table costing.formula_registry enable row level security;
alter table costing.building_systems enable row level security;
alter table costing.supplier_price_snapshots enable row level security;
alter table costing.location_price_indices enable row level security;
alter table costing.labour_productivity_rates enable row level security;
alter table costing.cost_lineage enable row level security;

revoke all on schema costing from public, anon, authenticated;
grant usage on schema costing to service_role;
grant all privileges on all tables in schema costing to service_role;
grant all privileges on all sequences in schema costing to service_role;
alter default privileges in schema costing grant all on tables to service_role;
alter default privileges in schema costing grant all on sequences to service_role;

comment on table costing.calculation_runs is 'Immutable input/output snapshots. Recalculate into a new run; never overwrite approved results.';
comment on table costing.cost_lineage is 'Line-level formula, source, input and result traceability.';
comment on table costing.supplier_price_snapshots is 'Append-only supplier/market evidence; mock_fixture is never a live quote.';
