-- Create agent_system_info table for storing latest system info per VPS.
-- This table is keyed by vps_id (1:1) and stores the latest system information
-- reported by the agent, including OS, kernel, CPU, memory, and root disk details.
-- The typed columns support list/detail queries without parsing JSONB. The
-- 'data' column keeps the full nested optional payload.

CREATE TABLE IF NOT EXISTS agent_system_info (
  vps_id      text        PRIMARY KEY REFERENCES vps(id) ON DELETE CASCADE,
  collected_at timestamptz NOT NULL,
  received_at  timestamptz NOT NULL,
  agent_version text,
  os_family text,
  os_name text,
  os_version text,
  os_pretty_name text,
  kernel_release text,
  kernel_version text,
  arch text,
  cpu_cores integer,
  cpu_model text,
  memory_total_bytes bigint,
  memory_available_bytes bigint,
  root_disk_mount_point text,
  root_disk_fs_type text,
  root_disk_total_bytes bigint,
  root_disk_used_bytes bigint,
  root_disk_free_bytes bigint,
  data         jsonb       NOT NULL
);
