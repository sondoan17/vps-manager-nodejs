import { describe, expect, it } from "vitest";
import { loadMigrations, runMigrations } from "../src/db/migrations.js";

function fakePool() {
  const applied = new Set<string>(); const executed: string[] = [];
  const client = { async query(sql: string, params?: string[]) {
    if (sql.includes("SELECT id FROM schema_migrations")) return { rowCount: applied.has(params?.[0] ?? "") ? 1 : 0, rows: [] };
    if (sql.startsWith("INSERT INTO schema_migrations")) { applied.add(params?.[0] ?? ""); return { rowCount: 1, rows: [] }; }
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) return { rowCount: 0, rows: [] };
    executed.push(sql); return { rowCount: 0, rows: [] };
  }, release() {} };
  return { pool: { async query(sql: string) { executed.push(sql); return { rowCount: 0, rows: [] }; }, async connect() { return client; } } as never, applied, executed };
}

describe("014 Docker ingest foundation migration", () => {
  it("is registered, ordinary PostgreSQL, guarded, constrained, and leaves 013 untouched", async () => {
    const migrations = await loadMigrations();
    const m = migrations.find(x => x.id === "014_docker_ingest.sql");
    const prior = migrations.find(x => x.id === "013_docker_monitoring.sql");
    expect(m).toBeDefined(); expect(prior).toBeDefined();
    expect(m!.sql).toMatch(/CREATE TABLE IF NOT EXISTS docker_snapshot_ledger/i);
    expect(m!.sql).toMatch(/docker_ingest_latest|docker_ingest_batch_results/i);
    expect(m!.sql).toMatch(/source_sequence numeric\(78,0\)/i);
    expect(m!.sql).toMatch(/CHECK \(source_sequence > 0\)/i);
    expect(m!.sql).toMatch(/UNIQUE \(vps_id,agent_instance_id,source_sequence\)/i);
    expect(m!.sql).toMatch(/PRIMARY KEY \(vps_id,batch_id\)/i);
    expect(m!.sql).not.toMatch(/timescale|create_hypertable/i);
    expect(m!.sql).not.toMatch(/\bDROP\b|\bALTER\s+TABLE/i);
    expect(prior!.sql).not.toMatch(/docker_snapshot_ledger/i);
  });

  it("applies 014 once and skips it on replay", async () => {
    const { pool, applied, executed } = fakePool();
    const first = await runMigrations(pool, {}); expect(first.applied).toContain("014_docker_ingest.sql");
    expect(applied.has("014_docker_ingest.sql")).toBe(true);
    const count = executed.filter(x => x.includes("docker_snapshot_ledger")).length;
    expect(count).toBe(1);
    expect((await runMigrations(pool, {})).applied).toEqual([]);
    expect(executed.filter(x => x.includes("docker_snapshot_ledger")).length).toBe(count);
  });
});
