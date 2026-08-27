-- WAJENZI public reference data extension v0.3
-- Apply after registry_schema.sql and registry_schema_v02_extension.sql.
-- PostgreSQL 15+. PostGIS recommended.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS public_reference_source (
    source_system_id          uuid PRIMARY KEY REFERENCES source_system(source_system_id),
    source_code               text NOT NULL UNIQUE,
    authority_name            text NOT NULL,
    source_url                text NOT NULL,
    source_type               text NOT NULL,
    coverage                  jsonb NOT NULL DEFAULT '{}'::jsonb,
    vintage_or_period        text,
    licence_or_terms         text,
    attribution_text          text,
    update_policy             text,
    currentness_status        text NOT NULL DEFAULT 'unknown'
                              CHECK (currentness_status IN ('current', 'historical', 'versioned', 'unknown', 'restricted')),
    reuse_status               text NOT NULL DEFAULT 'review_required'
                              CHECK (reuse_status IN ('open', 'attribution_required', 'consent_required', 'review_required', 'unknown')),
    metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_reference_record (
    reference_record_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system_id          uuid NOT NULL REFERENCES source_system(source_system_id),
    external_record_id        text NOT NULL,
    record_type               text NOT NULL,
    entity_id                 uuid REFERENCES registry_entity(entity_id),
    document_entity_id        uuid REFERENCES registry_entity(entity_id),
    source_version            text,
    source_vintage            text,
    source_status              text NOT NULL DEFAULT 'unreviewed'
                              CHECK (source_status IN ('unreviewed', 'accepted_reference', 'accepted_operational', 'historical', 'rejected', 'superseded')),
    observed_at               timestamptz,
    retrieved_at              timestamptz NOT NULL DEFAULT now(),
    valid_from                timestamptz,
    valid_to                  timestamptz,
    source_hash               text,
    raw_payload               jsonb NOT NULL DEFAULT '{}'::jsonb,
    provenance_id             uuid,
    UNIQUE (source_system_id, external_record_id),
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_public_reference_record_type
    ON public_reference_record(record_type, source_status);

CREATE TABLE IF NOT EXISTS public_reference_geometry (
    reference_geometry_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_record_id       uuid NOT NULL REFERENCES public_reference_record(reference_record_id),
    geometry                  geometry(Geometry, 4326) NOT NULL,
    geometry_type             text NOT NULL,
    geometry_hash             text,
    crs                       text NOT NULL DEFAULT 'EPSG:4326',
    area_sqkm                 numeric,
    center_lat                numeric,
    center_lon                numeric,
    geometry_qa_status        text NOT NULL DEFAULT 'pending'
                              CHECK (geometry_qa_status IN ('pending', 'valid', 'invalid', 'manual_review')),
    UNIQUE (reference_record_id, geometry_hash)
);

CREATE INDEX IF NOT EXISTS idx_public_reference_geometry_gist
    ON public_reference_geometry USING gist (geometry);

CREATE TABLE IF NOT EXISTS public_reference_property (
    reference_property_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_record_id       uuid NOT NULL REFERENCES public_reference_record(reference_record_id),
    property_code             text NOT NULL,
    property_value_text       text,
    property_value_numeric    numeric,
    property_value_date       date,
    property_value_json       jsonb,
    UNIQUE (reference_record_id, property_code)
);

CREATE TABLE IF NOT EXISTS location_crosswalk (
    location_crosswalk_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_record_id          uuid NOT NULL REFERENCES public_reference_record(reference_record_id),
    target_record_id          uuid NOT NULL REFERENCES public_reference_record(reference_record_id),
    source_layer_code         text NOT NULL,
    target_layer_code         text NOT NULL,
    match_method              text NOT NULL,
    match_confidence          numeric(5, 4) NOT NULL CHECK (match_confidence BETWEEN 0 AND 1),
    review_status              text NOT NULL DEFAULT 'pending'
                              CHECK (review_status IN ('pending', 'accepted', 'rejected', 'manual_review')),
    review_note               text,
    evaluated_at              timestamptz NOT NULL DEFAULT now(),
    UNIQUE (source_record_id, target_record_id, source_layer_code, target_layer_code)
);

CREATE TABLE IF NOT EXISTS gazette_service_unit_reference (
    reference_record_id       uuid PRIMARY KEY REFERENCES public_reference_record(reference_record_id),
    unit_level                text NOT NULL
                              CHECK (unit_level IN ('service_delivery_subcounty', 'service_delivery_division', 'service_delivery_location', 'service_delivery_sublocation')),
    unit_name                 text NOT NULL,
    raw_name                  text,
    parent_county_name        text,
    parent_unit_name          text,
    headquarters_name         text,
    rename_note               text,
    notice_number             text NOT NULL,
    notice_date               date NOT NULL,
    publication_section       text,
    source_status             text NOT NULL,
    activation_status         text NOT NULL DEFAULT 'unconfirmed'
                              CHECK (activation_status IN ('unconfirmed', 'active', 'inactive', 'superseded', 'historical')),
    parent_match_status       text NOT NULL DEFAULT 'unresolved'
                              CHECK (parent_match_status IN ('gazette_context', 'matched_reference', 'ambiguous_reference', 'unresolved'))
);

CREATE TABLE IF NOT EXISTS market_reference_observation (
    market_reference_observation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_record_id       uuid NOT NULL REFERENCES public_reference_record(reference_record_id),
    category_code             text,
    category_name             text NOT NULL,
    item_code                 text NOT NULL,
    item_name                 text NOT NULL,
    specification             text,
    unit_of_measure           text,
    quantity_basis            numeric,
    sample_place_name         text NOT NULL,
    sample_place_record_id    uuid REFERENCES public_reference_record(reference_record_id),
    observed_price_amount     numeric NOT NULL CHECK (observed_price_amount >= 0),
    currency_code             char(3) NOT NULL,
    survey_start              date,
    survey_end                date,
    publication_period        text,
    statistic_type            text NOT NULL DEFAULT 'geometric_mean',
    price_status              text NOT NULL DEFAULT 'indicative_reference'
                              CHECK (price_status IN ('indicative_reference', 'live_quote', 'historical', 'superseded')),
    confidence                numeric(5, 4) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    UNIQUE (reference_record_id, item_code, sample_place_name)
);

CREATE INDEX IF NOT EXISTS idx_market_reference_item_place
    ON market_reference_observation(item_code, sample_place_name, survey_end DESC);

CREATE TABLE IF NOT EXISTS cost_index_observation (
    cost_index_observation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_record_id       uuid NOT NULL REFERENCES public_reference_record(reference_record_id),
    series_code               text NOT NULL,
    series_name               text NOT NULL,
    item_code                 text,
    item_name                 text NOT NULL,
    construction_domain       text NOT NULL
                              CHECK (construction_domain IN ('overall', 'building', 'civil_engineering', 'materials', 'equipment', 'transport_fuel', 'labour')),
    period                    text NOT NULL,
    base_period               text NOT NULL,
    weight                    numeric,
    index_value               numeric NOT NULL,
    publication_date          date,
    source_status             text NOT NULL DEFAULT 'official_macro_reference'
                              CHECK (source_status IN ('official_macro_reference', 'historical', 'superseded')),
    UNIQUE (reference_record_id, series_code, item_code, period)
);

CREATE INDEX IF NOT EXISTS idx_cost_index_series_period
    ON cost_index_observation(series_code, period);

CREATE TABLE IF NOT EXISTS procurement_award_reference (
    procurement_award_reference_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_record_id       uuid NOT NULL REFERENCES public_reference_record(reference_record_id),
    tender_number             text,
    procuring_entity_name     text,
    awarded_supplier_name     text,
    supplier_registration_number text,
    contract_value_amount     numeric,
    currency_code             char(3),
    award_date                date,
    project_or_scope          text,
    source_period             text,
    director_disclosure       jsonb NOT NULL DEFAULT '{}'::jsonb,
    source_status             text NOT NULL DEFAULT 'historical_enrichment'
                              CHECK (source_status IN ('historical_enrichment', 'current_reference', 'superseded', 'manual_review'))
);

-- Seed source-system rows. Source metadata is completed by public-data-source-manifest.json.
INSERT INTO source_system (source_code, display_name, source_type)
VALUES
    ('HDX_COD_AB_KE', 'HDX Kenya COD-AB / IEBC Admin 0-2', 'api'),
    ('HDX_ARC_WARDS_1450', 'HDX American Red Cross Kenya Wards 1450', 'api'),
    ('GBO_OPEN_KEN_ADM3', 'geoBoundaries Open Kenya ADM3', 'api'),
    ('KE_GAZETTE_15341_2024', 'Kenya Gazette Notice 15341 of 2024', 'document'),
    ('PCK_POST_OFFICE_LOCATOR', 'Postal Corporation of Kenya Post Office Locator', 'api'),
    ('KRB_RICS_2018_2023', 'Kenya Roads Board RICS Portal', 'api'),
    ('GEOFABRIK_OSM_KENYA', 'Geofabrik OpenStreetMap Kenya Extract', 'api'),
    ('NCA_BUILDING_CODE_2024', 'NCA National Building Code 2024', 'document'),
    ('NCA_PROJECT_REGISTRATION', 'NCA Project Registration Workflow', 'document'),
    ('NEMA_EIA_EA', 'NEMA EIA and Environmental Audit Regulations', 'document'),
    ('PPRA_STD_2021_2022', 'PPRA Standard Tender Documents', 'document'),
    ('PPRA_PPIP_AWARDS', 'PPRA Public Procurement Information Portal Awards', 'api'),
    ('PPRA_MRG_APRIL_2026', 'PPRA Market Reference Guide April 2026', 'document'),
    ('KNBS_CIPI_Q2_2026', 'KNBS Construction Input Price Indices Q2 2026', 'document')
ON CONFLICT (source_code) DO NOTHING;

-- Public reference source rows should be inserted/updated from the machine-readable manifest.
COMMENT ON TABLE public_reference_record IS 'External public data record. It may point to a canonical registry entity but never becomes canonical solely by ingestion.';
COMMENT ON TABLE location_crosswalk IS 'Versioned source-to-source mapping. Low-confidence or unmatched records remain visible for manual review.';
COMMENT ON TABLE market_reference_observation IS 'PPRA sampled indicative reference prices; never overwrite live supplier PriceObservation records.';
COMMENT ON TABLE cost_index_observation IS 'KNBS macro cost indices; never overwrite item-level supplier prices or negotiated contract rates.';
