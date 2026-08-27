-- WAJENZI query-readiness extension v0.5
-- Apply after registry_schema_v04_canonical_catalogue.sql.
-- This patch supports queries requiring verified stock and comparable prices.

ALTER TABLE availability_observation
    ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
    ADD COLUMN IF NOT EXISTS verification_evidence_id uuid REFERENCES registry_entity(entity_id),
    ADD COLUMN IF NOT EXISTS verified_by_entity_id uuid REFERENCES registry_entity(entity_id),
    ADD COLUMN IF NOT EXISTS verified_at timestamptz;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'availability_observation_verification_status_check'
    ) THEN
        ALTER TABLE availability_observation
            ADD CONSTRAINT availability_observation_verification_status_check
            CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected', 'expired'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_availability_verified_fresh
    ON availability_observation(product_offer_entity_id, verification_status, observed_at DESC);

ALTER TABLE price_observation
    ADD COLUMN IF NOT EXISTS comparison_amount numeric,
    ADD COLUMN IF NOT EXISTS comparison_currency_code char(3),
    ADD COLUMN IF NOT EXISTS comparison_unit_entity_id uuid REFERENCES unit(entity_id),
    ADD COLUMN IF NOT EXISTS comparison_basis text,
    ADD COLUMN IF NOT EXISTS normalization_method text,
    ADD COLUMN IF NOT EXISTS normalization_evidence_id uuid REFERENCES registry_entity(entity_id);

ALTER TABLE price_observation
    DROP CONSTRAINT IF EXISTS price_observation_comparison_amount_check;
ALTER TABLE price_observation
    ADD CONSTRAINT price_observation_comparison_amount_check
    CHECK (comparison_amount IS NULL OR comparison_amount >= 0);

CREATE INDEX IF NOT EXISTS idx_price_comparable_variant_time
    ON price_observation(variant_entity_id, comparison_currency_code, comparison_unit_entity_id, observed_at DESC);

COMMENT ON COLUMN availability_observation.verification_status IS 'Verification state of stock evidence; available does not mean verified by itself.';
COMMENT ON COLUMN availability_observation.verification_evidence_id IS 'Evidence supporting the stock verification decision.';
COMMENT ON COLUMN price_observation.comparison_amount IS 'Amount normalized for a declared comparison basis; never infer comparability from raw amount alone.';
COMMENT ON COLUMN price_observation.normalization_method IS 'Versioned method used to normalize pack, unit, currency, and tax basis for comparison.';
