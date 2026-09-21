import { describe, expect, it } from "vitest";
import { loadMigrations } from "../src/db/migrations.js";

describe("016 docker alert resolution migration", () => {
  it("is ordered after alert storage and adds the constrained resolution reason", async () => {
    const migrations = await loadMigrations();
    const ids = migrations.map((migration) => migration.id);
    const index013 = ids.indexOf("013_docker_monitoring.sql");
    const index016 = ids.indexOf("016_docker_alert_resolution.sql");
    const migration = migrations[index016];

    // Objective: migration 016 must run after docker_alerts exists and enforce allowed reasons.
    expect(index013).toBeGreaterThanOrEqual(0);
    expect(index016).toBeGreaterThan(index013);
    expect(migration?.sql).toContain("ADD COLUMN IF NOT EXISTS resolution_reason text");
    expect(migration?.sql).toContain("docker_alerts_resolution_reason_check");
    expect(migration?.sql).toContain("monitoring_disabled");
    expect(migration?.sql).toContain("vps_deleted");
    expect(migration?.sql).toContain("condition_cleared");
    expect(migration?.sql).toContain("container_removed");
  });
});
