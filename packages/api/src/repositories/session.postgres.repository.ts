import { nanoid } from "nanoid";
import type { DatabasePool } from "../db/pool.js";
import type { SessionRecord, SessionRepository } from "./session.repository.js";
import { requiredIsoString } from "./postgres-mappers.js";

type SessionRow = {
  id: string;
  token_hash: string;
  expires_at: Date | string;
  created_at: Date | string;
  revoked_at: Date | string | null;
  ip_address: string | null;
};

export function createPostgresSessionRepository(pool: DatabasePool): SessionRepository {
  return {
    async create(input) {
      const id = `sess_${nanoid(12)}`;
      const createdAt = new Date().toISOString();
      await pool.query(
        `INSERT INTO dashboard_sessions (id, token_hash, expires_at, created_at, ip_address)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, input.tokenHash, input.expiresAt, createdAt, input.ipAddress ?? null],
      );
      return { ...input, id, createdAt };
    },

    async findByTokenHash(tokenHash) {
      const result = await pool.query<SessionRow>(
        `SELECT * FROM dashboard_sessions
         WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
        [tokenHash],
      );
      return result.rows[0] ? rowToSession(result.rows[0]) : undefined;
    },

    async revoke(id) {
      await pool.query("UPDATE dashboard_sessions SET revoked_at = NOW() WHERE id = $1", [id]);
    },

    async revokeAll() {
      const result = await pool.query(
        "UPDATE dashboard_sessions SET revoked_at = NOW() WHERE revoked_at IS NULL AND expires_at > NOW()",
      );
      return result.rowCount ?? 0;
    },

    async cleanup() {
      const result = await pool.query("DELETE FROM dashboard_sessions WHERE expires_at < NOW()");
      return result.rowCount ?? 0;
    },
  };
}

function rowToSession(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    tokenHash: row.token_hash,
    expiresAt: requiredIsoString(row.expires_at),
    createdAt: requiredIsoString(row.created_at),
    revokedAt: row.revoked_at ? requiredIsoString(row.revoked_at) : undefined,
    ipAddress: row.ip_address ?? undefined,
  };
}
