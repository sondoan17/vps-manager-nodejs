import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createJsonDockerMonitoringRepository,
  DOCKER_MONITORING_CAPS,
  seedDockerMonitoringForTests,
} from "../src/persistence/repositories/docker-monitoring.repository.js";
import type { DockerHostSample } from "../src/docker/docker-monitoring.models.js";

const vpsId = "vps-rollup";
const now = "2026-09-19T12:34:00.000Z";
let dir: string;

function sample(id: string, effectiveAt: string, metrics: Record<string, number>, snapshotId = id, agentInstanceId = "agent-1"): DockerHostSample {
  return { id, vpsId, agentInstanceId, snapshotId, collectedAt: effectiveAt, receivedAt: effectiveAt, effectiveAt, metrics };
}

async function arrange(samples: DockerHostSample[]) {
  const file = join(dir, "docker-monitoring.json");
  await seedDockerMonitoringForTests(file, { samples });
  return createJsonDockerMonitoringRepository(file);
}

beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), "docker-rollup-")); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

describe("JSON rollupHostGauges", () => {
  it("rolls closed UTC buckets, applies the allowlist, and exposes observed-only fields", async () => {
    // Objective (positive): completed UTC hours produce allowlisted observed gauge rollups only.
    // Arrange
    const repo = await arrange([
      sample("a", "2026-09-19T10:10:00.000Z", { cpuPercent: 20, memoryUsageBytes: 100, ignored: 999 }),
      sample("b", "2026-09-19T10:45:00.000Z", { cpuPercent: 40, memoryUsageBytes: 200 }),
      sample("dup", "2026-09-19T09:10:00.000Z", { cpuPercent: 1 }, "same-snapshot"),
      sample("dup-new", "2026-09-19T09:20:00.000Z", { cpuPercent: 3 }, "same-snapshot"),
      sample("open", "2026-09-19T12:05:00.000Z", { cpuPercent: 99 }),
    ]);

    // Act
    const rows = await repo.rollupHostGauges!({ vpsId, now });

    // Assert
    expect(rows).toHaveLength(3);
    expect(rows.find((row) => row.metricName === "cpuPercent" && row.bucketStart === "2026-09-19T10:00:00.000Z")).toMatchObject({ gaugeMin: 20, gaugeMax: 40, sampleCount: 2, expectedSamples: 2, observedSamples: 2, gapCount: 0, coverageRatio: 1 });
    expect(rows.every((row) => ["cpuPercent", "memoryUsageBytes"].includes(row.metricName!))).toBe(true);
    expect(rows.some((row) => row.bucketStart === "2026-09-19T12:00:00.000Z")).toBe(false);
    expect(rows.find((row) => row.bucketStart === "2026-09-19T09:00:00.000Z" && row.metricName === "cpuPercent")?.gaugeAverage).toBe(3);
  });

  it("excludes samples outside the 30-day window and is idempotent", async () => {
    // Objective (positive): retention cutoff and repeated execution must yield stable rollups.
    // Arrange
    const repo = await arrange([
      sample("old", "2026-08-20T11:00:00.000Z", { cpuPercent: 1 }),
      sample("kept", "2026-08-21T12:00:00.000Z", { cpuPercent: 2 }),
    ]);

    // Act
    const first = await repo.rollupHostGauges!({ vpsId, now });
    const second = await repo.rollupHostGauges!({ vpsId, now });
    const persisted = await repo.listRollups({ vpsId, limit: 10 });

    // Assert
    expect(first).toHaveLength(1);
    expect(first).toEqual(second);
    expect(persisted.data).toEqual(first);
  });

  it("enforces the per-VPS rollup cap", async () => {
    // Objective (negative/boundary): excessive rollups must not exceed rollupsPerVps.
    // Arrange
    const samples = Array.from({ length: DOCKER_MONITORING_CAPS.rollupsPerVps + 1 }, (_, i) => {
      const at = new Date(Date.parse("2026-08-21T00:00:00.000Z") + (i % 720) * 60 * 60 * 1000).toISOString();
      return sample(`cap-${i}`, at, { cpuPercent: i, memoryUsageBytes: i }, `cap-${i}`, `agent-${i % 4}`);
    });
    const repo = await arrange(samples);

    // Act
    await repo.rollupHostGauges!({ vpsId, now });
    const persisted = await repo.listRollups({ vpsId, limit: DOCKER_MONITORING_CAPS.rollupsPerVps + 1 });

    // Assert
    expect(persisted.data.length).toBeLessThanOrEqual(DOCKER_MONITORING_CAPS.rollupsPerVps);
  });
});
