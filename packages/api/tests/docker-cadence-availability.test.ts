import { describe, expect, it, vi } from "vitest";
import { agentMetricPayloadSchema } from "../src/agents/agent.schemas.js";
import { DockerMonitoringService } from "../src/docker/docker-monitoring.service.js";
import type { AgentDockerMetricsInputV2 } from "../src/agents/agent.models.js";
import type { DockerV2IngestUnit } from "../src/docker/docker-monitoring.models.js";

function corePayload() {
  return {
    cpu: 10,
    memory: 20,
    disk: 30,
    loadAverage: 0.5,
    networkRx: 100,
    networkTx: 100,
    uptime: 60,
    collectedAt: new Date().toISOString(),
    agentVersion: "1.0.0",
  };
}

function validV2Docker(overrides: Record<string, unknown> = {}) {
  return {
    collectedAt: new Date().toISOString(),
    schemaVersion: 2 as const,
    agentInstanceId: "instance_abc123",
    snapshotId: "snap_abc123",
    sourceSequence: "1",
    available: true,
    containerTotal: 0,
    containerRunning: 0,
    cpuPercent: 0,
    memoryUsageBytes: 0,
    networkRxBytes: 0,
    networkTxBytes: 0,
    blockReadBytes: 0,
    blockWriteBytes: 0,
    pids: 0,
    containers: [],
    ...overrides,
  };
}

describe("docker cadence/availability contract", () => {
  it("serializes optional monitoring metadata under a nested object", () => {
    const parsed = agentMetricPayloadSchema.parse({
      ...corePayload(),
      docker: validV2Docker({
        monitoring: { effectiveCadenceSeconds: 60, availability: "available", state: "enabled" },
      }),
    });
    const docker = parsed.docker as AgentDockerMetricsInputV2;
    expect(docker.schemaVersion).toBe(2);
    if (docker.schemaVersion !== 2) throw new Error("expected v2");
    expect(docker.monitoring).toEqual({
      effectiveCadenceSeconds: 60,
      availability: "available",
      state: "enabled",
    });
  });

  it("keeps old payloads without monitoring valid", () => {
    const parsed = agentMetricPayloadSchema.parse({ ...corePayload(), docker: validV2Docker() });
    const docker = parsed.docker as AgentDockerMetricsInputV2;
    if (docker.schemaVersion !== 2) throw new Error("expected v2");
    expect(docker.monitoring).toBeUndefined();
  });

  it("rejects invalid monitoring values safely", () => {
    const bad = [
      { effectiveCadenceSeconds: 0, availability: "available", state: "enabled" },
      { effectiveCadenceSeconds: -5, availability: "available", state: "enabled" },
      { effectiveCadenceSeconds: 86401, availability: "available", state: "enabled" },
      { effectiveCadenceSeconds: 1.5, availability: "available", state: "enabled" },
      { effectiveCadenceSeconds: 60, availability: "sometimes", state: "enabled" },
      { effectiveCadenceSeconds: 60, availability: "available", state: "running" },
      { effectiveCadenceSeconds: 60, availability: "available", state: "enabled", extra: 1 },
    ];
    for (const monitoring of bad) {
      expect(() =>
        agentMetricPayloadSchema.parse({ ...corePayload(), docker: validV2Docker({ monitoring }) }),
      ).toThrow();
    }
    // Missing a required nested field also fails closed.
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV2Docker({ monitoring: { availability: "available", state: "enabled" } }),
      }),
    ).toThrow();
  });

  it("maps monitoring into the ingest unit in a typed way", async () => {
    let captured: DockerV2IngestUnit | undefined;
    const repository = {
      ingestV2Unit: vi.fn(async (unit: DockerV2IngestUnit) => {
        captured = unit;
        return {
          vpsId: unit.vpsId,
          ingestStatus: "committed" as const,
          snapshotId: unit.snapshotId,
          agentInstanceId: unit.agentInstanceId,
          receivedAt: unit.receivedAt,
          revision: 1,
        };
      }),
    };
    const vps = { get: vi.fn(async () => ({ id: "vps-1" })) };
    const service = new DockerMonitoringService(repository as never, vps as never);
    const input = validV2Docker({
      monitoring: { effectiveCadenceSeconds: 30, availability: "unavailable", state: "disabled" },
    }) as unknown as AgentDockerMetricsInputV2;

    await service.ingestV2("vps-1", input, new Date().toISOString());
    expect(repository.ingestV2Unit).toHaveBeenCalledTimes(1);
    expect(captured?.monitoring).toEqual({
      effectiveCadenceSeconds: 30,
      availability: "unavailable",
      state: "disabled",
    });
  });

  it("maps sampled aggregate into the host sample only when present", async () => {
    const units: DockerV2IngestUnit[] = [];
    const repository = { ingestV2Unit: vi.fn(async (unit: DockerV2IngestUnit) => {
      units.push(unit);
      return { vpsId: unit.vpsId, ingestStatus: "committed" as const, snapshotId: unit.snapshotId, agentInstanceId: unit.agentInstanceId, receivedAt: unit.receivedAt, revision: 1 };
    }) };
    const service = new DockerMonitoringService(repository as never, { get: vi.fn(async () => ({ id: "vps-1" })) } as never);
    const aggregate = { coverage: { detailsSampled: 1, detailsTotalEligible: 2, complete: false, cohortDigest: "a".repeat(64) }, cpuPercent: 1, memoryUsageBytes: 2, networkRxBytes: 3, networkTxBytes: 4, blockReadBytes: 5, blockWriteBytes: 6, pids: 7 };
    const input = validV2Docker({ sampledContainerAggregate: aggregate }) as unknown as AgentDockerMetricsInputV2;
    await service.ingestV2("vps-1", input, "2026-01-01T00:00:00.000Z");
    await service.ingestV2("vps-1", input, "2026-01-01T00:00:01.000Z");
    expect(units[0].hostSample.coverage).toEqual(aggregate.coverage);
    expect(units[0].hostSample.metrics.sampledContainerAggregateCpuPercent).toBe(1);
    expect(units[0].requestDigest).toBe(units[1].requestDigest);

    await service.ingestV2("vps-1", validV2Docker() as unknown as AgentDockerMetricsInputV2, "2026-01-01T00:00:00.000Z");
    expect(units[2].hostSample.coverage).toBeUndefined();
    expect(units[2].hostSample.metrics.sampledContainerAggregateCpuPercent).toBeUndefined();
  });

  it("maps absent monitoring to an absent unit field", async () => {
    let captured: DockerV2IngestUnit | undefined;
    const repository = {
      ingestV2Unit: vi.fn(async (unit: DockerV2IngestUnit) => {
        captured = unit;
        return {
          vpsId: unit.vpsId,
          ingestStatus: "committed" as const,
          snapshotId: unit.snapshotId,
          agentInstanceId: unit.agentInstanceId,
          receivedAt: unit.receivedAt,
          revision: 1,
        };
      }),
    };
    const vps = { get: vi.fn(async () => ({ id: "vps-1" })) };
    const service = new DockerMonitoringService(repository as never, vps as never);
    const input = validV2Docker() as unknown as AgentDockerMetricsInputV2;

    await service.ingestV2("vps-1", input, new Date().toISOString());
    expect(captured).not.toHaveProperty("monitoring");
    expect(captured?.monitoring).toBeUndefined();
  });
});
