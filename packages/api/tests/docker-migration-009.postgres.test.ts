import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import pg from "pg";
import { loadMigrations, runMigrations } from "../src/db/migrations.js";

// Real PostgreSQL execution evidence for migration 009 (Oracle Gate 1
// remediation). Gated by VPS_MANAGER_TEST_POSTGRES_URL: skipped locally where
// no PostgreSQL runtime is available, mandatory in CI via the
// postgres-integration job. Uses an isolated schema per run so concurrent or
// repeated runs never interfere.
const databaseUrl = process.env.VPS_MANAGER_TEST_POSTGRES_URL;

describe("009 docker metrics migration (real PostgreSQL)", () => {
  it.skipIf(!databaseUrl)(
    "applies against a pre-009 schema and preserves data",
    async () => {
      const admin = new pg.Pool({ connectionString: databaseUrl });
      const schema = `vps_manager_test_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`;
      await admin.query(`CREATE SCHEMA "${schema}"`);
      // Every pooled connection must land in the isolated schema.
      const pool = new pg.Pool({
        connectionString: databaseUrl,
        options: `-c search_path=${schema}`,
      });
      const migrationDir = await mkdtemp(
        join(tmpdir(), "vps-manager-migrations-"),
      );
      try {
        // Representative pre-009 vps table: core columns present, but no
        // docker_metrics_enabled column yet.
        await pool.query(
          `CREATE TABLE vps (` +
            `id text PRIMARY KEY, name text NOT NULL, host text NOT NULL, ` +
            `port integer NOT NULL, username text NOT NULL, ` +
            `provider text NOT NULL DEFAULT 'unknown', region text, ` +
            `tags text[] NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'unknown', ` +
            `last_seen_at timestamptz, notes text, display_name text, ` +
            `kind text, managed_by text, created_at timestamptz NOT NULL, ` +
            `updated_at timestamptz NOT NULL)`,
        );
        // Row inserted BEFORE migration: the new NOT NULL/default column must
        // be backfilled to false.
        await pool.query(
          `INSERT INTO vps (id, name, host, port, username, created_at, updated_at) ` +
            `VALUES ('vps_backfill', 'legacy', 'host', 22, 'root', now(), now())`,
        );

        const migration = (await loadMigrations()).find(
          (m) => m.id === "009_docker_metrics.sql",
        )!;
        await pool.query(migration.sql);

        const backfilled = await pool.query(
          `SELECT docker_metrics_enabled FROM vps WHERE id = 'vps_backfill'`,
        );
        expect(backfilled.rows[0].docker_metrics_enabled).toBe(false);

        // Separate post-migration row verifies the default for new inserts.
        await pool.query(
          `INSERT INTO vps (id, name, host, port, username, created_at, updated_at) ` +
            `VALUES ('vps_default', 'new', 'host', 22, 'root', now(), now())`,
        );
        const defaulted = await pool.query(
          `SELECT docker_metrics_enabled FROM vps WHERE id = 'vps_default'`,
        );
        expect(defaulted.rows[0].docker_metrics_enabled).toBe(false);

        // New column is NOT NULL with a false default.
        const column = await pool.query(
          `SELECT is_nullable, column_default FROM information_schema.columns ` +
            `WHERE table_name = 'vps' AND column_name = 'docker_metrics_enabled'`,
        );
        expect(column.rows[0].is_nullable).toBe("NO");
        expect(column.rows[0].column_default).toContain("false");

        // PK is exactly (vps_id) on agent_docker_metrics.
        const pk = await pool.query(
          `SELECT a.attname AS column_name FROM pg_constraint c ` +
            `JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey) ` +
            `WHERE c.conrelid = 'agent_docker_metrics'::regclass AND c.contype = 'p'`,
        );
        expect(pk.rows).toEqual([{ column_name: "vps_id" }]);

        // FK references exactly vps.id with ON DELETE CASCADE.
        const fk = await pool.query(
          `SELECT t.relname AS ref_table, a.attname AS ref_column, c.confdeltype ` +
            `FROM pg_constraint c ` +
            `JOIN pg_class t ON t.oid = c.confrelid ` +
            `JOIN unnest(c.confkey) WITH ORDINALITY k(attnum, ord) ON true ` +
            `JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = c.confkey[k.ord] ` +
            `WHERE c.conrelid = 'agent_docker_metrics'::regclass AND c.contype = 'f'`,
        );
        expect(fk.rows).toEqual([
          { ref_table: "vps", ref_column: "id", confdeltype: "c" },
        ]);

        // Behavioral cascade: metrics row follows its VPS on delete.
        await pool.query(
          `INSERT INTO agent_docker_metrics (vps_id, collected_at, received_at) ` +
            `VALUES ('vps_backfill', now(), now())`,
        );
        // Direct SQL rerun is idempotent and preserves existing data.
        await pool.query(migration.sql);
        expect(
          (await pool.query(`SELECT vps_id FROM agent_docker_metrics`)).rows,
        ).toHaveLength(1);
        await pool.query(`DELETE FROM vps WHERE id = 'vps_backfill'`);
        expect(
          (await pool.query(`SELECT * FROM agent_docker_metrics`)).rows,
        ).toHaveLength(0);

        // Real runner ledger: apply-once against this isolated schema.
        await writeFile(
          join(migrationDir, "009_docker_metrics.sql"),
          migration.sql,
        );
        const first = await runMigrations(pool, {
          migrationsDir: migrationDir,
        });
        expect(first.applied).toContain("009_docker_metrics.sql");
        const second = await runMigrations(pool, {
          migrationsDir: migrationDir,
        });
        expect(second.applied).toEqual([]);
      } finally {
        await rm(migrationDir, { recursive: true, force: true }).catch(
          () => undefined,
        );
        await pool.end().catch(() => undefined);
        await admin
          .query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
          .catch(() => undefined);
        await admin.end().catch(() => undefined);
      }
    },
    30000,
  );
});
