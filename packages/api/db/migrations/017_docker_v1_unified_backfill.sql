-- Preserve legacy Docker v1 latest metrics in the durable unified sample model.
-- The migration is additive, deterministic, and safe to execute repeatedly.
-- V1 has no agent/snapshot identity, so a stable synthetic identity is used;
-- schemaVersion is intentionally not copied into the new contract.
INSERT INTO docker_metric_samples (
  id, vps_id, agent_instance_id, snapshot_id, container_key, name, state,
  collected_at, received_at, effective_at, metrics, coverage
)
SELECT
  'docker-v1:' || md5(m.vps_id || ':' || m.received_at::text),
  m.vps_id,
  'legacy-docker-v1',
  'docker-v1:' || md5(m.vps_id || ':' || m.received_at::text),
  NULL,
  NULL,
  NULL,
  m.collected_at,
  m.received_at,
  m.collected_at,
  jsonb_build_object(
    'available', m.available,
    'containerTotal', m.container_total,
    'containerRunning', m.container_running,
    'cpuPercent', m.cpu_percent,
    'memoryUsageBytes', m.memory_usage_bytes,
    'memoryLimitBytes', m.memory_limit_bytes,
    'networkRxBytes', m.network_rx_bytes,
    'networkTxBytes', m.network_tx_bytes,
    'blockReadBytes', m.block_read_bytes,
    'blockWriteBytes', m.block_write_bytes,
    'pids', m.pids
  ) || CASE WHEN m.error_code IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('errorCode', m.error_code) END,
  NULL
FROM agent_docker_metrics AS m
ON CONFLICT DO NOTHING;
