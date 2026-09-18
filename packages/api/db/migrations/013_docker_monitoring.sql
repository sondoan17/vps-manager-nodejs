-- Docker monitoring I1 relational foundation. Ordinary PostgreSQL only
-- (no Timescale functions). Explicit null semantics: nullable columns omit
-- NOT NULL; all other columns are NOT NULL. Nullable dedupe keys use
-- COALESCE() unique indexes so NULL behaves as a single empty value.
-- Explicit CHECK constraints below enforce host/container, rollup
-- scope/null/cohort, and alert instance/key semantics plus bounded
-- structural rules (non-empty keys, non-negative counters, 0..1 coverage,
-- window ordering, jsonb object/array shapes). Inner JSON payloads are only
-- shape-checked (object/array), never deep-validated.
CREATE TABLE IF NOT EXISTS docker_metric_samples (
  id text PRIMARY KEY,
  vps_id text NOT NULL REFERENCES vps(id) ON DELETE CASCADE,
  agent_instance_id text NOT NULL,
  snapshot_id text NOT NULL,
  container_key text,
  name text,
  state text,
  collected_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL,
  effective_at timestamptz NOT NULL,
  metrics jsonb NOT NULL,
  coverage jsonb,
  CONSTRAINT docker_metric_samples_ids_nonempty CHECK (
    length(btrim(id)) > 0
    AND length(btrim(vps_id)) > 0
    AND length(btrim(agent_instance_id)) > 0
    AND length(btrim(snapshot_id)) > 0
  ),
  CONSTRAINT docker_metric_samples_container_semantics CHECK (
    container_key IS NULL OR length(btrim(container_key)) > 0
  ),
  CONSTRAINT docker_metric_samples_json_shape CHECK (
    jsonb_typeof(metrics) = 'object'
    AND (coverage IS NULL OR jsonb_typeof(coverage) = 'object')
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS docker_metric_samples_replay_uidx
  ON docker_metric_samples (vps_id, agent_instance_id, snapshot_id, COALESCE(container_key, ''));
CREATE TABLE IF NOT EXISTS docker_metric_rollups (
  id text PRIMARY KEY,
  vps_id text NOT NULL REFERENCES vps(id) ON DELETE CASCADE,
  agent_instance_id text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('host', 'container', 'aggregate')),
  container_key text,
  cohort_digest text,
  bucket_start timestamptz NOT NULL,
  formula_version integer NOT NULL,
  first_at timestamptz NOT NULL,
  last_at timestamptz NOT NULL,
  sample_count integer NOT NULL,
  gauge_min double precision,
  gauge_max double precision,
  gauge_sum double precision,
  gauge_average double precision,
  counter_first double precision,
  counter_last double precision,
  counter_increase double precision,
  reset_count integer NOT NULL,
  expected_samples integer NOT NULL,
  observed_samples integer NOT NULL,
  partial_sample_count integer NOT NULL,
  gap_count integer NOT NULL,
  coverage_ratio double precision NOT NULL,
  CONSTRAINT docker_metric_rollups_ids_nonempty CHECK (
    length(btrim(id)) > 0
    AND length(btrim(vps_id)) > 0
    AND length(btrim(agent_instance_id)) > 0
  ),
  CONSTRAINT docker_metric_rollups_no_empty_sentinel CHECK (
    (container_key IS NULL OR length(btrim(container_key)) > 0)
    AND (cohort_digest IS NULL OR length(btrim(cohort_digest)) > 0)
  ),
  CONSTRAINT docker_metric_rollups_scope_semantics CHECK (
    (scope = 'host' AND container_key IS NULL AND cohort_digest IS NULL)
    OR (scope = 'container' AND container_key IS NOT NULL AND length(btrim(container_key)) > 0 AND cohort_digest IS NULL)
    OR (scope = 'aggregate' AND container_key IS NULL AND cohort_digest IS NOT NULL AND length(btrim(cohort_digest)) > 0)
  ),
  CONSTRAINT docker_metric_rollups_counts_nonnegative CHECK (
    sample_count >= 0
    AND reset_count >= 0
    AND expected_samples >= 0
    AND observed_samples >= 0
    AND partial_sample_count >= 0
    AND gap_count >= 0
  ),
  CONSTRAINT docker_metric_rollups_coverage_ratio CHECK (
    coverage_ratio >= 0 AND coverage_ratio <= 1
  ),
  CONSTRAINT docker_metric_rollups_window_order CHECK (last_at >= first_at),
  CONSTRAINT docker_metric_rollups_formula_version CHECK (formula_version >= 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS docker_metric_rollups_dedupe_uidx
  ON docker_metric_rollups (vps_id, agent_instance_id, scope, COALESCE(container_key, ''), bucket_start, formula_version, COALESCE(cohort_digest, ''));
CREATE TABLE IF NOT EXISTS docker_operational_events (
  id text PRIMARY KEY,
  vps_id text NOT NULL REFERENCES vps(id) ON DELETE CASCADE,
  agent_instance_id text NOT NULL,
  container_key text,
  action text NOT NULL CHECK (action IN ('create', 'start', 'restart', 'die', 'stop', 'kill', 'destroy', 'remove', 'health_status', 'stream_gap', 'daemon_restarted')),
  event_occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL,
  event_digest text NOT NULL,
  context_version integer NOT NULL CHECK (context_version = 1),
  health_status text CHECK (health_status IS NULL OR health_status IN ('healthy', 'unhealthy', 'starting', 'none')),
  exit_code integer,
  signal integer,
  oom_killed boolean,
  UNIQUE (vps_id, agent_instance_id, event_digest),
  CONSTRAINT docker_operational_events_ids_nonempty CHECK (
    length(btrim(id)) > 0
    AND length(btrim(vps_id)) > 0
    AND length(btrim(agent_instance_id)) > 0
    AND length(btrim(event_digest)) > 0
  ),
  CONSTRAINT docker_operational_events_container_semantics CHECK (
    container_key IS NULL OR length(btrim(container_key)) > 0
  )
);
CREATE TABLE IF NOT EXISTS docker_storage_latest (
  vps_id text PRIMARY KEY REFERENCES vps(id) ON DELETE CASCADE,
  agent_instance_id text NOT NULL,
  snapshot_id text NOT NULL,
  collected_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL,
  images jsonb NOT NULL,
  containers jsonb NOT NULL,
  local_volumes jsonb NOT NULL,
  build_cache jsonb NOT NULL,
  formula_version integer NOT NULL CHECK (formula_version = 1),
  CONSTRAINT docker_storage_latest_ids_nonempty CHECK (
    length(btrim(vps_id)) > 0
    AND length(btrim(agent_instance_id)) > 0
    AND length(btrim(snapshot_id)) > 0
  ),
  CONSTRAINT docker_storage_latest_json_shape CHECK (
    jsonb_typeof(images) = 'object'
    AND jsonb_typeof(containers) = 'object'
    AND jsonb_typeof(local_volumes) = 'object'
    AND jsonb_typeof(build_cache) = 'object'
  )
);
CREATE TABLE IF NOT EXISTS docker_event_watermarks (
  vps_id text NOT NULL REFERENCES vps(id) ON DELETE CASCADE,
  agent_instance_id text NOT NULL,
  time_nano text NOT NULL,
  boundary_digests jsonb NOT NULL,
  committed_batch_id text,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (vps_id, agent_instance_id),
  CONSTRAINT docker_event_watermarks_ids_nonempty CHECK (
    length(btrim(vps_id)) > 0
    AND length(btrim(agent_instance_id)) > 0
    AND length(btrim(time_nano)) > 0
  ),
  CONSTRAINT docker_event_watermarks_boundary_shape CHECK (
    jsonb_typeof(boundary_digests) = 'array'
  )
);
CREATE TABLE IF NOT EXISTS docker_ingest_batches (
  vps_id text NOT NULL REFERENCES vps(id) ON DELETE CASCADE,
  agent_instance_id text NOT NULL,
  batch_id text NOT NULL,
  snapshot_id text NOT NULL,
  request_digest text NOT NULL,
  result text NOT NULL,
  PRIMARY KEY (vps_id, agent_instance_id, batch_id),
  UNIQUE (vps_id, agent_instance_id, request_digest),
  CONSTRAINT docker_ingest_batches_ids_nonempty CHECK (
    length(btrim(vps_id)) > 0
    AND length(btrim(agent_instance_id)) > 0
    AND length(btrim(batch_id)) > 0
    AND length(btrim(snapshot_id)) > 0
    AND length(btrim(request_digest)) > 0
    AND length(btrim(result)) > 0
  )
);
CREATE TABLE IF NOT EXISTS docker_alerts (
  id text PRIMARY KEY,
  vps_id text NOT NULL REFERENCES vps(id) ON DELETE CASCADE,
  agent_instance_id text,
  rule_kind text NOT NULL,
  container_key text,
  state text NOT NULL CHECK (state IN ('open', 'acknowledged', 'resolved')),
  fingerprint text NOT NULL,
  opened_at timestamptz NOT NULL,
  last_observed_at timestamptz,
  resolved_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by text,
  occurrences integer NOT NULL,
  summary text NOT NULL,
  context_version integer NOT NULL CHECK (context_version = 1),
  CONSTRAINT docker_alerts_ids_nonempty CHECK (
    length(btrim(id)) > 0
    AND length(btrim(vps_id)) > 0
    AND length(btrim(rule_kind)) > 0
    AND length(btrim(fingerprint)) > 0
    AND length(btrim(summary)) > 0
  ),
  CONSTRAINT docker_alerts_instance_semantics CHECK (
    (agent_instance_id IS NULL AND container_key IS NULL)
    OR (
      agent_instance_id IS NOT NULL AND length(btrim(agent_instance_id)) > 0
      AND container_key IS NOT NULL AND length(btrim(container_key)) > 0
    )
  ),
  CONSTRAINT docker_alerts_occurrences_nonnegative CHECK (occurrences >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS docker_alerts_active_fingerprint_uidx
  ON docker_alerts (vps_id, fingerprint) WHERE state IN ('open', 'acknowledged');
CREATE INDEX IF NOT EXISTS docker_samples_scope_idx ON docker_metric_samples (vps_id, effective_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS docker_rollups_scope_idx ON docker_metric_rollups (vps_id, bucket_start DESC, id DESC);
CREATE INDEX IF NOT EXISTS docker_events_scope_idx ON docker_operational_events (vps_id, event_occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS docker_alerts_scope_idx ON docker_alerts (vps_id, COALESCE(last_observed_at, opened_at) DESC, id DESC);
CREATE INDEX IF NOT EXISTS docker_events_filters_idx ON docker_operational_events (vps_id, agent_instance_id, container_key, action);
