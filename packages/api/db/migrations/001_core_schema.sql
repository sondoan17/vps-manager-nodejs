CREATE TABLE IF NOT EXISTS vps (
  id text PRIMARY KEY,
  name text NOT NULL,
  host text NOT NULL,
  port integer NOT NULL CHECK (port > 0 AND port <= 65535),
  username text NOT NULL,
  provider text NOT NULL DEFAULT 'unknown',
  region text,
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown', 'healthy', 'warning', 'unreachable')),
  last_seen_at timestamptz,
  notes text,
  key_provisioned_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_credentials (
  id text PRIMARY KEY,
  vps_id text NOT NULL REFERENCES vps(id) ON DELETE CASCADE,
  secret_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'active', 'revoked')),
  created_at timestamptz NOT NULL,
  activated_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  last_used_ip text
);

CREATE TABLE IF NOT EXISTS agent_states (
  vps_id text PRIMARY KEY REFERENCES vps(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('not_installed', 'installing', 'online', 'offline', 'failed')),
  version text,
  installed_at timestamptz,
  last_seen_at timestamptz,
  last_error text,
  last_install_job_id text
);

CREATE TABLE IF NOT EXISTS jobs (
  id text PRIMARY KEY,
  vps_id text NOT NULL REFERENCES vps(id) ON DELETE CASCADE,
  type text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  started_at timestamptz,
  finished_at timestamptz,
  exit_code integer,
  output_preview text,
  error_message text,
  worker_id text,
  duration_ms integer,
  retry_count integer,
  error_log_url text,
  step text,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id text PRIMARY KEY,
  actor text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  result text NOT NULL CHECK (result IN ('success', 'failure', 'blocked')),
  timestamp timestamptz NOT NULL,
  metadata jsonb,
  severity text CHECK (severity IS NULL OR severity IN ('info', 'warning', 'critical')),
  server_label text,
  action_label text,
  event_code text,
  source_ip text,
  request_id text,
  client text,
  job_id text,
  duration_ms integer,
  auth_method text,
  reason text
);

CREATE TABLE IF NOT EXISTS metric_samples (
  id bigserial NOT NULL,
  vps_id text NOT NULL REFERENCES vps(id) ON DELETE CASCADE,
  cpu double precision NOT NULL,
  memory double precision NOT NULL,
  disk double precision NOT NULL,
  load_average double precision NOT NULL,
  network_rx double precision NOT NULL,
  network_tx double precision NOT NULL,
  uptime double precision NOT NULL,
  collected_at timestamptz NOT NULL,
  received_at timestamptz,
  effective_at timestamptz NOT NULL,
  source text,
  agent_version text,
  trend jsonb,
  UNIQUE (vps_id, collected_at, effective_at)
);

CREATE TABLE IF NOT EXISTS metric_latest (
  vps_id text PRIMARY KEY REFERENCES vps(id) ON DELETE CASCADE,
  sample_id bigint,
  cpu double precision NOT NULL,
  memory double precision NOT NULL,
  disk double precision NOT NULL,
  load_average double precision NOT NULL,
  network_rx double precision NOT NULL,
  network_tx double precision NOT NULL,
  uptime double precision NOT NULL,
  collected_at timestamptz NOT NULL,
  received_at timestamptz,
  effective_at timestamptz NOT NULL,
  source text,
  agent_version text,
  trend jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
