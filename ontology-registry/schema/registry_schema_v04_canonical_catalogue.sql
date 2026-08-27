-- WAJENZI canonical master catalogue and supplier canonicalization extension v0.4
-- Apply after registry_schema.sql and registry_schema_v02_extension.sql.
-- Apply registry_schema_v03_public_data.sql separately when public reference tables are needed.

CREATE TABLE IF NOT EXISTS catalogue_authority (
    catalogue_authority_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system_id          uuid NOT NULL REFERENCES source_system(source_system_id),
    catalogue_code            text NOT NULL UNIQUE,
    display_name              text NOT NULL,
    catalogue_role            text NOT NULL
                              CHECK (catalogue_role IN ('master_canonical', 'supplier_source', 'reference_only')),
    is_authoritative           boolean NOT NULL DEFAULT false,
    authority_scope            text NOT NULL DEFAULT 'product_identity',
    identity_policy            jsonb NOT NULL DEFAULT '{}'::jsonb,
    valid_from                timestamptz,
    valid_to                  timestamptz,
    metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb,
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_master_catalogue
    ON catalogue_authority (catalogue_role)
    WHERE catalogue_role = 'master_canonical' AND is_authoritative;

CREATE TABLE IF NOT EXISTS catalogue_import_batch (
    catalogue_import_batch_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    catalogue_authority_id    uuid NOT NULL REFERENCES catalogue_authority(catalogue_authority_id),
    import_batch_id            uuid REFERENCES source_import_batch(import_batch_id),
    source_file_name           text NOT NULL,
    source_file_hash           text NOT NULL,
    schema_version             text NOT NULL,
    idempotency_key            text NOT NULL UNIQUE,
    import_mode                text NOT NULL
                              CHECK (import_mode IN ('bootstrap_master', 'master_refresh', 'supplier_submission')),
    status                     text NOT NULL DEFAULT 'staged'
                              CHECK (status IN ('staged', 'validated', 'loaded', 'partially_loaded', 'failed', 'rolled_back')),
    rows_seen                 integer NOT NULL DEFAULT 0 CHECK (rows_seen >= 0),
    roots_created             integer NOT NULL DEFAULT 0 CHECK (roots_created >= 0),
    variants_created          integer NOT NULL DEFAULT 0 CHECK (variants_created >= 0),
    review_count              integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    error_count               integer NOT NULL DEFAULT 0 CHECK (error_count >= 0),
    started_at                timestamptz NOT NULL DEFAULT now(),
    completed_at              timestamptz,
    metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS master_product_record (
    master_product_record_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    catalogue_authority_id    uuid NOT NULL REFERENCES catalogue_authority(catalogue_authority_id),
    catalogue_import_batch_id uuid NOT NULL REFERENCES catalogue_import_batch(catalogue_import_batch_id),
    source_record_id          uuid NOT NULL REFERENCES source_record(source_record_id),
    source_row_id             text NOT NULL,
    source_sku                text,
    source_type               text NOT NULL CHECK (source_type IN ('simple', 'variable', 'variation')),
    canonical_entity_id       uuid REFERENCES registry_entity(entity_id),
    parent_source_row_id      text,
    parent_resolution_method  text,
    source_content_hash       text NOT NULL,
    master_status             text NOT NULL DEFAULT 'accepted'
                              CHECK (master_status IN ('staged', 'accepted', 'published', 'deprecated', 'quarantined')),
    created_at                timestamptz NOT NULL DEFAULT now(),
    UNIQUE (catalogue_authority_id, source_row_id),
    UNIQUE (catalogue_import_batch_id, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_master_product_record_entity
    ON master_product_record(canonical_entity_id);

CREATE TABLE IF NOT EXISTS master_product_attribute_evidence (
    master_product_attribute_evidence_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    master_product_record_id uuid NOT NULL REFERENCES master_product_record(master_product_record_id),
    attribute_code            text NOT NULL,
    value_text                text,
    value_numeric             numeric,
    value_json                jsonb,
    source_column              text,
    evidence_confidence       numeric(5, 4) CHECK (evidence_confidence IS NULL OR evidence_confidence BETWEEN 0 AND 1),
    UNIQUE (master_product_record_id, attribute_code)
);

CREATE TABLE IF NOT EXISTS supplier_product_submission (
    supplier_product_submission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_organization_id   uuid NOT NULL REFERENCES organization(entity_id),
    source_record_id           uuid NOT NULL REFERENCES source_record(source_record_id),
    submission_batch_id        uuid REFERENCES source_import_batch(import_batch_id),
    supplier_sku               text,
    title                      text NOT NULL,
    brand_text                 text,
    manufacturer_part_number   text,
    barcode                    text,
    product_type_text          text,
    category_path              text,
    unit_of_sale               text,
    pack_size_value            numeric,
    pack_size_unit             text,
    specification              jsonb NOT NULL DEFAULT '{}'::jsonb,
    dimensions                jsonb NOT NULL DEFAULT '{}'::jsonb,
    claimed_wajenzi_entity_id  uuid REFERENCES registry_entity(entity_id),
    submission_status          text NOT NULL DEFAULT 'received'
                               CHECK (submission_status IN ('received', 'validated', 'candidate_matching', 'matched', 'new_candidate', 'review_required', 'rejected', 'superseded')),
    received_at                timestamptz NOT NULL DEFAULT now(),
    metadata                   jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_submission_supplier_sku
    ON supplier_product_submission(supplier_organization_id, supplier_sku);

CREATE TABLE IF NOT EXISTS canonicalization_candidate (
    canonicalization_candidate_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_product_submission_id uuid NOT NULL REFERENCES supplier_product_submission(supplier_product_submission_id),
    candidate_product_entity_id uuid REFERENCES product(entity_id),
    candidate_variant_entity_id uuid REFERENCES product_variant(entity_id),
    match_method               text NOT NULL
                               CHECK (match_method IN ('authorized_entity_id', 'exact_gtin', 'exact_manufacturer_part_number', 'exact_identity_key', 'classification_and_attributes', 'fuzzy_discovery', 'no_candidate')),
    match_score                numeric(5, 4) CHECK (match_score IS NULL OR match_score BETWEEN 0 AND 1),
    identity_key               text,
    matched_fields             jsonb NOT NULL DEFAULT '{}'::jsonb,
    conflicting_fields         jsonb NOT NULL DEFAULT '{}'::jsonb,
    evidence                   jsonb NOT NULL DEFAULT '{}'::jsonb,
    algorithm_version          text,
    candidate_status            text NOT NULL DEFAULT 'proposed'
                               CHECK (candidate_status IN ('proposed', 'shortlisted', 'accepted', 'rejected', 'superseded', 'review_required')),
    created_at                 timestamptz NOT NULL DEFAULT now(),
    UNIQUE (supplier_product_submission_id, candidate_product_entity_id, candidate_variant_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_canonical_candidate_submission
    ON canonicalization_candidate(supplier_product_submission_id, candidate_status, match_score DESC);

CREATE TABLE IF NOT EXISTS canonicalization_decision (
    canonicalization_decision_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_product_submission_id uuid NOT NULL UNIQUE REFERENCES supplier_product_submission(supplier_product_submission_id),
    selected_candidate_id       uuid REFERENCES canonicalization_candidate(canonicalization_candidate_id),
    outcome                     text NOT NULL
                               CHECK (outcome IN ('matched_existing_product', 'matched_existing_variant', 'review_required', 'new_canonical_product', 'new_canonical_variant', 'rejected')),
    created_entity_id           uuid REFERENCES registry_entity(entity_id),
    decided_by_entity_id        uuid REFERENCES registry_entity(entity_id),
    decision_reason             text NOT NULL,
    decision_evidence           jsonb NOT NULL DEFAULT '{}'::jsonb,
    algorithm_version           text,
    decided_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_identity_key (
    product_identity_key_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_entity_id           uuid REFERENCES product(entity_id),
    product_variant_entity_id   uuid REFERENCES product_variant(entity_id),
    key_type                    text NOT NULL
                               CHECK (key_type IN ('gtin', 'manufacturer_part_number', 'normalized_identity', 'classification_identity', 'supplier_claimed')),
    namespace                   text NOT NULL,
    key_value                   text NOT NULL,
    normalized_key_value        text NOT NULL,
    source_record_id            uuid REFERENCES source_record(source_record_id),
    confidence                  numeric(5, 4) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    status                      text NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'deprecated', 'conflicted', 'review_required')),
    UNIQUE (namespace, key_type, normalized_key_value),
    CHECK ((product_entity_id IS NOT NULL) <> (product_variant_entity_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_product_identity_key_lookup
    ON product_identity_key(key_type, normalized_key_value, status);

-- The attached WAJENZI catalogue is the authoritative master source for product identity.
INSERT INTO source_system (source_code, display_name, source_type)
VALUES ('wajenzi-master-catalogue-v1', 'WAJENZI Master Canonical Product Catalogue', 'system')
ON CONFLICT (source_code) DO NOTHING;

INSERT INTO catalogue_authority (source_system_id, catalogue_code, display_name, catalogue_role, is_authoritative, authority_scope, identity_policy)
SELECT source_system_id,
       'wajenzi-master-catalogue-v1',
       'WAJENZI Master Canonical Product Catalogue',
       'master_canonical',
       true,
       'product_identity_and_initial_taxonomy',
       '{"supplier_submissions_must_match_before_creation":true,"supplier_commercial_fields_do_not_overwrite_identity":true,"variation_parent_resolution":["unique_sku","source_row_id_fallback"],"new_canonical_requires_approval":true}'::jsonb
FROM source_system
WHERE source_code = 'wajenzi-master-catalogue-v1'
ON CONFLICT (catalogue_code) DO UPDATE
SET is_authoritative = EXCLUDED.is_authoritative,
    identity_policy = EXCLUDED.identity_policy;

COMMENT ON TABLE master_product_record IS 'Namespaced source-row map for the WAJENZI master catalogue. Source row ID is not the same as the opaque registry entity ID.';
COMMENT ON TABLE supplier_product_submission IS 'Supplier evidence and commercial submission. It is not canonical identity.';
COMMENT ON TABLE canonicalization_candidate IS 'Candidate match evidence; a candidate is not an accepted match until a decision is recorded.';
COMMENT ON TABLE canonicalization_decision IS 'Authoritative outcome for supplier canonicalization: attach, review, create, or reject.';
COMMENT ON TABLE product_identity_key IS 'Identity-bearing lookup keys; classification and normalized text may aid discovery but cannot alone force a merge.';
