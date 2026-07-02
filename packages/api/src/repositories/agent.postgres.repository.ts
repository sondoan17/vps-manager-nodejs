import { nanoid } from "nanoid";
import { withTransaction, type DatabasePool } from "../db/pool.js";
import type { AgentCredential, AgentState } from "../models/agent.js";
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
    }
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
