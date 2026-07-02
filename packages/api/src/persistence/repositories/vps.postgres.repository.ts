import { nanoid } from "nanoid";
import { withTransaction, type DatabasePool } from "../../db/pool.js";
import type { CreateVpsInput, UpdateVpsInput, VpsRecord } from "../../vps/vps.models.js";
import { withVpsDefaults, type VpsRepository } from "./vps.repository.js";
import { optionalIsoString, requiredIsoString } from "./postgres-mappers.js";

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
  created_at: Date | string;
  updated_at: Date | string;
};

export function createPostgresVpsRepository(pool: DatabasePool): VpsRepository {
  async function get(id: string): Promise<VpsRecord | undefined> {
    const result = await pool.query<VpsRow>("SELECT * FROM vps WHERE id = $1", [id]);
    return result.rows[0] ? rowToVps(result.rows[0]) : undefined;
  }

  return {
    async list() {
      const result = await pool.query<VpsRow>("SELECT * FROM vps ORDER BY created_at DESC");
      return result.rows.map(rowToVps);
    },
    get,
    async create(input) {
      const now = new Date();
      const id = `vps_${nanoid(12)}`;
      const result = await pool.query<VpsRow>(
        `INSERT INTO vps (id, name, host, port, username, provider, region, tags, status, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
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
          now
        ]
      );
      return rowToVps(result.rows[0]!);
    },
    async update(id, input) {
      return withTransaction(pool, async (client) => {
        const currentResult = await client.query<VpsRow>("SELECT * FROM vps WHERE id = $1 FOR UPDATE", [id]);
        const current = currentResult.rows[0] ? rowToVps(currentResult.rows[0]) : undefined;
        if (!current) return undefined;
        const next = { ...current, ...input };
        const result = await client.query<VpsRow>(
          `UPDATE vps
           SET name = $2, host = $3, port = $4, username = $5, provider = $6, region = $7,
               tags = $8, status = $9, notes = $10, updated_at = $11
           WHERE id = $1
           RETURNING *`,
          [id, next.name, next.host, next.port, next.username, next.provider ?? "unknown", next.region ?? null, next.tags ?? [], next.status ?? "unknown", next.notes ?? null, new Date()]
        );
        return result.rows[0] ? rowToVps(result.rows[0]) : undefined;
      });
    },
    async markKeyProvisioned(id) {
      const now = new Date();
      const result = await pool.query<VpsRow>(
        "UPDATE vps SET key_provisioned_at = $2, updated_at = $2 WHERE id = $1 RETURNING *",
        [id, now]
      );
      return result.rows[0] ? rowToVps(result.rows[0]) : undefined;
    },
    async delete(id) {
      const result = await pool.query("DELETE FROM vps WHERE id = $1", [id]);
      return Boolean(result.rowCount);
    }
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
    createdAt: requiredIsoString(row.created_at),
    updatedAt: requiredIsoString(row.updated_at)
  });
}
