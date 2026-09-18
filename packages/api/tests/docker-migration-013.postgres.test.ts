import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import pg from "pg";
import { loadMigrations, runMigrations } from "../src/db/migrations.js";

// Real PostgreSQL execution evidence for migration 013 (Docker monitoring I1
// lane). Gated by VPS_MANAGER_TEST_POSTGRES_URL: skipped locally where no
// PostgreSQL runtime is available, mandatory in CI via the
// docker-monitoring-postgres16 job. Uses an isolated schema per run.
const databaseUrl = process.env.VPS_MANAGER_TEST_POSTGRES_URL;

describe("013 docker monitoring migration (real PostgreSQL)", () => {
  it.skipIf(!databaseUrl)(
    "applies against a pre-013 schema and enforces shape",
    async () => {
      const admin = new pg.Pool({ connectionString: databaseUrl });
      const schema = `vps_manager_test_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`;
      await admin.query(`CREATE SCHEMA "${schema}"`);
      const pool = new pg.Pool({
        connectionString: databaseUrl,
        options: `-c search_path=${schema}`,
      });
      const migrationDir = await mkdtemp(
        join(tmpdir(), "vps-manager-migrations-"),
      );
      try {
        await pool.query(
          `CREATE TABLE vps (` +
            `id text PRIMARY KEY, name text NOT NULL, host text NOT NULL, ` +
            `port integer NOT NULL, username text NOT NULL, ` +
            `created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL)`,
        );
        await pool.query(
          `INSERT INTO vps (id, name, host, port, username, created_at, updated_at) ` +
            `VALUES ('vps_seed', 'seed', 'host', 22, 'root', now(), now())`,
        );

        const migration = (await loadMigrations()).find(
          (m) => m.id === "013_docker_monitoring.sql",
        )!;
        await pool.query(migration.sql);

        // Ordinary PostgreSQL only: no Timescale functions.
        expect(migration.sql).not.toMatch(/create_hypertable/i);
        expect(migration.sql).not.toMatch(/timescaledb/i);

        // Expected tables exist.
        const tables = await pool.query(
          `SELECT tablename FROM pg_tables WHERE schemaname = current_schema() ` +
            `AND tablename LIKE 'docker_%' ORDER BY tablename`,
        );
        expect(tables.rows.map((r) => r.tablename)).toEqual([
          "docker_alerts",
          "docker_event_watermarks",
          "docker_ingest_batches",
          "docker_metric_rollups",
          "docker_metric_samples",
          "docker_operational_events",
          "docker_storage_latest",
        ]);

        // Explicit null semantics: container_key/coverage nullable, core keys NOT NULL.
        const nullability = await pool.query(
          `SELECT column_name, is_nullable FROM information_schema.columns ` +
            `WHERE table_name = 'docker_metric_samples' AND column_name IN ` +
            `('container_key', 'coverage', 'metrics', 'vps_id', 'effective_at')`,
        );
        const byColumn = new Map(
          nullability.rows.map((r) => [r.column_name, r.is_nullable]),
        );
        expect(byColumn.get("container_key")).toBe("YES");
        expect(byColumn.get("coverage")).toBe("YES");
        expect(byColumn.get("metrics")).toBe("NO");
        expect(byColumn.get("vps_id")).toBe("NO");
        expect(byColumn.get("effective_at")).toBe("NO");

        // Unique replay/dedupe keys exist.
        const uniq = await pool.query(
          `SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() ` +
            `AND indexname IN ('docker_metric_samples_replay_uidx', ` +
            `'docker_metric_rollups_dedupe_uidx') ORDER BY indexname`,
        );
        expect(uniq.rows.map((r) => r.indexname)).toEqual([
          "docker_metric_rollups_dedupe_uidx",
          "docker_metric_samples_replay_uidx",
        ]);
        const eventUq = await pool.query(
          `SELECT c.conname FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid ` +
            `WHERE t.relname = 'docker_operational_events' AND c.contype = 'u'`,
        );
        expect(eventUq.rowCount).toBeGreaterThanOrEqual(1);
        const batchUq = await pool.query(
          `SELECT count(*)::int AS n FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid ` +
            `WHERE t.relname = 'docker_ingest_batches' AND c.contype = 'u'`,
        );
        expect(batchUq.rows[0].n).toBeGreaterThanOrEqual(1);

        // Rollup formula/cohort fields exist.
        const rollupCols = await pool.query(
          `SELECT column_name FROM information_schema.columns ` +
            `WHERE table_name = 'docker_metric_rollups'`,
        );
        const rollupNames = new Set(rollupCols.rows.map((r) => r.column_name));
        for (const col of [
          "formula_version",
          "cohort_digest",
          "coverage_ratio",
          "expected_samples",
          "observed_samples",
          "partial_sample_count",
          "gap_count",
          "gauge_min",
          "gauge_max",
          "gauge_sum",
          "gauge_average",
          "counter_first",
          "counter_last",
          "counter_increase",
          "reset_count",
        ]) {
          expect(rollupNames.has(col)).toBe(true);
        }

        // Typed event columns exist.
        const eventCols = await pool.query(
          `SELECT column_name FROM information_schema.columns ` +
            `WHERE table_name = 'docker_operational_events'`,
        );
        const eventNames = new Set(eventCols.rows.map((r) => r.column_name));
        for (const col of [
          "action",
          "health_status",
          "exit_code",
          "signal",
          "oom_killed",
          "event_digest",
          "context_version",
        ]) {
          expect(eventNames.has(col)).toBe(true);
        }

        // Storage support/estimate fields exist (jsonb categories).
        const storageCols = await pool.query(
          `SELECT column_name FROM information_schema.columns ` +
            `WHERE table_name = 'docker_storage_latest'`,
        );
        const storageNames = new Set(storageCols.rows.map((r) => r.column_name));
        for (const col of [
          "images",
          "containers",
          "local_volumes",
          "build_cache",
          "formula_version",
        ]) {
          expect(storageNames.has(col)).toBe(true);
        }

        // Watermarks/batches shape.
        const wmCols = await pool.query(
          `SELECT column_name FROM information_schema.columns ` +
            `WHERE table_name = 'docker_event_watermarks'`,
        );
        expect(new Set(wmCols.rows.map((r) => r.column_name)).has("committed_batch_id")).toBe(
          true,
        );

        // Alert active fingerprint uniqueness is a partial unique index.
        const alertIdx = await pool.query(
          `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = current_schema() ` +
            `AND indexname = 'docker_alerts_active_fingerprint_uidx'`,
        );
        expect(alertIdx.rows).toHaveLength(1);
        expect(alertIdx.rows[0].indexdef).toMatch(/WHERE/i);
        expect(alertIdx.rows[0].indexdef).toMatch(/open/);
        expect(alertIdx.rows[0].indexdef).toMatch(/acknowledged/);

        // Behavioral: replay dedupe + active fingerprint enforcement.
        await pool.query(
          `INSERT INTO docker_metric_samples ` +
            `(id, vps_id, agent_instance_id, snapshot_id, container_key, collected_at, received_at, effective_at, metrics) ` +
            `VALUES ('s1', 'vps_seed', 'inst1', 'snap1', NULL, now(), now(), now(), '{}')`,
        );
        await expect(
          pool.query(
            `INSERT INTO docker_metric_samples ` +
              `(id, vps_id, agent_instance_id, snapshot_id, container_key, collected_at, received_at, effective_at, metrics) ` +
              `VALUES ('s2', 'vps_seed', 'inst1', 'snap1', NULL, now(), now(), now(), '{}')`,
          ),
        ).rejects.toThrow();
        await pool.query(
          `INSERT INTO docker_alerts ` +
            `(id, vps_id, rule_kind, state, fingerprint, opened_at, occurrences, summary, context_version) ` +
            `VALUES ('a1', 'vps_seed', 'k', 'open', 'fp1', now(), 1, 's', 1)`,
        );
        await expect(
          pool.query(
            `INSERT INTO docker_alerts ` +
              `(id, vps_id, rule_kind, state, fingerprint, opened_at, occurrences, summary, context_version) ` +
              `VALUES ('a2', 'vps_seed', 'k', 'acknowledged', 'fp1', now(), 1, 's', 1)`,
          ),
        ).rejects.toThrow();
        // Resolved fingerprints may repeat (not covered by the active index).
        await pool.query(
          `INSERT INTO docker_alerts ` +
            `(id, vps_id, rule_kind, state, fingerprint, opened_at, occurrences, summary, context_version) ` +
            `VALUES ('a3', 'vps_seed', 'k', 'resolved', 'fp1', now(), 1, 's', 1)`,
        );

        // Direct SQL rerun is idempotent and preserves existing data.
        await pool.query(migration.sql);
        expect(
          (await pool.query(`SELECT id FROM docker_metric_samples`)).rows,
        ).toHaveLength(1);

        // Behavioral cascade: docker rows follow their VPS on delete.
        await pool.query(`DELETE FROM vps WHERE id = 'vps_seed'`);
        expect(
          (await pool.query(`SELECT * FROM docker_metric_samples`)).rows,
        ).toHaveLength(0);
        expect(
          (await pool.query(`SELECT * FROM docker_alerts`)).rows,
        ).toHaveLength(0);

        // Real runner ledger: apply-once against this isolated schema.
        await writeFile(
          join(migrationDir, "013_docker_monitoring.sql"),
          migration.sql,
        );
        const first = await runMigrations(pool, {
          migrationsDir: migrationDir,
        });
        expect(first.applied).toContain("013_docker_monitoring.sql");
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
