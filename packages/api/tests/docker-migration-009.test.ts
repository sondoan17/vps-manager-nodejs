import { describe, expect, it } from "vitest";
import { loadMigrations, runMigrations } from "../src/db/migrations.js";

// Phase 1 baseline (ledger scope only): migration 009 must stay registered as a
// required (non-optional) migration and the runner must apply it once then skip
// on re-run. This file proves runner ledger semantics with a fake pool. It does
// NOT prove PostgreSQL SQL idempotence — see
// docker-migration-009.postgres.test.ts for real-DB execution evidence
// (pre-009 schema → apply 009 → verify shape → re-execute 009 SQL directly).

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
      // Migration body.
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

describe("009 docker metrics migration (phase 1 baseline)", () => {
  it("is registered and selected as a required core migration", async () => {
    const migrations = await loadMigrations();
    const ids = migrations.map((m) => m.id);
    expect(ids).toContain("009_docker_metrics.sql");

    const migration = migrations.find((m) => m.id === "009_docker_metrics.sql");
    expect(migration).toBeDefined();
    expect(migration!.sql).toContain(
      "ALTER TABLE vps ADD COLUMN IF NOT EXISTS docker_metrics_enabled",
    );
    expect(migration!.sql).toContain(
      "CREATE TABLE IF NOT EXISTS agent_docker_metrics",
    );
  });

  it("uses only guarded DDL statements (static shape hint, not SQL execution proof)", async () => {
    const migrations = await loadMigrations();
    const migration = migrations.find((m) => m.id === "009_docker_metrics.sql");
    expect(migration).toBeDefined();
    const sql = migration!.sql;

    // Static hint only — real re-execution proof lives in the Postgres test.
    expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN)\b/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS docker_metrics_enabled/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS agent_docker_metrics/i);
  });

  it("runner applies once and skips on re-run via ledger (fake pool)", async () => {
    const { pool, applied, executedSql } = createFakePool();

    const first = await runMigrations(pool, {});
    expect(first.applied).toContain("009_docker_metrics.sql");
    expect(applied.has("009_docker_metrics.sql")).toBe(true);
    const executionsAfterFirst = executedSql.filter((sql) =>
      sql.includes("agent_docker_metrics"),
    ).length;
    expect(executionsAfterFirst).toBeGreaterThanOrEqual(1);

    const second = await runMigrations(pool, {});
    expect(second.applied).toEqual([]);
    const executionsAfterSecond = executedSql.filter((sql) =>
      sql.includes("agent_docker_metrics"),
    ).length;
    expect(executionsAfterSecond).toBe(executionsAfterFirst);
  });
});
