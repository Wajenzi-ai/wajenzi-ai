-- WAJENZI Refined Ontology v0.2 registry extension
-- Apply after registry_schema.sql and ontology/seed data.
-- PostgreSQL 15+. PostGIS is recommended for spatial joins and route context.

CREATE EXTENSION IF NOT EXISTS postgis;

-- One predicate may support multiple valid domain/range signatures.
CREATE TABLE IF NOT EXISTS ontology_predicate_signature (
    signature_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    predicate_code          text NOT NULL REFERENCES ontology_predicate(predicate_code),
    domain_class_code       text NOT NULL,
    range_class_code        text NOT NULL,
    notes                   text,
    UNIQUE (predicate_code, domain_class_code, range_class_code)
);

-- Persons and accounts are deliberately separate from roles and organizations.
CREATE TABLE IF NOT EXISTS person (
    entity_id               uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    display_name            text NOT NULL,
    country_code            char(2),
    profile_status          text NOT NULL DEFAULT 'draft'
                            CHECK (profile_status IN ('draft', 'active', 'restricted', 'archived')),
    metadata                jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS user_account (
    entity_id               uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    person_entity_id        uuid NOT NULL REFERENCES person(entity_id),
    account_status          text NOT NULL DEFAULT 'pending'
                            CHECK (account_status IN ('pending', 'active', 'suspended', 'closed')),
    authentication_subject  text,
    last_authenticated_at   timestamptz,
    metadata                jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (authentication_subject)
);

CREATE TABLE IF NOT EXISTS workspace (
    entity_id               uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    workspace_type          text NOT NULL
                            CHECK (workspace_type IN ('organization', 'project', 'platform', 'support')),
    owner_entity_id         uuid REFERENCES registry_entity(entity_id),
    data_policy             jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS organization_membership (
    membership_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_entity_id        uuid NOT NULL REFERENCES person(entity_id),
    organization_entity_id  uuid NOT NULL REFERENCES organization(entity_id),
    membership_type         text NOT NULL DEFAULT 'member',
    title                   text,
    authority_scope         jsonb NOT NULL DEFAULT '{}'::jsonb,
    status                  text NOT NULL DEFAULT 'active'
                            CHECK (status IN ('invited', 'active', 'suspended', 'ended')),
    valid_from              timestamptz,
    valid_to                timestamptz,
    source_record_id        uuid REFERENCES source_record(source_record_id),
    UNIQUE (person_entity_id, organization_entity_id, membership_type, valid_from),
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS organization_role_assignment (
    organization_role_assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_entity_id    uuid NOT NULL REFERENCES organization(entity_id),
    role_code                 text NOT NULL,
    jurisdiction_code         text,
    evidence_entity_id        uuid REFERENCES registry_entity(entity_id),
    status                    text NOT NULL DEFAULT 'active'
                              CHECK (status IN ('draft', 'active', 'inactive', 'suspended', 'expired')),
    valid_from                timestamptz,
    valid_to                  timestamptz,
    metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (organization_entity_id, role_code, jurisdiction_code, valid_from),
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS workspace_access_grant (
    access_grant_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_entity_id      uuid NOT NULL REFERENCES workspace(entity_id),
    subject_entity_id        uuid NOT NULL REFERENCES registry_entity(entity_id),
    role_code                text NOT NULL,
    action_code              text NOT NULL,
    resource_entity_id       uuid REFERENCES registry_entity(entity_id),
    data_sensitivity         text NOT NULL DEFAULT 'organization'
                             CHECK (data_sensitivity IN ('private', 'organization', 'project', 'counterparty', 'public', 'restricted')),
    purpose_code             text,
    conditions               jsonb NOT NULL DEFAULT '{}'::jsonb,
    valid_from               timestamptz NOT NULL DEFAULT now(),
    valid_to                 timestamptz,
    granted_by_entity_id     uuid REFERENCES registry_entity(entity_id),
    CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS project (
    entity_id               uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    workspace_entity_id     uuid REFERENCES workspace(entity_id),
    project_profile         text,
    project_type            text NOT NULL,
    initiated_by_entity_id  uuid REFERENCES registry_entity(entity_id),
    owned_by_entity_id      uuid REFERENCES registry_entity(entity_id),
    status                  text NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled', 'archived')),
    planned_start_at        timestamptz,
    planned_end_at          timestamptz,
    metadata                jsonb NOT NULL DEFAULT '{}'::jsonb,
    CHECK (planned_end_at IS NULL OR planned_start_at IS NULL OR planned_end_at >= planned_start_at)
);

CREATE TABLE IF NOT EXISTS project_role_assignment (
    project_role_assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_entity_id        uuid NOT NULL REFERENCES project(entity_id),
    actor_entity_id          uuid NOT NULL REFERENCES registry_entity(entity_id),
    organization_entity_id   uuid REFERENCES organization(entity_id),
    role_code                text NOT NULL,
    scope                    jsonb NOT NULL DEFAULT '{}'::jsonb,
    authority_scope          jsonb NOT NULL DEFAULT '{}'::jsonb,
    status                   text NOT NULL DEFAULT 'active'
                             CHECK (status IN ('invited', 'active', 'suspended', 'ended')),
    valid_from               timestamptz,
    valid_to                 timestamptz,
    UNIQUE (project_entity_id, actor_entity_id, role_code, valid_from),
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

-- Location model: administrative, service-delivery, postal, operational, and project places remain typed.
CREATE TABLE IF NOT EXISTS boundary_version (
    entity_id               uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    source_system_id        uuid REFERENCES source_system(source_system_id),
    hierarchy_type          text NOT NULL,
    published_or_vintage    text,
    effective_from          timestamptz,
    effective_to            timestamptz,
    crs                     text NOT NULL DEFAULT 'EPSG:4326',
    geometry_hash           text,
    license                 text,
    geometry                geometry(MultiPolygon, 4326),
    qa_status               text NOT NULL DEFAULT 'pending'
                            CHECK (qa_status IN ('pending', 'valid', 'invalid', 'historical', 'superseded')),
    quality_notes           text,
    CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS geographic_unit (
    entity_id               uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    hierarchy_type          text NOT NULL,
    parent_entity_id        uuid REFERENCES geographic_unit(entity_id),
    boundary_version_id     uuid REFERENCES boundary_version(entity_id),
    official_code           text,
    name                    text NOT NULL,
    aliases                 jsonb NOT NULL DEFAULT '[]'::jsonb,
    status                  text NOT NULL DEFAULT 'current'
                            CHECK (status IN ('current', 'proposed', 'historical', 'superseded', 'unknown')),
    metadata                jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_geographic_unit_type_name
    ON geographic_unit(hierarchy_type, lower(name));

CREATE TABLE IF NOT EXISTS site (
    entity_id               uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    address_entity_id       uuid REFERENCES registry_entity(entity_id),
    address_raw             text,
    address_normalized      text,
    geometry                geometry(Point, 4326),
    status                  text NOT NULL DEFAULT 'active'
                            CHECK (status IN ('draft', 'active', 'inactive', 'archived')),
    metadata                jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS project_site (
    project_entity_id       uuid NOT NULL REFERENCES project(entity_id),
    site_entity_id          uuid NOT NULL REFERENCES site(entity_id),
    site_role               text NOT NULL DEFAULT 'primary',
    valid_from              timestamptz NOT NULL DEFAULT now(),
    valid_to                timestamptz,
    PRIMARY KEY (project_entity_id, site_entity_id),
    CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS geo_observation (
    geo_observation_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_entity_id       uuid NOT NULL REFERENCES registry_entity(entity_id),
    geometry                geometry(Point, 4326) NOT NULL,
    crs                     text NOT NULL DEFAULT 'EPSG:4326',
    accuracy_m              numeric,
    capture_method          text NOT NULL,
    source_system_id        uuid REFERENCES source_system(source_system_id),
    observed_at             timestamptz NOT NULL,
    confidence              numeric(5, 4) NOT NULL DEFAULT 1.0 CHECK (confidence BETWEEN 0 AND 1),
    provenance_id           uuid,
    metadata                jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_geo_observation_subject_time
    ON geo_observation(subject_entity_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS spatial_membership (
    spatial_membership_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_entity_id       uuid NOT NULL REFERENCES registry_entity(entity_id),
    geographic_unit_id      uuid NOT NULL REFERENCES geographic_unit(entity_id),
    boundary_version_id     uuid REFERENCES boundary_version(entity_id),
    join_method              text NOT NULL
                              CHECK (join_method IN ('point_in_polygon', 'nearest_feature', 'supplied_address', 'manual_review')),
    distance_to_boundary_m  numeric,
    ambiguous               boolean NOT NULL DEFAULT false,
    evaluated_at            timestamptz NOT NULL DEFAULT now(),
    confidence              numeric(5, 4) NOT NULL DEFAULT 1.0 CHECK (confidence BETWEEN 0 AND 1),
    source_geometry_hash    text,
    provenance_id           uuid,
    valid_from              timestamptz NOT NULL DEFAULT now(),
    valid_to                timestamptz,
    UNIQUE (subject_entity_id, geographic_unit_id, boundary_version_id, evaluated_at),
    CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_spatial_membership_subject
    ON spatial_membership(subject_entity_id, confidence DESC, evaluated_at DESC);

CREATE TABLE IF NOT EXISTS facility (
    entity_id               uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    organization_entity_id  uuid NOT NULL REFERENCES organization(entity_id),
    facility_type           text NOT NULL,
    address_entity_id       uuid REFERENCES registry_entity(entity_id),
    geometry                geometry(Point, 4326),
    operating_hours         jsonb NOT NULL DEFAULT '{}'::jsonb,
    access_constraints      jsonb NOT NULL DEFAULT '{}'::jsonb,
    verification_status     text NOT NULL DEFAULT 'unverified'
                            CHECK (verification_status IN ('unverified', 'pending', 'verified', 'expired', 'suspended')),
    valid_from              timestamptz,
    valid_to                timestamptz,
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS warehouse (
    entity_id               uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    facility_entity_id      uuid NOT NULL REFERENCES facility(entity_id),
    operator_entity_id      uuid REFERENCES organization(entity_id),
    capacity                jsonb NOT NULL DEFAULT '{}'::jsonb,
    loading_constraints     jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS product_variant (
    entity_id               uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    product_entity_id       uuid NOT NULL REFERENCES product(entity_id),
    sku                     text,
    manufacturer_part_number text,
    barcode                 text,
    pack_size               numeric,
    pack_unit_entity_id     uuid REFERENCES unit(entity_id),
    specification_entity_id uuid REFERENCES registry_entity(entity_id),
    metadata                jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (product_entity_id, manufacturer_part_number),
    UNIQUE (product_entity_id, barcode)
);

CREATE TABLE IF NOT EXISTS product_offer (
    entity_id               uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    product_variant_entity_id uuid NOT NULL REFERENCES product_variant(entity_id),
    seller_organization_id   uuid NOT NULL REFERENCES organization(entity_id),
    facility_entity_id       uuid REFERENCES facility(entity_id),
    supplier_sku             text,
    minimum_order            jsonb NOT NULL DEFAULT '{}'::jsonb,
    lead_time                jsonb NOT NULL DEFAULT '{}'::jsonb,
    terms                    jsonb NOT NULL DEFAULT '{}'::jsonb,
    status                   text NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft', 'active', 'paused', 'expired', 'blocked')),
    valid_from               timestamptz,
    valid_to                 timestamptz,
    source_record_id         uuid REFERENCES source_record(source_record_id),
    UNIQUE (seller_organization_id, facility_entity_id, supplier_sku),
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS price_observation (
    price_observation_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_offer_entity_id  uuid NOT NULL REFERENCES product_offer(entity_id),
    variant_entity_id        uuid NOT NULL REFERENCES product_variant(entity_id),
    facility_entity_id       uuid REFERENCES facility(entity_id),
    amount                   numeric NOT NULL CHECK (amount >= 0),
    currency_code            char(3) NOT NULL,
    unit_entity_id           uuid REFERENCES unit(entity_id),
    quantity_basis            jsonb NOT NULL DEFAULT '{}'::jsonb,
    tax_basis                text NOT NULL,
    observed_at              timestamptz NOT NULL,
    valid_until              timestamptz,
    source_record_id         uuid REFERENCES source_record(source_record_id),
    confidence               numeric(5, 4) NOT NULL DEFAULT 1.0 CHECK (confidence BETWEEN 0 AND 1),
    provenance_id            uuid,
    CHECK (valid_until IS NULL OR valid_until >= observed_at)
);

CREATE INDEX IF NOT EXISTS idx_price_observation_variant_time
    ON price_observation(variant_entity_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS availability_observation (
    availability_observation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_offer_entity_id  uuid NOT NULL REFERENCES product_offer(entity_id),
    variant_entity_id        uuid NOT NULL REFERENCES product_variant(entity_id),
    facility_entity_id       uuid REFERENCES facility(entity_id),
    quantity                 numeric NOT NULL CHECK (quantity >= 0),
    unit_entity_id           uuid REFERENCES unit(entity_id),
    reserved_quantity        numeric NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    availability_state       text NOT NULL
                              CHECK (availability_state IN ('available', 'reserved', 'allocated', 'in_transit', 'damaged', 'returned', 'lost', 'unavailable')),
    observed_at              timestamptz NOT NULL,
    source_record_id         uuid REFERENCES source_record(source_record_id),
    confidence               numeric(5, 4) NOT NULL DEFAULT 1.0 CHECK (confidence BETWEEN 0 AND 1),
    provenance_id            uuid,
    CHECK (reserved_quantity <= quantity)
);

CREATE INDEX IF NOT EXISTS idx_availability_variant_facility_time
    ON availability_observation(variant_entity_id, facility_entity_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS project_requirement (
    entity_id               uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    project_entity_id        uuid NOT NULL REFERENCES project(entity_id),
    wbs_entity_id            uuid REFERENCES registry_entity(entity_id),
    activity_entity_id      uuid REFERENCES registry_entity(entity_id),
    boq_item_entity_id      uuid REFERENCES registry_entity(entity_id),
    specification_entity_id uuid REFERENCES registry_entity(entity_id),
    required_quantity        numeric CHECK (required_quantity IS NULL OR required_quantity >= 0),
    unit_entity_id           uuid REFERENCES unit(entity_id),
    required_by              timestamptz,
    substitution_policy      jsonb NOT NULL DEFAULT '{}'::jsonb,
    status                  text NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'approved', 'partially_satisfied', 'satisfied', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS procurement_request (
    entity_id               uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    project_entity_id        uuid REFERENCES project(entity_id),
    requested_by_entity_id   uuid REFERENCES registry_entity(entity_id),
    destination_site_id      uuid REFERENCES site(entity_id),
    status                  text NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'submitted', 'approved', 'rfq_open', 'awarded', 'cancelled', 'completed')),
    required_by              timestamptz,
    approval_policy          jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS procurement_request_line (
    procurement_line_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    procurement_request_id   uuid NOT NULL REFERENCES procurement_request(entity_id),
    requirement_entity_id    uuid REFERENCES project_requirement(entity_id),
    product_variant_entity_id uuid REFERENCES product_variant(entity_id),
    quantity                 numeric NOT NULL CHECK (quantity >= 0),
    unit_entity_id           uuid REFERENCES unit(entity_id),
    required_by              timestamptz,
    metadata                 jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS provenance_record (
    provenance_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system_id          uuid REFERENCES source_system(source_system_id),
    source_record_id          uuid REFERENCES source_record(source_record_id),
    source_url                text,
    source_content_hash       text,
    retrieval_or_observed_at  timestamptz,
    method                    text NOT NULL,
    transformation            jsonb NOT NULL DEFAULT '{}'::jsonb,
    license                   text,
    confidence                numeric(5, 4) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    reviewer_entity_id        uuid REFERENCES registry_entity(entity_id),
    approved_at               timestamptz
);

CREATE TABLE IF NOT EXISTS business_event (
    event_id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type                text NOT NULL,
    actor_entity_id           uuid REFERENCES registry_entity(entity_id),
    aggregate_type            text,
    aggregate_id              uuid,
    project_entity_id         uuid REFERENCES project(entity_id),
    site_entity_id            uuid REFERENCES site(entity_id),
    event_time                timestamptz NOT NULL DEFAULT now(),
    processing_time           timestamptz NOT NULL DEFAULT now(),
    source_system_id          uuid REFERENCES source_system(source_system_id),
    correlation_id            uuid,
    causation_id              uuid,
    payload                   jsonb NOT NULL DEFAULT '{}'::jsonb,
    schema_version            text NOT NULL DEFAULT '1.0',
    UNIQUE (event_type, source_system_id, correlation_id, causation_id, event_time)
);

ALTER TABLE audit_event
    ADD COLUMN IF NOT EXISTS correlation_id uuid,
    ADD COLUMN IF NOT EXISTS causation_id uuid,
    ADD COLUMN IF NOT EXISTS source_system_id uuid REFERENCES source_system(source_system_id),
    ADD COLUMN IF NOT EXISTS event_time timestamptz,
    ADD COLUMN IF NOT EXISTS access_purpose text,
    ADD COLUMN IF NOT EXISTS request_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Useful projections for location-aware procurement.
CREATE OR REPLACE VIEW current_facility_offer_snapshot AS
SELECT DISTINCT ON (po.entity_id)
    po.entity_id AS offer_entity_id,
    po.product_variant_entity_id,
    po.seller_organization_id,
    po.facility_entity_id,
    po.status AS offer_status,
    p.amount AS latest_amount,
    p.currency_code,
    p.unit_entity_id AS price_unit_entity_id,
    p.tax_basis,
    p.observed_at AS price_observed_at,
    a.quantity AS latest_quantity,
    a.reserved_quantity,
    a.availability_state,
    a.observed_at AS availability_observed_at
FROM product_offer po
LEFT JOIN LATERAL (
    SELECT p1.*
    FROM price_observation p1
    WHERE p1.product_offer_entity_id = po.entity_id
    ORDER BY p1.observed_at DESC
    LIMIT 1
) p ON true
LEFT JOIN LATERAL (
    SELECT a1.*
    FROM availability_observation a1
    WHERE a1.product_offer_entity_id = po.entity_id
    ORDER BY a1.observed_at DESC
    LIMIT 1
) a ON true
ORDER BY po.entity_id, GREATEST(COALESCE(p.observed_at, '-infinity'::timestamptz), COALESCE(a.observed_at, '-infinity'::timestamptz)) DESC;

COMMENT ON TABLE spatial_membership IS 'Temporal, provenance-aware assertion linking a site/facility/address to a typed geographic unit. Do not collapse Kenya electoral, statistical, county, service-delivery, postal, and planning hierarchies.';
COMMENT ON TABLE price_observation IS 'Append-only price facts. Do not replace with one mutable current_price field.';
COMMENT ON TABLE availability_observation IS 'Append-only stock/availability facts, specific to variant, offer, facility, and observation time.';
COMMENT ON TABLE project_role_assignment IS 'Project-scoped responsibility. A person or organization may hold different roles on different projects.';
