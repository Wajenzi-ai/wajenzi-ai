-- WAJENZI master canonical catalogue bootstrap loader v0.4
-- Run from /home/ubuntu/wajenzi-foundation after applying:
-- registry_schema.sql, seed.sql, registry_schema_v02_extension.sql,
-- registry_schema_v03_public_data.sql, registry_schema_v04_canonical_catalogue.sql
-- Example: psql "$DATABASE_URL" -f registry_master_catalogue_bootstrap.sql

BEGIN;

CREATE TEMP TABLE stage_master_products (
    canonical_entity_id uuid,
    canonical_entity_type text,
    canonical_status text,
    source_system text,
    source_row_id text,
    source_sku text,
    source_type text,
    canonical_name text,
    published text,
    catalog_visibility text,
    tax_status text,
    source_in_stock text,
    canonical_brand_external text,
    product_family_external text,
    categories text,
    tags text,
    unit_of_measure_external text,
    pack_size_value_external text,
    pack_size_unit_external text,
    pack_size_text_external text,
    weight_kg text,
    length_cm text,
    width_cm text,
    height_cm text,
    thickness_mm text,
    diameter_value text,
    diameter_unit text,
    omniclass_code text,
    masterformat_code text,
    uniformat_code text,
    etim_code text,
    icms_code text,
    source_content_hash text
);
\copy stage_master_products FROM 'canonical_products_seed.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

CREATE TEMP TABLE stage_master_variants (
    canonical_variant_entity_id uuid,
    canonical_entity_type text,
    canonical_status text,
    source_system text,
    source_row_id text,
    source_sku text,
    source_parent_ref text,
    parent_resolution_method text,
    parent_product_entity_id uuid,
    parent_product_source_row_id text,
    canonical_name text,
    attribute_1_name text,
    attribute_1_value text,
    attribute_2_name text,
    attribute_2_value text,
    unit_of_measure_external text,
    pack_size_value_external text,
    pack_size_unit_external text,
    pack_size_text_external text,
    weight_kg text,
    length_cm text,
    width_cm text,
    height_cm text,
    thickness_mm text,
    diameter_value text,
    diameter_unit text,
    omniclass_code text,
    masterformat_code text,
    uniformat_code text,
    etim_code text,
    icms_code text,
    source_content_hash text
);
\copy stage_master_variants FROM 'canonical_variants_seed.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

INSERT INTO source_system (source_code, display_name, source_type)
VALUES ('wajenzi-master-catalogue-v1', 'WAJENZI Master Canonical Product Catalogue', 'system')
ON CONFLICT (source_code) DO NOTHING;

INSERT INTO catalogue_authority (source_system_id, catalogue_code, display_name, catalogue_role, is_authoritative, authority_scope, identity_policy)
SELECT source_system_id, 'wajenzi-master-catalogue-v1', 'WAJENZI Master Canonical Product Catalogue', 'master_canonical', true,
       'product_identity_and_initial_taxonomy',
       '{"supplier_submissions_must_match_before_creation":true,"supplier_commercial_fields_do_not_overwrite_identity":true,"variation_parent_resolution":["unique_sku","source_row_id_fallback"],"new_canonical_requires_approval":true}'::jsonb
FROM source_system WHERE source_code = 'wajenzi-master-catalogue-v1'
ON CONFLICT (catalogue_code) DO UPDATE SET is_authoritative = true;

INSERT INTO source_import_batch (source_system_id, source_file_name, source_file_hash, status, records_seen, metadata)
SELECT source_system_id, 'WAJENZI_EXTERNAL_SOURCE_ENRICHED_PRODUCTS.csv',
       'a2dce190d71fc428b11c11419828cac133d852f2f0d26aedef83859bdcb930a1',
       'completed', 13180,
       '{"catalogue_role":"master_canonical","bootstrap_version":"0.4.0"}'::jsonb
FROM source_system WHERE source_code = 'wajenzi-master-catalogue-v1'
  AND NOT EXISTS (
      SELECT 1 FROM source_import_batch sib
      WHERE sib.source_file_hash = 'a2dce190d71fc428b11c11419828cac133d852f2f0d26aedef83859bdcb930a1'
  );

INSERT INTO catalogue_import_batch (
    catalogue_authority_id, import_batch_id, source_file_name, source_file_hash, schema_version,
    idempotency_key, import_mode, status, rows_seen, roots_created, variants_created, metadata
)
SELECT ca.catalogue_authority_id,
       sib.import_batch_id,
       'WAJENZI_EXTERNAL_SOURCE_ENRICHED_PRODUCTS.csv',
       'a2dce190d71fc428b11c11419828cac133d852f2f0d26aedef83859bdcb930a1',
       'woocommerce_export_118_columns',
       'wajenzi-master-catalogue-v1:a2dce190d71fc428b11c11419828cac133d852f2f0d26aedef83859bdcb930a1',
       'bootstrap_master', 'validated', 13180, 12663, 517,
       '{"source_row_parent_resolution":{"unique_parent_sku":448,"source_row_id_fallback":69}}'::jsonb
FROM catalogue_authority ca
JOIN source_system ss ON ss.source_system_id = ca.source_system_id
JOIN source_import_batch sib ON sib.source_system_id = ss.source_system_id
WHERE ca.catalogue_code = 'wajenzi-master-catalogue-v1'
  AND sib.source_file_hash = 'a2dce190d71fc428b11c11419828cac133d852f2f0d26aedef83859bdcb930a1'
ON CONFLICT (idempotency_key) DO NOTHING;

-- Each source row is retained. The raw payload is represented by the staged canonical fields;
-- the full CSV row should also be archived in object storage for production ingestion.
INSERT INTO source_record (source_system_id, import_batch_id, external_record_id, record_type, raw_payload, content_hash)
SELECT ss.source_system_id, sib.import_batch_id, p.source_row_id, 'master_product_row',
       jsonb_build_object('source_sku', p.source_sku, 'source_type', p.source_type, 'name', p.canonical_name, 'categories', p.categories, 'masterformat_code', p.masterformat_code, 'etim_code', p.etim_code),
       p.source_content_hash
FROM stage_master_products p
JOIN source_system ss ON ss.source_code = 'wajenzi-master-catalogue-v1'
JOIN source_import_batch sib ON sib.source_system_id = ss.source_system_id
WHERE sib.source_file_hash = 'a2dce190d71fc428b11c11419828cac133d852f2f0d26aedef83859bdcb930a1'
ON CONFLICT (source_system_id, external_record_id) DO NOTHING;

INSERT INTO source_record (source_system_id, import_batch_id, external_record_id, record_type, raw_payload, content_hash)
SELECT ss.source_system_id, sib.import_batch_id, v.source_row_id, 'master_variant_row',
       jsonb_build_object('source_sku', v.source_sku, 'source_type', 'variation', 'parent_ref', v.source_parent_ref, 'name', v.canonical_name, 'attribute_1_name', v.attribute_1_name, 'attribute_1_value', v.attribute_1_value, 'attribute_2_name', v.attribute_2_name, 'attribute_2_value', v.attribute_2_value),
       v.source_content_hash
FROM stage_master_variants v
JOIN source_system ss ON ss.source_code = 'wajenzi-master-catalogue-v1'
JOIN source_import_batch sib ON sib.source_system_id = ss.source_system_id
WHERE sib.source_file_hash = 'a2dce190d71fc428b11c11419828cac133d852f2f0d26aedef83859bdcb930a1'
ON CONFLICT (source_system_id, external_record_id) DO NOTHING;

-- Canonical roots use the deterministic bootstrap IDs generated from the source catalogue.
INSERT INTO registry_entity (entity_id, entity_type, canonical_name, status, metadata)
SELECT canonical_entity_id, 'Product', canonical_name, 'active',
       jsonb_build_object('canonical_status', 'master_canonical', 'source_system', source_system, 'source_row_id', source_row_id, 'source_type', source_type, 'categories', categories, 'source_content_hash', source_content_hash)
FROM stage_master_products
ON CONFLICT (entity_id) DO UPDATE
SET canonical_name = EXCLUDED.canonical_name,
    metadata = registry_entity.metadata || EXCLUDED.metadata,
    updated_at = now();

INSERT INTO product (entity_id, canonical_description, metadata)
SELECT canonical_entity_id, canonical_name,
       jsonb_build_object('master_source_row_id', source_row_id, 'canonical_brand_external', canonical_brand_external, 'product_family_external', product_family_external, 'unit_of_measure_external', unit_of_measure_external, 'pack_size_text_external', pack_size_text_external, 'classification', jsonb_build_object('omniclass', omniclass_code, 'masterformat', masterformat_code, 'uniformat', uniformat_code, 'etim', etim_code, 'icms', icms_code))
FROM stage_master_products
ON CONFLICT (entity_id) DO UPDATE SET metadata = product.metadata || EXCLUDED.metadata;

INSERT INTO registry_identifier (entity_id, namespace, identifier_type, identifier_value, is_preferred, source_record_id)
SELECT p.canonical_entity_id, 'wajenzi-master-catalogue-v1', 'source_row_id', p.source_row_id, true, sr.source_record_id
FROM stage_master_products p
JOIN source_system ss ON ss.source_code = p.source_system
JOIN source_record sr ON sr.source_system_id = ss.source_system_id AND sr.external_record_id = p.source_row_id
ON CONFLICT (namespace, identifier_type, identifier_value_normalized) DO NOTHING;

-- Only unique nonempty master SKUs become registry identifiers. Duplicate SKUs remain in source metadata.
WITH sku_counts AS (
    SELECT source_sku, count(*) AS n
    FROM stage_master_products
    WHERE btrim(source_sku) <> ''
    GROUP BY source_sku
)
INSERT INTO registry_identifier (entity_id, namespace, identifier_type, identifier_value, is_preferred)
SELECT p.canonical_entity_id, 'wajenzi-master-catalogue-v1', 'master_sku', p.source_sku, false
FROM stage_master_products p
JOIN sku_counts sc ON sc.source_sku = p.source_sku AND sc.n = 1
ON CONFLICT (namespace, identifier_type, identifier_value_normalized) DO NOTHING;

INSERT INTO master_product_record (catalogue_authority_id, catalogue_import_batch_id, source_record_id, source_row_id, source_sku, source_type, canonical_entity_id, source_content_hash, master_status)
SELECT ca.catalogue_authority_id, cib.catalogue_import_batch_id, sr.source_record_id, p.source_row_id, NULLIF(p.source_sku, ''), p.source_type, p.canonical_entity_id, p.source_content_hash, 'published'
FROM stage_master_products p
JOIN catalogue_authority ca ON ca.catalogue_code = p.source_system
JOIN catalogue_import_batch cib ON cib.catalogue_authority_id = ca.catalogue_authority_id
JOIN source_system ss ON ss.source_code = p.source_system
JOIN source_record sr ON sr.source_system_id = ss.source_system_id AND sr.external_record_id = p.source_row_id
WHERE cib.idempotency_key = 'wajenzi-master-catalogue-v1:a2dce190d71fc428b11c11419828cac133d852f2f0d26aedef83859bdcb930a1'
ON CONFLICT (catalogue_authority_id, source_row_id) DO UPDATE SET canonical_entity_id = EXCLUDED.canonical_entity_id, master_status = 'published';

-- Canonical variants are created only after parent resolution.
INSERT INTO registry_entity (entity_id, entity_type, canonical_name, status, metadata)
SELECT v.canonical_variant_entity_id, 'ProductVariant', v.canonical_name, 'active',
       jsonb_build_object('canonical_status', 'master_canonical', 'source_system', v.source_system, 'source_row_id', v.source_row_id, 'source_parent_ref', v.source_parent_ref, 'parent_resolution_method', v.parent_resolution_method, 'source_content_hash', v.source_content_hash)
FROM stage_master_variants v
WHERE v.parent_product_entity_id IS NOT NULL
ON CONFLICT (entity_id) DO UPDATE SET canonical_name = EXCLUDED.canonical_name, metadata = registry_entity.metadata || EXCLUDED.metadata, updated_at = now();

INSERT INTO product_variant (entity_id, product_entity_id, sku, pack_size, metadata)
SELECT v.canonical_variant_entity_id, v.parent_product_entity_id,
       NULLIF(v.source_sku, ''), NULLIF(v.pack_size_value_external, '')::numeric,
       jsonb_build_object('master_source_row_id', v.source_row_id, 'source_parent_ref', v.source_parent_ref, 'parent_resolution_method', v.parent_resolution_method, 'attribute_1', jsonb_build_object('name', v.attribute_1_name, 'value', v.attribute_1_value), 'attribute_2', jsonb_build_object('name', v.attribute_2_name, 'value', v.attribute_2_value), 'unit_of_measure_external', v.unit_of_measure_external, 'pack_size_unit_external', v.pack_size_unit_external, 'pack_size_text_external', v.pack_size_text_external, 'classification', jsonb_build_object('omniclass', v.omniclass_code, 'masterformat', v.masterformat_code, 'uniformat', v.uniformat_code, 'etim', v.etim_code, 'icms', v.icms_code))
FROM stage_master_variants v
WHERE v.parent_product_entity_id IS NOT NULL
ON CONFLICT (entity_id) DO UPDATE SET metadata = product_variant.metadata || EXCLUDED.metadata;

INSERT INTO registry_identifier (entity_id, namespace, identifier_type, identifier_value, is_preferred, source_record_id)
SELECT v.canonical_variant_entity_id, 'wajenzi-master-catalogue-v1', 'source_row_id', v.source_row_id, true, sr.source_record_id
FROM stage_master_variants v
JOIN source_system ss ON ss.source_code = v.source_system
JOIN source_record sr ON sr.source_system_id = ss.source_system_id AND sr.external_record_id = v.source_row_id
ON CONFLICT (namespace, identifier_type, identifier_value_normalized) DO NOTHING;

INSERT INTO master_product_record (catalogue_authority_id, catalogue_import_batch_id, source_record_id, source_row_id, source_sku, source_type, canonical_entity_id, parent_source_row_id, parent_resolution_method, source_content_hash, master_status)
SELECT ca.catalogue_authority_id, cib.catalogue_import_batch_id, sr.source_record_id, v.source_row_id, NULLIF(v.source_sku, ''), 'variation', v.canonical_variant_entity_id, v.parent_product_source_row_id, v.parent_resolution_method, v.source_content_hash, 'published'
FROM stage_master_variants v
JOIN catalogue_authority ca ON ca.catalogue_code = v.source_system
JOIN catalogue_import_batch cib ON cib.catalogue_authority_id = ca.catalogue_authority_id
JOIN source_system ss ON ss.source_code = v.source_system
JOIN source_record sr ON sr.source_system_id = ss.source_system_id AND sr.external_record_id = v.source_row_id
WHERE v.parent_product_entity_id IS NOT NULL
ON CONFLICT (catalogue_authority_id, source_row_id) DO UPDATE SET canonical_entity_id = EXCLUDED.canonical_entity_id, parent_source_row_id = EXCLUDED.parent_source_row_id, parent_resolution_method = EXCLUDED.parent_resolution_method, master_status = 'published';

UPDATE catalogue_import_batch
SET status = 'loaded', completed_at = now()
WHERE idempotency_key = 'wajenzi-master-catalogue-v1:a2dce190d71fc428b11c11419828cac133d852f2f0d26aedef83859bdcb930a1';

COMMIT;
