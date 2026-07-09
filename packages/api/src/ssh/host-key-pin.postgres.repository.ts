import { nanoid } from "nanoid";
import type { DatabasePool } from "../db/pool.js";
import type { HostKeyPin } from "./host-key-pin.models.js";
import type { HostKeyPinRepository } from "./host-key-pin.repository.js";

type HostKeyPinRow = {
  id: string;
  vps_id: string;
  host: string;
  port: number;
  fingerprint: string;
  key_type: string | null;
  trusted_at: Date | string;
};

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function rowToPin(row: HostKeyPinRow): HostKeyPin {
  return {
    id: row.id,
    vpsId: row.vps_id,
    host: row.host,
    port: row.port,
    fingerprint: row.fingerprint,
    keyType: row.key_type ?? undefined,
    trustedAt: iso(row.trusted_at),
  };
}

export function createPostgresHostKeyPinRepository(
  pool: DatabasePool,
): HostKeyPinRepository {
  return {
    async findByVpsId(vpsId) {
      const result = await pool.query<HostKeyPinRow>(
        "SELECT * FROM ssh_host_key_pins WHERE vps_id = $1",
        [vpsId],
      );
      return result.rows[0] ? rowToPin(result.rows[0]) : undefined;
    },

    async findByHostPort(host, port) {
      const result = await pool.query<HostKeyPinRow>(
        "SELECT * FROM ssh_host_key_pins WHERE host = $1 AND port = $2",
        [host, port],
      );
      return result.rows[0] ? rowToPin(result.rows[0]) : undefined;
    },

    async upsert(pin) {
      const now = new Date();
      const result = await pool.query<HostKeyPinRow>(
        `INSERT INTO ssh_host_key_pins (id, vps_id, host, port, fingerprint, key_type, trusted_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $7)
         ON CONFLICT (vps_id) DO UPDATE
         SET host = EXCLUDED.host,
             port = EXCLUDED.port,
             fingerprint = EXCLUDED.fingerprint,
             key_type = EXCLUDED.key_type,
             trusted_at = EXCLUDED.trusted_at,
             updated_at = EXCLUDED.updated_at
         RETURNING *`,
        [
          `hsp_${nanoid(12)}`,
          pin.vpsId,
          pin.host,
          pin.port,
          pin.fingerprint,
          pin.keyType ?? null,
          now,
        ],
      );
      return rowToPin(result.rows[0]!);
    },

    async deleteByVpsId(vpsId) {
      const result = await pool.query(
        "DELETE FROM ssh_host_key_pins WHERE vps_id = $1",
        [vpsId],
      );
      return Boolean(result.rowCount);
    },
  };
}
