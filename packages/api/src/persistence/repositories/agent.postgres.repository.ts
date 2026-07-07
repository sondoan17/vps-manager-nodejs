import { nanoid } from "nanoid";
import { withTransaction, type DatabasePool } from "../../db/pool.js";
import type { AgentCredential, AgentDockerMetrics, AgentState, AgentSystemInfo } from "../../agents/agent.models.js";
import type { AgentRepository } from "./agent.repository.js";
import { optionalIsoString, requiredIsoString, toDateOrNull } from "./postgres-mappers.js";

type AgentCredentialRow = {
  id: string;
  vps_id: string;
  secret_hash: string;
  status: AgentCredential["status"];
  created_at: Date | string;
  activated_at: Date | string | null;
  revoked_at: Date | string | null;
  last_used_at: Date | string | null;
  last_used_ip: string | null;
};

type AgentStateRow = {
  vps_id: string;
  status: AgentState["status"];
  version: string | null;
  installed_at: Date | string | null;
  last_seen_at: Date | string | null;
  last_error: string | null;
  last_install_job_id: string | null;
};

type AgentSystemInfoRow = {
  vps_id: string;
  collected_at: Date | string;
  received_at: Date | string;
  agent_version: string | null;
  data: unknown;
};

export function createPostgresAgentRepository(pool: DatabasePool): AgentRepository {
  async function getCredential(id: string): Promise<AgentCredential | undefined> {
    const result = await pool.query<AgentCredentialRow>("SELECT * FROM agent_credentials WHERE id = $1", [id]);
    return result.rows[0] ? rowToCredential(result.rows[0]) : undefined;
  }

  return {
    async createCredential(input) {
      const credential: AgentCredential = {
        ...input,
        id: input.id ?? `cred_${nanoid(12)}`,
        createdAt: new Date().toISOString()
      };
      const result = await pool.query<AgentCredentialRow>(
        `INSERT INTO agent_credentials (id, vps_id, secret_hash, status, created_at, activated_at, revoked_at, last_used_at, last_used_ip)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        credentialToValues(credential)
      );
      return rowToCredential(result.rows[0]!);
    },
    getCredential,
    async listCredentialsByVps(vpsId) {
      const result = await pool.query<AgentCredentialRow>(
        "SELECT * FROM agent_credentials WHERE vps_id = $1 ORDER BY created_at DESC",
        [vpsId]
      );
      return result.rows.map(rowToCredential);
    },
    async updateCredential(id, patch) {
      return withTransaction(pool, async (client) => {
        const currentResult = await client.query<AgentCredentialRow>("SELECT * FROM agent_credentials WHERE id = $1 FOR UPDATE", [id]);
        const current = currentResult.rows[0] ? rowToCredential(currentResult.rows[0]) : undefined;
        if (!current) return undefined;
        const { id: _ignoredPatchId, ...safePatch } = patch;
        const next = { ...current, ...safePatch, id };
        const result = await client.query<AgentCredentialRow>(
          `UPDATE agent_credentials
           SET vps_id=$2, secret_hash=$3, status=$4, created_at=$5, activated_at=$6,
               revoked_at=$7, last_used_at=$8, last_used_ip=$9
           WHERE id=$1 RETURNING *`,
          credentialToValues(next)
        );
        return result.rows[0] ? rowToCredential(result.rows[0]) : undefined;
      });
    },
    async revokeCredential(id) {
      return this.updateCredential(id, { status: "revoked", revokedAt: new Date().toISOString() });
    },
    async getState(vpsId) {
      const result = await pool.query<AgentStateRow>("SELECT * FROM agent_states WHERE vps_id = $1", [vpsId]);
      return result.rows[0] ? rowToState(result.rows[0]) : undefined;
    },
    async upsertState(state) {
      const result = await pool.query<AgentStateRow>(
        `INSERT INTO agent_states (vps_id, status, version, installed_at, last_seen_at, last_error, last_install_job_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (vps_id) DO UPDATE SET
           status = EXCLUDED.status,
           version = EXCLUDED.version,
           installed_at = EXCLUDED.installed_at,
           last_seen_at = EXCLUDED.last_seen_at,
           last_error = EXCLUDED.last_error,
           last_install_job_id = EXCLUDED.last_install_job_id
         RETURNING *`,
        [
          state.vpsId,
          state.status,
          state.version ?? null,
          toDateOrNull(state.installedAt),
          toDateOrNull(state.lastSeenAt),
          state.lastError ?? null,
          state.lastInstallJobId ?? null
        ]
      );
      return rowToState(result.rows[0]!);
    },

    async upsertSystemInfo(info) {
      const result = await pool.query<AgentSystemInfoRow>(
        `INSERT INTO agent_system_info (
           vps_id, collected_at, received_at, agent_version,
           os_family, os_name, os_version, os_pretty_name,
           kernel_release, kernel_version, arch,
           cpu_cores, cpu_model,
           memory_total_bytes, memory_available_bytes,
           root_disk_mount_point, root_disk_fs_type, root_disk_total_bytes, root_disk_used_bytes, root_disk_free_bytes,
           data
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb)
         ON CONFLICT (vps_id) DO UPDATE SET
           collected_at = EXCLUDED.collected_at,
           received_at = EXCLUDED.received_at,
           agent_version = EXCLUDED.agent_version,
           os_family = EXCLUDED.os_family,
           os_name = EXCLUDED.os_name,
           os_version = EXCLUDED.os_version,
           os_pretty_name = EXCLUDED.os_pretty_name,
           kernel_release = EXCLUDED.kernel_release,
           kernel_version = EXCLUDED.kernel_version,
           arch = EXCLUDED.arch,
           cpu_cores = EXCLUDED.cpu_cores,
           cpu_model = EXCLUDED.cpu_model,
           memory_total_bytes = EXCLUDED.memory_total_bytes,
           memory_available_bytes = EXCLUDED.memory_available_bytes,
           root_disk_mount_point = EXCLUDED.root_disk_mount_point,
           root_disk_fs_type = EXCLUDED.root_disk_fs_type,
           root_disk_total_bytes = EXCLUDED.root_disk_total_bytes,
           root_disk_used_bytes = EXCLUDED.root_disk_used_bytes,
           root_disk_free_bytes = EXCLUDED.root_disk_free_bytes,
           data = EXCLUDED.data
         WHERE agent_system_info.collected_at <= EXCLUDED.collected_at
         RETURNING *`,
        [
          info.vpsId,
          toDateOrNull(info.collectedAt),
          toDateOrNull(info.receivedAt),
          info.agentVersion ?? null,
          info.os?.family ?? null,
          info.os?.name ?? null,
          info.os?.version ?? null,
          info.os?.prettyName ?? null,
          info.kernel?.release ?? null,
          info.kernel?.version ?? null,
          info.kernel?.arch ?? null,
          info.cpu?.cores ?? null,
          info.cpu?.model ?? null,
          info.memory?.totalBytes ?? null,
          info.memory?.availableBytes ?? null,
          info.rootDisk?.mountPoint ?? null,
          info.rootDisk?.fsType ?? null,
          info.rootDisk?.totalBytes ?? null,
          info.rootDisk?.usedBytes ?? null,
          info.rootDisk?.freeBytes ?? null,
          JSON.stringify({
            os: info.os,
            kernel: info.kernel,
            cpu: info.cpu,
            memory: info.memory,
            rootDisk: info.rootDisk,
          }),
        ],
      );
      if (result.rows[0]) return rowToSystemInfo(result.rows[0]);
      const current = await pool.query<AgentSystemInfoRow>("SELECT * FROM agent_system_info WHERE vps_id = $1", [info.vpsId]);
      return current.rows[0] ? rowToSystemInfo(current.rows[0]) : info;
    },

    async getSystemInfo(vpsId) {
      const result = await pool.query<AgentSystemInfoRow>("SELECT * FROM agent_system_info WHERE vps_id = $1", [vpsId]);
      if (!result.rows[0]) return undefined;
      return rowToSystemInfo(result.rows[0]);
    },

    async listSystemInfo() {
      const result = await pool.query<AgentSystemInfoRow>("SELECT * FROM agent_system_info");
      return result.rows.map(rowToSystemInfo);
    },

    async upsertDockerMetrics(metrics: AgentDockerMetrics) {
      const result = await pool.query<AgentDockerMetricsRow>(
        `INSERT INTO agent_docker_metrics (
           vps_id, collected_at, received_at, agent_version, schema_version,
           available, error_code, container_total, container_running,
           cpu_percent, memory_usage_bytes, memory_limit_bytes,
           network_rx_bytes, network_tx_bytes, block_read_bytes, block_write_bytes,
           pids, data
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb)
         ON CONFLICT (vps_id) DO UPDATE SET
           collected_at = EXCLUDED.collected_at,
           received_at = EXCLUDED.received_at,
           agent_version = EXCLUDED.agent_version,
           schema_version = EXCLUDED.schema_version,
           available = EXCLUDED.available,
           error_code = EXCLUDED.error_code,
           container_total = EXCLUDED.container_total,
           container_running = EXCLUDED.container_running,
           cpu_percent = EXCLUDED.cpu_percent,
           memory_usage_bytes = EXCLUDED.memory_usage_bytes,
           memory_limit_bytes = EXCLUDED.memory_limit_bytes,
           network_rx_bytes = EXCLUDED.network_rx_bytes,
           network_tx_bytes = EXCLUDED.network_tx_bytes,
           block_read_bytes = EXCLUDED.block_read_bytes,
           block_write_bytes = EXCLUDED.block_write_bytes,
           pids = EXCLUDED.pids,
           data = EXCLUDED.data
         WHERE agent_docker_metrics.collected_at <= EXCLUDED.collected_at
         RETURNING *`,
        dockerMetricsToValues(metrics),
      );
      if (result.rows[0]) return rowToDockerMetrics(result.rows[0]);
      const current = await pool.query<AgentDockerMetricsRow>(
        "SELECT * FROM agent_docker_metrics WHERE vps_id = $1", [metrics.vpsId],
      );
      return current.rows[0] ? rowToDockerMetrics(current.rows[0]) : metrics;
    },

    async getDockerMetrics(vpsId: string) {
      const result = await pool.query<AgentDockerMetricsRow>(
        "SELECT * FROM agent_docker_metrics WHERE vps_id = $1", [vpsId],
      );
      if (!result.rows[0]) return undefined;
      return rowToDockerMetrics(result.rows[0]);
    },

    async listDockerMetrics() {
      const result = await pool.query<AgentDockerMetricsRow>("SELECT * FROM agent_docker_metrics");
      return result.rows.map(rowToDockerMetrics);
    },

    async deleteDockerMetrics(vpsId: string) {
      const result = await pool.query("DELETE FROM agent_docker_metrics WHERE vps_id = $1", [vpsId]);
      return Boolean(result.rowCount);
    },
  };
}

type AgentDockerMetricsRow = {
  vps_id: string;
  collected_at: Date | string;
  received_at: Date | string;
  agent_version: string | null;
  schema_version: number;
  available: boolean;
  error_code: string | null;
  container_total: number;
  container_running: number;
  cpu_percent: number;
  memory_usage_bytes: number;
  memory_limit_bytes: number | null;
  network_rx_bytes: number;
  network_tx_bytes: number;
  block_read_bytes: number;
  block_write_bytes: number;
  pids: number;
  data: unknown;
};

function dockerMetricsToValues(metrics: AgentDockerMetrics): unknown[] {
  return [
    metrics.vpsId,
    toDateOrNull(metrics.collectedAt),
    toDateOrNull(metrics.receivedAt),
    metrics.agentVersion ?? null,
    metrics.schemaVersion,
    metrics.available,
    metrics.errorCode ?? null,
    metrics.containerTotal,
    metrics.containerRunning,
    metrics.cpuPercent,
    metrics.memoryUsageBytes,
    metrics.memoryLimitBytes ?? null,
    metrics.networkRxBytes,
    metrics.networkTxBytes,
    metrics.blockReadBytes,
    metrics.blockWriteBytes,
    metrics.pids,
    JSON.stringify({ containers: metrics.containers }),
  ];
}

function rowToDockerMetrics(row: AgentDockerMetricsRow): AgentDockerMetrics {
  const data = typeof row.data === "string" ? JSON.parse(row.data) : (row.data as Record<string, unknown>);
  const containers = Array.isArray(data?.containers) ? data.containers as AgentDockerMetrics["containers"] : [];
  return {
    vpsId: row.vps_id,
    collectedAt: requiredIsoString(row.collected_at),
    receivedAt: requiredIsoString(row.received_at),
    agentVersion: row.agent_version ?? undefined,
    schemaVersion: row.schema_version as 1,
    available: row.available,
    errorCode: (row.error_code as AgentDockerMetrics["errorCode"]) ?? undefined,
    containerTotal: row.container_total,
    containerRunning: row.container_running,
    cpuPercent: row.cpu_percent,
    memoryUsageBytes: row.memory_usage_bytes,
    memoryLimitBytes: row.memory_limit_bytes ?? undefined,
    networkRxBytes: row.network_rx_bytes,
    networkTxBytes: row.network_tx_bytes,
    blockReadBytes: row.block_read_bytes,
    blockWriteBytes: row.block_write_bytes,
    pids: row.pids,
    containers,
  };
}

function credentialToValues(credential: AgentCredential): unknown[] {
  return [
    credential.id,
    credential.vpsId,
    credential.secretHash,
    credential.status,
    new Date(credential.createdAt),
    toDateOrNull(credential.activatedAt),
    toDateOrNull(credential.revokedAt),
    toDateOrNull(credential.lastUsedAt),
    credential.lastUsedIp ?? null
  ];
}

function rowToCredential(row: AgentCredentialRow): AgentCredential {
  return {
    id: row.id,
    vpsId: row.vps_id,
    secretHash: row.secret_hash,
    status: row.status,
    createdAt: requiredIsoString(row.created_at),
    activatedAt: optionalIsoString(row.activated_at),
    revokedAt: optionalIsoString(row.revoked_at),
    lastUsedAt: optionalIsoString(row.last_used_at),
    lastUsedIp: row.last_used_ip ?? undefined
  };
}

function rowToSystemInfo(row: AgentSystemInfoRow): AgentSystemInfo {
  const data = typeof row.data === "string" ? JSON.parse(row.data) : (row.data as Record<string, unknown>);
  return {
    vpsId: row.vps_id,
    collectedAt: requiredIsoString(row.collected_at),
    receivedAt: requiredIsoString(row.received_at),
    agentVersion: row.agent_version ?? undefined,
    os: data?.os as AgentSystemInfo["os"],
    kernel: data?.kernel as AgentSystemInfo["kernel"],
    cpu: data?.cpu as AgentSystemInfo["cpu"],
    memory: data?.memory as AgentSystemInfo["memory"],
    rootDisk: data?.rootDisk as AgentSystemInfo["rootDisk"],
  };
}

function rowToState(row: AgentStateRow): AgentState {
  return {
    vpsId: row.vps_id,
    status: row.status,
    version: row.version ?? undefined,
    installedAt: optionalIsoString(row.installed_at),
    lastSeenAt: optionalIsoString(row.last_seen_at),
    lastError: row.last_error ?? undefined,
    lastInstallJobId: row.last_install_job_id ?? undefined
  };
}
