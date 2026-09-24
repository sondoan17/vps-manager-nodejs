-- Docker v2 overview cutover: additive nullable columns carrying the wrapper
-- overview fields and per-container identity the dashboard reads. No drops.
ALTER TABLE docker_ingest_latest ADD COLUMN IF NOT EXISTS available boolean;
ALTER TABLE docker_ingest_latest ADD COLUMN IF NOT EXISTS error_code text;
ALTER TABLE docker_ingest_latest ADD COLUMN IF NOT EXISTS engine_version text;
ALTER TABLE docker_ingest_latest ADD COLUMN IF NOT EXISTS api_version text;
ALTER TABLE docker_metric_samples ADD COLUMN IF NOT EXISTS image text;
ALTER TABLE docker_metric_samples ADD COLUMN IF NOT EXISTS status text;
