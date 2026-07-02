import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";
import { withTransaction } from "./pool.js";

export type Migration = {
  id: string;
  path: string;
  sql: string;
};

const DEFAULT_MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "db", "migrations");

export async function loadMigrations(migrationsDir = DEFAULT_MIGRATIONS_DIR): Promise<Migration[]> {
  const fileNames = await readdir(migrationsDir);
  const sqlFiles = fileNames.filter((fileName) => fileName.endsWith(".sql")).sort();

  return Promise.all(
    sqlFiles.map(async (fileName) => {
      const path = join(migrationsDir, fileName);
      return {
        id: fileName,
        path,
        sql: await readFile(path, "utf8")
      };
    })
  );
}

export async function runMigrations(pool: Pool, options: { includeOptional?: boolean; migrationsDir?: string } = {}) {
  const migrations = await loadMigrations(options.migrationsDir);
  const selectedMigrations = selectMigrations(migrations, Boolean(options.includeOptional));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const applied: string[] = [];

  for (const migration of selectedMigrations) {
    await withTransaction(pool, async (client) => {
      const existing = await client.query("SELECT id FROM schema_migrations WHERE id = $1", [migration.id]);
      if (existing.rowCount) return;

      await client.query(migration.sql);
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [migration.id]);
      applied.push(migration.id);
    });
  }

  return { applied };
}

export function selectMigrations(migrations: Migration[], includeOptional: boolean): Migration[] {
  return includeOptional ? migrations : migrations.filter((migration) => !isOptionalMigration(migration));
}

function isOptionalMigration(migration: Migration): boolean {
  return migration.id.includes("optional");
}
