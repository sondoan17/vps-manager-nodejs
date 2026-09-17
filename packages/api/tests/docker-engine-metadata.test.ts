import { describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import type { AppConfig } from "../src/config/app-config.js";
import type { AgentDockerMetrics } from "../src/agents/agent.models.js";
import { createPostgresAgentRepository } from "../src/persistence/repositories/agent.postgres.repository.js";
import { DashboardService } from "../src/dashboard/dashboard.service.js";
import { MonitoringService } from "../src/monitoring/monitoring.service.js";
import type { VpsRecord } from "../src/vps/vps.models.js";

const localConfig = { mode: "local", enableWebTerminal: false } as AppConfig;

const METADATA = {
  engineVersion: "25.0.3",
  apiVersion: "1.44",
  os: "linux",
  architecture: "amd64",
};

function dockerMetrics(overrides: Partial<AgentDockerMetrics> = {}): AgentDockerMetrics {
  const now = new Date().toISOString();
  return {
    vpsId: "vps-1",
    collectedAt: now,
    receivedAt: now,
    agentVersion: "1.0.0",
    schemaVersion: 1,
    available: true,
    containerTotal: 1,
    containerRunning: 1,
    cpuPercent: 5,
    memoryUsageBytes: 1024,
    networkRxBytes: 10,
    networkTxBytes: 10,
    blockReadBytes: 10,
    blockWriteBytes: 10,
    pids: 2,
    containers: [],
    ...overrides,
  };
}

function vpsRecord(): VpsRecord {
  return {
    id: "vps-1",
    name: "vps-1",
    host: "203.0.113.10",
    port: 22,
    username: "root",
    kind: "remote",
    managedBy: "user",
    dockerMetricsEnabled: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

// ── Postgres JSONB mapper roundtrip (fake pool, no real DB) ───────────────

describe("postgres docker engine metadata mapping", () => {
  it("persists metadata in the JSONB data payload and reads it back", async () => {
    const queries: Array<{ text: string; values: unknown[] }> = [];
    const inserted = dockerMetrics(METADATA);
    const query = vi.fn(async (text: string, values: unknown[] = []) => {
      queries.push({ text, values });
      if (text.startsWith("INSERT INTO agent_docker_metrics")) {
        const data = JSON.parse(values[17] as string);
        return {
          rows: [
            {
              vps_id: values[0],
              collected_at: values[1],
              received_at: values[2],
              agent_version: values[3],
              schema_version: 1,
              available: true,
              error_code: null,
              container_total: 1,
              container_running: 1,
              cpu_percent: 5,
              memory_usage_bytes: 1024,
              memory_limit_bytes: null,
              network_rx_bytes: 10,
              network_tx_bytes: 10,
              block_read_bytes: 10,
              block_write_bytes: 10,
              pids: 2,
              data,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const repo = createPostgresAgentRepository({ query } as never);
    const stored = await repo.upsertDockerMetrics(inserted);

    expect(stored).toMatchObject(METADATA);
    const insert = queries.find((q) =>
      q.text.startsWith("INSERT INTO agent_docker_metrics"),
    )!;
    const persisted = JSON.parse(insert.values[17] as string);
    expect(persisted).toMatchObject({ ...METADATA, containers: [] });
  });

  it("reads back a legacy row without metadata as undefined fields", async () => {
    const now = new Date();
    const query = vi.fn(async () => ({
      rows: [
        {
          vps_id: "vps-1",
          collected_at: now,
          received_at: now,
          agent_version: "1.0.0",
          schema_version: 1,
          available: true,
          error_code: null,
          container_total: 1,
          container_running: 1,
          cpu_percent: 5,
          memory_usage_bytes: 1024,
          memory_limit_bytes: null,
          network_rx_bytes: 10,
          network_tx_bytes: 10,
          block_read_bytes: 10,
          block_write_bytes: 10,
          pids: 2,
          data: { containers: [] },
        },
      ],
    }));

    const repo = createPostgresAgentRepository({ query } as never);
    const stored = await repo.getDockerMetrics("vps-1");

    expect(stored).toBeDefined();
    expect(stored!.engineVersion).toBeUndefined();
    expect(stored!.apiVersion).toBeUndefined();
    expect(stored!.os).toBeUndefined();
    expect(stored!.architecture).toBeUndefined();
    expect(stored!.containers).toEqual([]);
  });

  it("reads back a JSON-string data payload with metadata", async () => {
    const now = new Date();
    const query = vi.fn(async () => ({
      rows: [
        {
          vps_id: "vps-1",
          collected_at: now,
          received_at: now,
          agent_version: "1.0.0",
          schema_version: 1,
          available: true,
          error_code: null,
          container_total: 1,
          container_running: 1,
          cpu_percent: 5,
          memory_usage_bytes: 1024,
          memory_limit_bytes: null,
          network_rx_bytes: 10,
          network_tx_bytes: 10,
          block_read_bytes: 10,
          block_write_bytes: 10,
          pids: 2,
          data: JSON.stringify({ containers: [], ...METADATA }),
        },
      ],
    }));

    const repo = createPostgresAgentRepository({ query } as never);
    const stored = await repo.getDockerMetrics("vps-1");

    expect(stored).toMatchObject(METADATA);
  });
});

// ── Dashboard / SSE propagation ───────────────────────────────────────────

function arrangeDashboard(stored: AgentDockerMetrics) {
  const dashboard = new DashboardService(
    localConfig,
    { list: vi.fn(async () => [vpsRecord()]) } as never,
    { listLatest: vi.fn(async () => []) } as never,
    {
      listStates: vi.fn(async () => []),
      listSystemInfo: vi.fn(async () => []),
      listDockerMetrics: vi.fn(async () => [{ ...stored }]),
    } as never,
    { list: vi.fn(async () => []) } as never,
  );
  return dashboard;
}

describe("dashboard/SSE engine metadata propagation", () => {
  it("propagates metadata unchanged through dashboard overview with derived fields", async () => {
    const dashboard = arrangeDashboard(dockerMetrics(METADATA));
    const overview = await dashboard.overview();

    expect(overview.dockerMetrics).toHaveLength(1);
    expect(overview.dockerMetrics[0]).toMatchObject(METADATA);
    expect(overview.dockerMetrics[0]!.freshness).toBe("fresh");
    expect(overview.dockerMetrics[0]!.lastUpdatedAt).toBe(
      overview.dockerMetrics[0]!.receivedAt,
    );
  });

  it("propagates metadata unchanged through the SSE snapshot payload", async () => {
    const dashboard = arrangeDashboard(dockerMetrics(METADATA));
    const overview = await dashboard.overview();
    const service = new MonitoringService(
      localConfig,
      { overview: vi.fn(async () => overview) } as never,
      { list: vi.fn(async () => []) } as never,
      {} as never,
      {} as never,
      { subscribe: vi.fn(() => () => undefined) } as never,
    );

    const timer = vi
      .spyOn(globalThis, "setInterval")
      .mockReturnValue(0 as never);
    try {
      let text = "";
      const res = {
        destroyed: false,
        writableEnded: false,
        writeHead: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn((chunk: string) => {
          text += chunk;
          return true;
        }),
        on: vi.fn(),
        once: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;

      await service.stream(res);

      const snapshots = text
        .split("\n\n")
        .filter((block) => block.includes("monitoring.snapshot"))
        .map((block) => JSON.parse(block.match(/^data: (.+)$/m)![1]));
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].payload.dockerMetrics).toHaveLength(1);
      expect(snapshots[0].payload.dockerMetrics[0]).toMatchObject(METADATA);
      expect(
        snapshots[0].payload.overview.dockerMetrics[0],
      ).toMatchObject(METADATA);
    } finally {
      timer.mockRestore();
    }
  });
});
