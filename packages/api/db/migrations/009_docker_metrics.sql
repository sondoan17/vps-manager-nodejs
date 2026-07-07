-- Add docker_metrics_enabled column to vps table (default false).
-- The latest agent_docker_metrics table stores the most recent Docker metrics
-- reported by the agent per VPS. Keyed by vps_id (1:1).

ALTER TABLE vps ADD COLUMN IF NOT EXISTS docker_metrics_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS agent_docker_metrics (
  vps_id            text        PRIMARY KEY REFERENCES vps(id) ON DELETE CASCADE,
  collected_at      timestamptz NOT NULL,
  received_at       timestamptz NOT NULL,
  agent_version     text,
  schema_version    integer     NOT NULL DEFAULT 1,
  available         boolean     NOT NULL DEFAULT false,
  error_code        text,
  container_total   integer     NOT NULL DEFAULT 0,
  container_running integer     NOT NULL DEFAULT 0,
  cpu_percent       real        NOT NULL DEFAULT 0,
  memory_usage_bytes bigint     NOT NULL DEFAULT 0,
  memory_limit_bytes bigint,
  network_rx_bytes  bigint      NOT NULL DEFAULT 0,
  network_tx_bytes  bigint      NOT NULL DEFAULT 0,
  block_read_bytes  bigint      NOT NULL DEFAULT 0,
  block_write_bytes bigint      NOT NULL DEFAULT 0,
  pids              integer     NOT NULL DEFAULT 0,
  data              jsonb       NOT NULL DEFAULT '{}'::jsonb
);
