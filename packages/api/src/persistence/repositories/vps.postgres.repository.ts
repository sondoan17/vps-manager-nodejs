import { nanoid } from "nanoid";
import { withTransaction, type DatabasePool } from "../../db/pool.js";
import type {
  CreateVpsInput,
  UpdateVpsInput,
  VpsRecord,
} from "../../vps/vps.models.js";
import {
  withVpsDefaults,
  type EnsureLocalHostInput,
  type VpsRepository,
} from "./vps.repository.js";
import {
  optionalIsoString,
  requiredIsoString,
  toDateOrNull,
} from "./postgres-mappers.js";

type VpsRow = {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  provider: string | null;
  region: string | null;
  tags: string[] | null;
  status: VpsRecord["status"] | null;
  last_seen_at: Date | string | null;
  notes: string | null;
  key_provisioned_at: Date | string | null;
  kind: string | null;
  managed_by: string | null;
  docker_metrics_enabled: boolean | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export function createPostgresVpsRepository(pool: DatabasePool): VpsRepository {
  async function get(id: string): Promise<VpsRecord | undefined> {
    const result = await pool.query<VpsRow>("SELECT * FROM vps WHERE id = $1", [
      id,
    ]);
    return result.rows[0] ? rowToVps(result.rows[0]) : undefined;
  }

  return {
    async list() {
      const result = await pool.query<VpsRow>(
        "SELECT * FROM vps ORDER BY created_at DESC",
      );
      return result.rows.map(rowToVps);
    },
    get,
    async create(input) {
      const now = new Date();
      const id = `vps_${nanoid(12)}`;
      const result = await pool.query<VpsRow>(
        `INSERT INTO vps (id, name, host, port, username, provider, region, tags, status, notes, kind, managed_by, docker_metrics_enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
         RETURNING *`,
        [
          id,
          input.name,
          input.host,
          input.port,
          input.username,
          input.provider ?? "unknown",
          input.region ?? null,
          input.tags ?? [],
          input.status ?? "unknown",
          input.notes ?? null,
          "remote",
          "user",
          false,
          now,
        ],
      );
      return rowToVps(result.rows[0]!);
    },
    async update(id, input) {
      return withTransaction(pool, async (client) => {
        const currentResult = await client.query<VpsRow>(
          "SELECT * FROM vps WHERE id = $1 FOR UPDATE",
          [id],
        );
        const current = currentResult.rows[0]
          ? rowToVps(currentResult.rows[0])
          : undefined;
        if (!current) return undefined;
        const next = { ...current, ...input };
        const result = await client.query<VpsRow>(
          `UPDATE vps
           SET name = $2, host = $3, port = $4, username = $5, provider = $6, region = $7,
               tags = $8, status = $9, notes = $10, kind = $12, managed_by = $13,
               docker_metrics_enabled = $14, updated_at = $11
           WHERE id = $1
           RETURNING *`,
          [
            id,
            next.name,
            next.host,
            next.port,
            next.username,
            next.provider ?? "unknown",
            next.region ?? null,
            next.tags ?? [],
            next.status ?? "unknown",
            next.notes ?? null,
            new Date(),
            next.kind ?? null,
            next.managedBy ?? null,
            next.dockerMetricsEnabled ?? false,
          ],
        );
        return result.rows[0] ? rowToVps(result.rows[0]) : undefined;
      });
    },
    async markKeyProvisioned(id) {
      const now = new Date();
      const result = await pool.query<VpsRow>(
        "UPDATE vps SET key_provisioned_at = $2, updated_at = $2 WHERE id = $1 RETURNING *",
        [id, now],
      );
      return result.rows[0] ? rowToVps(result.rows[0]) : undefined;
    },
    async delete(id) {
      const result = await pool.query("DELETE FROM vps WHERE id = $1", [id]);
      return Boolean(result.rowCount);
    },
    async ensureLocalHost(input: EnsureLocalHostInput) {
      const now = new Date();
      const result = await pool.query<VpsRow>(
        `INSERT INTO vps (id, name, host, port, username, provider, region, tags, status, notes, kind, managed_by, docker_metrics_enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           host = EXCLUDED.host,
           port = EXCLUDED.port,
           username = EXCLUDED.username,
           provider = EXCLUDED.provider,
           tags = EXCLUDED.tags,
           status = EXCLUDED.status,
           notes = EXCLUDED.notes,
           kind = EXCLUDED.kind,
           managed_by = EXCLUDED.managed_by,
           docker_metrics_enabled = COALESCE(vps.docker_metrics_enabled, EXCLUDED.docker_metrics_enabled),
           updated_at = EXCLUDED.updated_at
         RETURNING *`,
        [
          input.id,
          input.name,
          input.host,
          input.port,
          input.username,
          input.provider ?? "local",
          input.region ?? null,
          input.tags ?? ["local", "local-agent", "system"],
          input.status ?? "unknown",
          input.notes ?? null,
          input.kind ?? "local",
          input.managedBy ?? "system",
          false,
          now,
        ],
      );
      return rowToVps(result.rows[0]!);
    },
    async markSeen(id, status, lastSeenAt) {
      const result = await pool.query<VpsRow>(
        "UPDATE vps SET status = $2, last_seen_at = $3, updated_at = $3 WHERE id = $1 RETURNING *",
        [id, status, new Date(lastSeenAt)],
      );
      return result.rows[0] ? rowToVps(result.rows[0]) : undefined;
    },
  };
}

function rowToVps(row: VpsRow): VpsRecord {
  return withVpsDefaults({
    id: row.id,
    name: row.name,
    host: row.host,
    port: Number(row.port),
    username: row.username,
    provider: row.provider ?? undefined,
    region: row.region ?? undefined,
    tags: row.tags ?? [],
    status: row.status ?? "unknown",
    lastSeenAt: optionalIsoString(row.last_seen_at),
    notes: row.notes ?? undefined,
    keyProvisionedAt: optionalIsoString(row.key_provisioned_at),
    kind: (row.kind as VpsRecord["kind"]) ?? undefined,
    managedBy: (row.managed_by as VpsRecord["managedBy"]) ?? undefined,
    dockerMetricsEnabled: row.docker_metrics_enabled ?? false,
    createdAt: requiredIsoString(row.created_at),
    updatedAt: requiredIsoString(row.updated_at),
  });
}
