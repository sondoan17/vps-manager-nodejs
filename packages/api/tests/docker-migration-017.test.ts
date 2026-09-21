import { describe, expect, it } from "vitest";
import { loadMigrations } from "../src/db/migrations.js";

describe("017 Docker v1 unified backfill migration", () => {
  it("is registered after the unified schema and preserves only supported fields", async () => {
    const migrations = await loadMigrations();
    const ids = migrations.map((migration) => migration.id);
    expect(ids.indexOf("017_docker_v1_unified_backfill.sql")).toBeGreaterThan(
      ids.indexOf("016_docker_alert_resolution.sql"),
    );
    const sql = migrations.find(
      (migration) => migration.id === "017_docker_v1_unified_backfill.sql",
    )!.sql;
    expect(sql).toContain("INSERT INTO docker_metric_samples");
    expect(sql).toContain("FROM agent_docker_metrics AS m");
    expect(sql).not.toMatch(/schema_version/i);
  });
});
