import { describe, expect, it, vi } from "vitest";
import { parseAppConfig } from "../src/config/app-config.js";
import { DockerMonitoringService } from "../src/docker/docker-monitoring.service.js";
import { DOCKER_MONITORING_CAPS } from "../src/persistence/repositories/docker-monitoring.repository.js";

function makeService(repo: unknown, config: unknown) {
  const vps = { get: vi.fn(async () => ({ id: "vps-a" })) };
  return new DockerMonitoringService(repo as never, vps as never, config as never);
}

describe("docker retention config", () => {
  it("defaults retention maintenance settings", () => {
    expect(parseAppConfig({} as NodeJS.ProcessEnv)).toMatchObject({
      dockerRetentionDays: 7,
      dockerRollupRetentionDays: 30,
      dockerResolvedAlertRetentionDays: 30,
      dockerMaintenanceSamplesPerVps: 5000,
      dockerMaintenanceEventsPerVps: 10000,
      dockerJsonMaxBytes: 32 * 1024 * 1024,
      dockerJsonMaintenanceMaxRewriteBytes: 8 * 1024 * 1024,
    });
  });

  it("accepts valid retention overrides", () => {
    const parsed = parseAppConfig({
      DOCKER_RETENTION_DAYS: "14",
      DOCKER_MAINTENANCE_SAMPLES_PER_VPS: "100",
      DOCKER_MAINTENANCE_EVENTS_PER_VPS: "200",
      DOCKER_JSON_MAX_BYTES: "1000000",
      DOCKER_JSON_MAINTENANCE_MAX_REWRITE_BYTES: "500000",
    } as unknown as NodeJS.ProcessEnv);
    expect(parsed.dockerRetentionDays).toBe(14);
    expect(parsed.dockerMaintenanceSamplesPerVps).toBe(100);
    expect(parsed.dockerMaintenanceEventsPerVps).toBe(200);
    expect(parsed.dockerJsonMaxBytes).toBe(1000000);
    expect(parsed.dockerJsonMaintenanceMaxRewriteBytes).toBe(500000);
  });

  it("rejects out-of-range retention settings", () => {
    expect(() => parseAppConfig({ DOCKER_RETENTION_DAYS: "0" } as unknown as NodeJS.ProcessEnv)).toThrow();
    expect(() => parseAppConfig({ DOCKER_RETENTION_DAYS: "91" } as unknown as NodeJS.ProcessEnv)).toThrow();
    expect(() => parseAppConfig({ DOCKER_MAINTENANCE_SAMPLES_PER_VPS: "0" } as unknown as NodeJS.ProcessEnv)).toThrow();
    expect(() => parseAppConfig({ DOCKER_MAINTENANCE_SAMPLES_PER_VPS: "5001" } as unknown as NodeJS.ProcessEnv)).toThrow();
    expect(() => parseAppConfig({ DOCKER_MAINTENANCE_EVENTS_PER_VPS: "10001" } as unknown as NodeJS.ProcessEnv)).toThrow();
    expect(() => parseAppConfig({ DOCKER_JSON_MAX_BYTES: "0" } as unknown as NodeJS.ProcessEnv)).toThrow();
    expect(() => parseAppConfig({ DOCKER_JSON_MAX_BYTES: String(32 * 1024 * 1024 + 1) } as unknown as NodeJS.ProcessEnv)).toThrow();
    expect(() => parseAppConfig({ DOCKER_JSON_MAINTENANCE_MAX_REWRITE_BYTES: String(8 * 1024 * 1024 + 1) } as unknown as NodeJS.ProcessEnv)).toThrow();
  });
});

describe("DockerMonitoringService.runMaintenance", () => {
  it("derives strict cutoff from retention days and delegates with capped options", async () => {
    const prune = vi.fn(async () => ({ samplesRemoved: 3, eventsRemoved: 1 }));
    const service = makeService({ pruneSamplesEventsAndStorage: prune }, {
      dockerRetentionDays: 7,
      dockerRollupRetentionDays: 30,
      dockerResolvedAlertRetentionDays: 30,
      dockerMaintenanceSamplesPerVps: 5000,
      dockerMaintenanceEventsPerVps: 10000,
    });
    const result = await service.runMaintenance("2026-02-08T00:00:00.000Z");
    expect(result).toMatchObject({ samplesRemoved: 3, eventsRemoved: 1, pass: { retentionDays: 7, samplesPerVps: 5000, eventsPerVps: 10000 } });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(prune).toHaveBeenCalledTimes(1);
    expect(prune).toHaveBeenCalledWith({
      cutoff: "2026-02-01T00:00:00.000Z",
      rollupCutoff: "2026-01-09T00:00:00.000Z",
      alertCutoff: "2026-01-09T00:00:00.000Z",
      samplesPerVps: 5000,
      eventsPerVps: 10000,
    });
  });

  it("clamps caps to repository bounds and returns bounded result shape", async () => {
    const prune = vi.fn(async () => ({ samplesRemoved: 1, eventsRemoved: 2, extra: "ignored" }));
    const service = makeService({ pruneSamplesEventsAndStorage: prune }, {
      dockerRetentionDays: 1,
      dockerMaintenanceSamplesPerVps: 999999,
      dockerMaintenanceEventsPerVps: 999999,
    });
    const result = await service.runMaintenance("2026-02-02T00:00:00.000Z");
    expect(result).toMatchObject({ samplesRemoved: 1, eventsRemoved: 2, pass: { retentionDays: 1, samplesPerVps: DOCKER_MONITORING_CAPS.samplesPerVps, eventsPerVps: DOCKER_MONITORING_CAPS.eventsPerVps } });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(prune).toHaveBeenCalledWith({
      cutoff: "2026-02-01T00:00:00.000Z",
      rollupCutoff: "2026-01-03T00:00:00.000Z",
      alertCutoff: "2026-01-03T00:00:00.000Z",
      samplesPerVps: DOCKER_MONITORING_CAPS.samplesPerVps,
      eventsPerVps: DOCKER_MONITORING_CAPS.eventsPerVps,
    });
  });

  it("returns zeros when repository has no prune support", async () => {
    const service = makeService({}, { dockerRetentionDays: 7 });
    await expect(service.runMaintenance("2026-02-08T00:00:00.000Z")).resolves.toEqual({
      samplesRemoved: 0,
      eventsRemoved: 0,
    });
  });

  it("rejects invalid now and invalid retention config", async () => {
    const prune = vi.fn(async () => ({ samplesRemoved: 0, eventsRemoved: 0 }));
    await expect(makeService({ pruneSamplesEventsAndStorage: prune }, undefined).runMaintenance("not-a-date")).rejects.toThrow(/now/i);
    await expect(makeService({ pruneSamplesEventsAndStorage: prune }, { dockerRetentionDays: 0 }).runMaintenance("2026-02-08T00:00:00.000Z")).rejects.toThrow(/retention/i);
    expect(prune).not.toHaveBeenCalled();
  });
});
