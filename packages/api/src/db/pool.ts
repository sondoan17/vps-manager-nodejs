import {
  Pool,
  type PoolClient,
  type PoolConfig,
  type QueryResult,
  type QueryResultRow,
} from "pg";
import type { AppConfig } from "../config/app-config.js";

export type DatabasePool = Pick<Pool, "connect" | "end" | "query">;

export function createDatabasePool(config: AppConfig): Pool {
  if (config.storageDriver !== "postgres") {
    throw new Error(
      "Cannot create a database pool unless STORAGE_DRIVER=postgres",
    );
  }

  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required to create a database pool");
  }

  const poolConfig: PoolConfig = {
    connectionString: config.databaseUrl,
    max: config.dbPoolMax,
  };

  if (config.dbSsl) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  return new Pool(poolConfig);
}

export async function withTransaction<T>(
  pool: DatabasePool,
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function queryOne<T extends QueryResultRow>(
  client: Pick<PoolClient | Pool, "query">,
  text: string,
  values: unknown[] = [],
): Promise<T | undefined> {
  const result: QueryResult<T> = await client.query(text, values);
  return result.rows[0];
}
