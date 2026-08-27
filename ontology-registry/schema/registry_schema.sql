-- WAJENZI Foundation Registry MVP
-- PostgreSQL 15+
-- Authoritative identity, ontology, provenance, matching, and relationship layer.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS ontology_class (
    class_code              text PRIMARY KEY,
    label                   text NOT NULL,
    description             text,
    is_abstract             boolean NOT NULL DEFAULT false,
    is_active               boolean NOT NULL DEFAULT true,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ontology_predicate (
    predicate_code          text PRIMARY KEY,
    label                   text NOT NULL,
    description             text,
    domain_class_code       text REFERENCES ontology_class(class_code),
    range_class_code        text REFERENCES ontology_class(class_code),
    is_symmetric            boolean NOT NULL DEFAULT false,
    is_transitive           boolean NOT NULL DEFAULT false,
    is_active               boolean NOT NULL DEFAULT true,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registry_entity (
    entity_id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type             text NOT NULL,
    canonical_name          text NOT NULL,
    description             text,
    status                  text NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'active', 'deprecated', 'blocked', 'merged')),
    version                 integer NOT NULL DEFAULT 1 CHECK (version > 0),
    merged_into_entity_id   uuid REFERENCES registry_entity(entity_id),
    metadata                jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT no_self_merge CHECK (
        merged_into_entity_id IS NULL OR merged_into_entity_id <> entity_id
    )
);

CREATE INDEX IF NOT EXISTS idx_registry_entity_type_status
    ON registry_entity(entity_type, status);

CREATE INDEX IF NOT EXISTS idx_registry_entity_name
    ON registry_entity USING gin (to_tsvector('simple', canonical_name));

CREATE TABLE IF NOT EXISTS registry_identifier (
    identifier_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id               uuid NOT NULL REFERENCES registry_entity(entity_id),
    namespace               text NOT NULL,
    identifier_type         text NOT NULL,
    identifier_value        text NOT NULL CHECK (btrim(identifier_value) <> ''),
    identifier_value_normalized text GENERATED ALWAYS AS (lower(btrim(identifier_value))) STORED,
    is_preferred            boolean NOT NULL DEFAULT false,
    is_active               boolean NOT NULL DEFAULT true,
    source_record_id        uuid,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    UNIQUE (namespace, identifier_type, identifier_value_normalized)
);

CREATE INDEX IF NOT EXISTS idx_registry_identifier_entity
    ON registry_identifier(entity_id);

CREATE TABLE IF NOT EXISTS source_system (
    source_system_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_code              text NOT NULL UNIQUE,
    display_name             text NOT NULL,
    source_type              text NOT NULL
                            CHECK (source_type IN ('supplier', 'manufacturer', 'erp', 'manual', 'document', 'api', 'system')),
    owner_entity_id          uuid REFERENCES registry_entity(entity_id),
    is_active                boolean NOT NULL DEFAULT true,
    metadata                 jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source_import_batch (
    import_batch_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system_id          uuid NOT NULL REFERENCES source_system(source_system_id),
    source_file_name          text,
    source_file_hash          text,
    started_at                timestamptz NOT NULL DEFAULT now(),
    completed_at              timestamptz,
    status                    text NOT NULL DEFAULT 'started'
                             CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),
    records_seen              integer NOT NULL DEFAULT 0 CHECK (records_seen >= 0),
    records_created          integer NOT NULL DEFAULT 0 CHECK (records_created >= 0),
    records_matched          integer NOT NULL DEFAULT 0 CHECK (records_matched >= 0),
    records_review            integer NOT NULL DEFAULT 0 CHECK (records_review >= 0),
    error_summary             text,
    metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS source_record (
    source_record_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system_id          uuid NOT NULL REFERENCES source_system(source_system_id),
    import_batch_id           uuid REFERENCES source_import_batch(import_batch_id),
    external_record_id        text NOT NULL,
    record_type               text NOT NULL,
    raw_payload               jsonb NOT NULL DEFAULT '{}'::jsonb,
    raw_text                  text,
    content_hash              text,
    observed_at               timestamptz,
    created_at                timestamptz NOT NULL DEFAULT now(),
    UNIQUE (source_system_id, external_record_id)
);

ALTER TABLE registry_identifier
    ADD CONSTRAINT fk_identifier_source_record
    FOREIGN KEY (source_record_id) REFERENCES source_record(source_record_id);

CREATE TABLE IF NOT EXISTS document (
    document_id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id                 uuid NOT NULL UNIQUE REFERENCES registry_entity(entity_id),
    source_system_id           uuid REFERENCES source_system(source_system_id),
    document_type              text NOT NULL
                              CHECK (document_type IN ('catalog', 'datasheet', 'certificate', 'license', 'kyc', 'image', 'manual', 'other')),
    storage_uri                text,
    content_hash               text,
    mime_type                  text,
    extracted_text             text,
    metadata                   jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization (
    entity_id                 uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    legal_name                text NOT NULL,
    trading_name              text,
    country_code              char(2),
    registration_authority    text,
    tax_identifier            text,
    verification_status       text NOT NULL DEFAULT 'unverified'
                              CHECK (verification_status IN ('unverified', 'basic_verified', 'professional_verified', 'premium_verified', 'suspended')),
    metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS organization_role (
    organization_role_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_entity_id    uuid NOT NULL REFERENCES organization(entity_id),
    role_code                 text NOT NULL
                              CHECK (role_code IN ('supplier', 'manufacturer', 'distributor', 'hardware_store', 'contractor', 'developer', 'architect', 'engineer', 'service_provider', 'logistics_provider')),
    status                    text NOT NULL DEFAULT 'active'
                              CHECK (status IN ('draft', 'active', 'inactive', 'suspended')),
    valid_from                timestamptz,
    valid_to                  timestamptz,
    metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (organization_entity_id, role_code),
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS location (
    entity_id                 uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    country_code              char(2),
    admin1_code               text,
    city                      text,
    postal_code               text,
    address_text              text,
    latitude                  numeric(9, 6),
    longitude                 numeric(9, 6),
    metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb,
    CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);

CREATE TABLE IF NOT EXISTS taxonomy_node (
    entity_id                 uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    taxonomy_kind             text NOT NULL
                              CHECK (taxonomy_kind IN ('category', 'subcategory', 'product_type', 'application', 'project_phase', 'attribute_group')),
    taxonomy_version          text NOT NULL,
    code                      text NOT NULL,
    parent_entity_id          uuid REFERENCES taxonomy_node(entity_id),
    sort_order                integer NOT NULL DEFAULT 0,
    metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (taxonomy_version, code),
    CHECK (parent_entity_id IS NULL OR parent_entity_id <> entity_id)
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_parent
    ON taxonomy_node(parent_entity_id);

CREATE TABLE IF NOT EXISTS brand (
    entity_id                 uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    owner_organization_id     uuid REFERENCES organization(entity_id),
    normalized_name           text NOT NULL,
    metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS unit (
    entity_id                 uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    unit_code                 text NOT NULL UNIQUE,
    dimension                 text NOT NULL CHECK (dimension IN ('count', 'mass', 'length', 'area', 'volume', 'time', 'currency', 'other')),
    conversion_to_base        numeric,
    base_unit_code            text,
    metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS attribute_definition (
    entity_id                 uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    attribute_code            text NOT NULL UNIQUE,
    label                     text NOT NULL,
    value_type                text NOT NULL CHECK (value_type IN ('text', 'number', 'boolean', 'enum', 'range', 'quantity')),
    unit_entity_id            uuid REFERENCES unit(entity_id),
    allowed_values             jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_required                boolean NOT NULL DEFAULT false,
    metadata                   jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS material (
    entity_id                 uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    material_type              text,
    metadata                   jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS product (
    entity_id                 uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    product_type_entity_id    uuid REFERENCES taxonomy_node(entity_id),
    brand_entity_id           uuid REFERENCES brand(entity_id),
    primary_unit_entity_id    uuid REFERENCES unit(entity_id),
    canonical_description     text,
    manufacturer_entity_id    uuid REFERENCES organization(entity_id),
    metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_product_type
    ON product(product_type_entity_id);

CREATE TABLE IF NOT EXISTS product_listing (
    entity_id                 uuid PRIMARY KEY REFERENCES registry_entity(entity_id),
    product_entity_id         uuid REFERENCES product(entity_id),
    supplier_entity_id        uuid NOT NULL REFERENCES organization(entity_id),
    supplier_sku              text,
    supplier_sku_normalized   text GENERATED ALWAYS AS (NULLIF(lower(btrim(supplier_sku)), '')) STORED,
    title                     text NOT NULL,
    supplier_description      text,
    listing_status            text NOT NULL DEFAULT 'draft'
                              CHECK (listing_status IN ('draft', 'active', 'paused', 'deprecated', 'blocked')),
    source_record_id          uuid REFERENCES source_record(source_record_id),
    metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (supplier_entity_id, supplier_sku_normalized)
);

CREATE INDEX IF NOT EXISTS idx_listing_product
    ON product_listing(product_entity_id);

CREATE INDEX IF NOT EXISTS idx_listing_supplier
    ON product_listing(supplier_entity_id);

CREATE TABLE IF NOT EXISTS entity_attribute_value (
    attribute_value_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id                 uuid NOT NULL REFERENCES registry_entity(entity_id),
    attribute_definition_id   uuid NOT NULL REFERENCES attribute_definition(entity_id),
    value_text                text,
    value_numeric             numeric,
    value_boolean             boolean,
    value_json                jsonb,
    unit_entity_id            uuid REFERENCES unit(entity_id),
    normalized_value          text,
    source_record_id          uuid REFERENCES source_record(source_record_id),
    confidence                numeric(5, 4) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    status                    text NOT NULL DEFAULT 'active'
                              CHECK (status IN ('draft', 'active', 'deprecated', 'rejected')),
    valid_from                timestamptz,
    valid_to                  timestamptz,
    created_at                timestamptz NOT NULL DEFAULT now(),
    CHECK (
        value_text IS NOT NULL OR value_numeric IS NOT NULL OR value_boolean IS NOT NULL OR value_json IS NOT NULL
    ),
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_entity_attribute_lookup
    ON entity_attribute_value(entity_id, attribute_definition_id, status);

CREATE TABLE IF NOT EXISTS relationship_assertion (
    assertion_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_entity_id         uuid NOT NULL REFERENCES registry_entity(entity_id),
    predicate_code             text NOT NULL REFERENCES ontology_predicate(predicate_code),
    object_entity_id          uuid NOT NULL REFERENCES registry_entity(entity_id),
    context                   jsonb NOT NULL DEFAULT '{}'::jsonb,
    provenance                jsonb NOT NULL DEFAULT '{}'::jsonb,
    source_record_id          uuid REFERENCES source_record(source_record_id),
    method                    text NOT NULL DEFAULT 'manual'
                              CHECK (method IN ('manual', 'imported', 'model_inferred', 'steward_approved', 'system_generated')),
    confidence                numeric(5, 4) NOT NULL DEFAULT 1.0 CHECK (confidence BETWEEN 0 AND 1),
    status                    text NOT NULL DEFAULT 'active'
                              CHECK (status IN ('draft', 'active', 'deprecated', 'rejected')),
    valid_from                timestamptz,
    valid_to                  timestamptz,
    created_by_entity_id      uuid REFERENCES registry_entity(entity_id),
    created_at                timestamptz NOT NULL DEFAULT now(),
    CHECK (subject_entity_id <> object_entity_id),
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_relationship_subject
    ON relationship_assertion(subject_entity_id, predicate_code, status);

CREATE INDEX IF NOT EXISTS idx_relationship_object
    ON relationship_assertion(object_entity_id, predicate_code, status);

CREATE TABLE IF NOT EXISTS match_candidate (
    match_candidate_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entity_id          uuid NOT NULL REFERENCES registry_entity(entity_id),
    candidate_entity_id       uuid NOT NULL REFERENCES registry_entity(entity_id),
    match_type                text NOT NULL CHECK (match_type IN ('exact_identifier', 'exact_normalized', 'fuzzy', 'semantic', 'manual')),
    score                     numeric(5, 4) CHECK (score IS NULL OR score BETWEEN 0 AND 1),
    status                    text NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'accepted', 'rejected', 'superseded')),
    reason                    text,
    algorithm_version         text,
    reviewed_by_entity_id     uuid REFERENCES registry_entity(entity_id),
    reviewed_at               timestamptz,
    created_at                timestamptz NOT NULL DEFAULT now(),
    CHECK (source_entity_id <> candidate_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_match_queue
    ON match_candidate(status, score DESC);

CREATE TABLE IF NOT EXISTS merge_event (
    merge_event_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_entity_id            uuid NOT NULL REFERENCES registry_entity(entity_id),
    into_entity_id            uuid NOT NULL REFERENCES registry_entity(entity_id),
    reason                    text NOT NULL,
    evidence                  jsonb NOT NULL DEFAULT '{}'::jsonb,
    approved_by_entity_id     uuid REFERENCES registry_entity(entity_id),
    created_at                timestamptz NOT NULL DEFAULT now(),
    CHECK (from_entity_id <> into_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_merge_from
    ON merge_event(from_entity_id);

CREATE TABLE IF NOT EXISTS audit_event (
    audit_event_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id                 uuid REFERENCES registry_entity(entity_id),
    event_type                text NOT NULL,
    actor_entity_id           uuid REFERENCES registry_entity(entity_id),
    before_state              jsonb,
    after_state               jsonb,
    reason                    text,
    created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity_time
    ON audit_event(entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS outbox_event (
    outbox_event_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type            text NOT NULL,
    aggregate_id              uuid NOT NULL,
    event_type                text NOT NULL,
    payload                   jsonb NOT NULL,
    occurred_at               timestamptz NOT NULL DEFAULT now(),
    published_at              timestamptz,
    attempts                  integer NOT NULL DEFAULT 0 CHECK (attempts >= 0)
);

CREATE INDEX IF NOT EXISTS idx_outbox_unpublished
    ON outbox_event(published_at, occurred_at)
    WHERE published_at IS NULL;

CREATE OR REPLACE FUNCTION resolve_entity(p_entity_id uuid)
RETURNS TABLE (
    requested_entity_id uuid,
    resolved_entity_id uuid,
    resolved_status text
)
LANGUAGE sql
STABLE
AS $$
    WITH RECURSIVE entity_chain AS (
        SELECT
            e.entity_id AS current_entity_id,
            e.merged_into_entity_id AS next_entity_id,
            e.status AS current_status,
            ARRAY[e.entity_id]::uuid[] AS path
        FROM registry_entity e
        WHERE e.entity_id = p_entity_id

        UNION ALL

        SELECT
            e.entity_id AS current_entity_id,
            e.merged_into_entity_id AS next_entity_id,
            e.status AS current_status,
            c.path || e.entity_id
        FROM entity_chain c
        JOIN registry_entity e ON e.entity_id = c.next_entity_id
        WHERE c.next_entity_id IS NOT NULL
          AND NOT (e.entity_id = ANY(c.path))
    )
    SELECT
        p_entity_id,
        current_entity_id,
        current_status
    FROM entity_chain
    ORDER BY cardinality(path) DESC
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION resolve_identifier(
    p_namespace text,
    p_identifier_type text,
    p_identifier_value text
)
RETURNS TABLE (
    matched_entity_id uuid,
    resolved_entity_id uuid,
    entity_type text,
    entity_status text
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        i.entity_id,
        r.resolved_entity_id,
        e.entity_type,
        r.resolved_status
    FROM registry_identifier i
    JOIN registry_entity e ON e.entity_id = i.entity_id
    CROSS JOIN LATERAL resolve_entity(i.entity_id) r
    WHERE i.namespace = p_namespace
      AND i.identifier_type = p_identifier_type
      AND i.identifier_value_normalized = lower(btrim(p_identifier_value))
      AND i.is_active = true;
$$;

CREATE OR REPLACE VIEW active_product_catalog AS
SELECT
    p.entity_id AS product_entity_id,
    pe.canonical_name AS product_name,
    pe.status AS product_status,
    l.entity_id AS listing_entity_id,
    l.supplier_entity_id,
    l.supplier_sku,
    l.title AS listing_title,
    l.listing_status
FROM product p
JOIN registry_entity pe ON pe.entity_id = p.entity_id
LEFT JOIN product_listing l
    ON l.product_entity_id = p.entity_id
   AND l.listing_status = 'active'
WHERE pe.status = 'active';
