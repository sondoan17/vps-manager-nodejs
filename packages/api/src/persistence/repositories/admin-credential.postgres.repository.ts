import type { DatabasePool } from "../../db/pool.js";
import type {
  AdminCredentialRecord,
  AdminCredentialRepository,
} from "./admin-credential.repository.js";
import { requiredIsoString } from "./postgres-mappers.js";

type AdminCredentialRow = {
  id: string;
  password_hash: string;
  password_algorithm: string;
  password_params: string;
  created_at: Date | string;
  updated_at: Date | string;
  password_changed_at: Date | string;
};

export function createPostgresAdminCredentialRepository(
  pool: DatabasePool,
): AdminCredentialRepository {
  return {
    async get() {
      const result = await pool.query<AdminCredentialRow>(
        "SELECT * FROM dashboard_admin_credentials WHERE id = 'admin'",
      );
      return result.rows[0] ? rowToCredential(result.rows[0]) : undefined;
    },

    async upsert(input) {
      const now = new Date().toISOString();
      const result = await pool.query<AdminCredentialRow>(
        `INSERT INTO dashboard_admin_credentials (id, password_hash, password_algorithm, password_params, created_at, updated_at, password_changed_at)
         VALUES ('admin', $1, $2, $3, $4, $4, $4)
         ON CONFLICT (id) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           password_algorithm = EXCLUDED.password_algorithm,
           password_params = EXCLUDED.password_params,
           updated_at = EXCLUDED.updated_at,
           password_changed_at = CASE
             WHEN dashboard_admin_credentials.password_hash IS DISTINCT FROM EXCLUDED.password_hash THEN EXCLUDED.password_changed_at
             ELSE dashboard_admin_credentials.password_changed_at
           END
         RETURNING *`,
        [
          input.passwordHash,
          input.passwordAlgorithm,
          input.passwordParams,
          now,
        ],
      );
      return rowToCredential(result.rows[0]!);
    },
  };
}

function rowToCredential(row: AdminCredentialRow): AdminCredentialRecord {
  return {
    id: row.id,
    passwordHash: row.password_hash,
    passwordAlgorithm: row.password_algorithm,
    passwordParams: row.password_params,
    createdAt: requiredIsoString(row.created_at),
    updatedAt: requiredIsoString(row.updated_at),
    passwordChangedAt: requiredIsoString(row.password_changed_at),
  };
}
