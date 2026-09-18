import { describe, expect, it } from "vitest";
import { loadMigrations, runMigrations } from "../src/db/migrations.js";

// I1 lane (ledger scope only): migration 013 must stay registered as a
// required (non-optional) migration and the runner must apply it once then
// skip on re-run. This file proves runner ledger semantics with a fake pool.
// Real PostgreSQL execution evidence lives in
// docker-migration-013.postgres.test.ts.

function createFakePool() {
  const applied = new Set<string>();
  const executedSql: string[] = [];

  const fakeClient = {
    queries: [] as string[],
    async query(sql: string, params?: unknown[]) {
      this.queries.push(sql);
      if (sql.includes("SELECT id FROM schema_migrations WHERE id")) {
        const id = (params as string[])?.[0] ?? "";
        const exists = applied.has(id);
        return { rowCount: exists ? 1 : 0, rows: exists ? [{ id }] : [] };
      }
      if (sql.startsWith("INSERT INTO schema_migrations")) {
        const id = (params as string[])?.[0] ?? "";
        applied.add(id);
        return { rowCount: 1, rows: [] };
      }
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return { rowCount: 0, rows: [] };
      }
      executedSql.push(sql);
      return { rowCount: 0, rows: [] };
    },
    release() {},
  };

  const pool = {
    async query(sql: string) {
      executedSql.push(sql);
      return { rowCount: 0, rows: [] };
    },
    async connect() {
      return fakeClient;
    },
    async end() {},
  };

  return { pool: pool as never, applied, executedSql };
}

describe("013 docker monitoring migration (I1 baseline)", () => {
  it("is registered and selected as a required core migration", async () => {
    const migrations = await loadMigrations();
    const ids = migrations.map((m) => m.id);
    expect(ids).toContain("013_docker_monitoring.sql");

    const migration = migrations.find((m) => m.id === "013_docker_monitoring.sql");
    expect(migration).toBeDefined();
    expect(migration!.sql).toContain("CREATE TABLE IF NOT EXISTS docker_metric_samples");
    expect(migration!.sql).toContain("CREATE TABLE IF NOT EXISTS docker_metric_rollups");
    expect(migration!.sql).toContain("CREATE TABLE IF NOT EXISTS docker_operational_events");
    expect(migration!.sql).toContain("CREATE TABLE IF NOT EXISTS docker_storage_latest");
    expect(migration!.sql).toContain("CREATE TABLE IF NOT EXISTS docker_event_watermarks");
    expect(migration!.sql).toContain("CREATE TABLE IF NOT EXISTS docker_ingest_batches");
    expect(migration!.sql).toContain("CREATE TABLE IF NOT EXISTS docker_alerts");
  });

  it("uses ordinary PostgreSQL DDL only (no Timescale functions)", async () => {
    const migrations = await loadMigrations();
    const migration = migrations.find((m) => m.id === "013_docker_monitoring.sql");
    expect(migration).toBeDefined();
    const sql = migration!.sql;

    expect(sql).not.toMatch(/create_hypertable/i);
    expect(sql).not.toMatch(/timescaledb/i);
    expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN)\b/i);
    // Guarded DDL throughout.
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS docker_metric_samples/i);
    expect(sql).toMatch(/CREATE (UNIQUE )?INDEX IF NOT EXISTS/i);
    // Replay/dedupe keys and active alert fingerprint uniqueness.
    expect(sql).toMatch(/docker_metric_samples_replay_uidx/i);
    expect(sql).toMatch(/docker_metric_rollups_dedupe_uidx/i);
    expect(sql).toMatch(/UNIQUE \(vps_id, agent_instance_id, event_digest\)/i);
    expect(sql).toMatch(/UNIQUE \(vps_id, agent_instance_id, request_digest\)/i);
    expect(sql).toMatch(/docker_alerts_active_fingerprint_uidx/i);
    // Rollup formula/cohort fields.
    expect(sql).toMatch(/formula_version/i);
    expect(sql).toMatch(/cohort_digest/i);
    expect(sql).toMatch(/coverage_ratio/i);
    // Exhaustive rollup scope/null/cohort semantics.
    expect(sql).toMatch(/docker_metric_rollups_scope_semantics/i);
    expect(sql).toMatch(/scope = 'host' AND container_key IS NULL AND cohort_digest IS NULL/i);
    expect(sql).toMatch(/scope = 'container' AND container_key IS NOT NULL[\s\S]*?AND cohort_digest IS NULL/i);
    expect(sql).toMatch(/scope = 'aggregate' AND container_key IS NULL AND cohort_digest IS NOT NULL/i);
    // Typed event columns.
    expect(sql).toMatch(/health_status/i);
    expect(sql).toMatch(/exit_code/i);
    expect(sql).toMatch(/oom_killed/i);
    // Storage estimate fields.
    expect(sql).toMatch(/local_volumes/i);
    expect(sql).toMatch(/build_cache/i);
    // Watermarks/batches.
    expect(sql).toMatch(/docker_event_watermarks/i);
    expect(sql).toMatch(/docker_ingest_batches/i);
    expect(sql).toMatch(/committed_batch_id/i);
  });

  it("runner applies once and skips on re-run via ledger (fake pool)", async () => {
    const { pool, applied, executedSql } = createFakePool();

    const first = await runMigrations(pool, {});
    expect(first.applied).toContain("013_docker_monitoring.sql");
    expect(applied.has("013_docker_monitoring.sql")).toBe(true);
    const executionsAfterFirst = executedSql.filter((sql) =>
      sql.includes("docker_metric_samples"),
    ).length;
    expect(executionsAfterFirst).toBeGreaterThanOrEqual(1);

    const second = await runMigrations(pool, {});
    expect(second.applied).toEqual([]);
    const executionsAfterSecond = executedSql.filter((sql) =>
      sql.includes("docker_metric_samples"),
    ).length;
    expect(executionsAfterSecond).toBe(executionsAfterFirst);
  });
});
