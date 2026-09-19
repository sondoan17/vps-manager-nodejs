-- Metric identity is part of observed-only rollup uniqueness.  The default
-- keeps legacy rows readable while allowing new metric-specific rows.
ALTER TABLE docker_metric_rollups
  ADD COLUMN IF NOT EXISTS metric_name text NOT NULL DEFAULT 'legacy';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'docker_metric_rollups_metric_name_nonempty'
  ) THEN
    ALTER TABLE docker_metric_rollups
      ADD CONSTRAINT docker_metric_rollups_metric_name_nonempty
      CHECK (length(btrim(metric_name)) > 0);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS docker_metric_rollups_metric_name_idx
  ON docker_metric_rollups (vps_id, metric_name, bucket_start DESC, id DESC);
DROP INDEX IF EXISTS docker_metric_rollups_dedupe_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS docker_metric_rollups_dedupe_uidx
  ON docker_metric_rollups (vps_id, agent_instance_id, scope, COALESCE(container_key, ''), bucket_start, formula_version, metric_name, COALESCE(cohort_digest, ''));
