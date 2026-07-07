import { Inject, Injectable } from "@nestjs/common";
import type { Response } from "express";
import { nanoid } from "nanoid";
import type { AppConfig } from "../config/app-config.js";
import { DashboardService } from "../dashboard/dashboard.service.js";
import { demoServers, getDemoMetrics } from "../demo/demo-fixtures.js";
import type { AuditEvent } from "../audit/audit.models.js";
import type { DashboardJob, DashboardMetricSample, DashboardOverview } from "../dashboard/dashboard.models.js";
import type { AgentDockerMetrics } from "../agents/agent.models.js";
import type { MetricSample } from "../metrics/metrics.models.js";
import type { VpsRecord } from "../vps/vps.models.js";
import type { MetricRepository } from "../persistence/repositories/metric.repository.js";
import { MetricService } from "../metrics/metric.service.js";
import { APP_CONFIG, METRIC_REPOSITORY } from "../tokens.js";

// ── Event envelope types ──────────────────────────────────────────────

type MonitoringEnvelope<TType extends string, TPayload> = {
  schemaVersion: 1;
  type: TType;
  id: string;
  emittedAt: string;
  payload: TPayload;
};

type HelloPayload = { mode: "demo" | "local"; intervalMs: number };
type SnapshotPayload = {
  overview: DashboardOverview;
  servers: VpsRecord[];
  jobs: DashboardJob[];
  metrics: DashboardMetricSample[];
  auditEvents: AuditEvent[];
};
type MetricsUpdatedPayload = { metrics: DashboardMetricSample[]; systemInfo?: DashboardOverview["systemInfo"]; dockerMetrics?: AgentDockerMetrics[] };
type HeartbeatPayload = Record<string, never>;
type ErrorPayload = { message: string };

// ── Demo metric generator ─────────────────────────────────────────────

type MetricState = {
  cpu: number;
  memory: number;
  disk: number;
  loadAverage: number;
  networkRx: number;
  networkTx: number;
  uptime: number;
  trendPoints: number[];
};

function gaussianNoise(): number {
  // Box-Muller transform — small jitter
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createMetricState(base: MetricSample): MetricState {
  const cpu = base.cpu;
  const memory = base.memory;
  const disk = base.disk;
  return {
    cpu,
    memory,
    disk,
    loadAverage: base.loadAverage,
    networkRx: base.networkRx,
    networkTx: base.networkTx,
    uptime: base.uptime,
    trendPoints: base.trend?.points ?? [cpu],
  };
}

function evolveMetric(state: MetricState, isStale: boolean): MetricState {
  if (isStale) {
    // Stale: keep zero-ish values, don't change
    return { ...state, uptime: 0 };
  }
  const step = () => clamp(gaussianNoise() * 2.5, -4, 4);
  const nextCpu = clamp(Math.round(state.cpu + step()), 0, 100);
  const nextMem = clamp(Math.round(state.memory + step()), 0, 100);
  const nextDisk = clamp(Math.round(state.disk + step() * 0.3), 0, 100);
  const nextLoad = clamp(Math.round((state.loadAverage + gaussianNoise() * 0.15) * 100) / 100, 0, 8);
  const nextRx = Math.max(0, Math.round(state.networkRx + gaussianNoise() * 8000));
  const nextTx = Math.max(0, Math.round(state.networkTx + gaussianNoise() * 5000));
  const nextUptime = state.uptime + 1; // seconds

  // Roll trend: keep at most 60 points, remove oldest
  const nextPoints = [...state.trendPoints, nextCpu].slice(-60);

  return {
    cpu: nextCpu,
    memory: nextMem,
    disk: nextDisk,
    loadAverage: nextLoad,
    networkRx: nextRx,
    networkTx: nextTx,
    uptime: nextUptime,
    trendPoints: nextPoints,
  };
}

function stateToMetricSample(
  vpsId: string,
  state: MetricState,
  isStale: boolean,
  trendRange: string,
): DashboardMetricSample {
  const now = new Date().toISOString();
  const points = state.trendPoints;
  const min = Math.min(...points);
  const max = Math.max(...points);
  return {
    vpsId,
    cpu: state.cpu,
    memory: state.memory,
    disk: state.disk,
    loadAverage: state.loadAverage,
    networkRx: state.networkRx,
    networkTx: state.networkTx,
    uptime: state.uptime,
    collectedAt: now,
    freshness: isStale ? "stale" : "fresh",
    trend: {
      range: trendRange,
      points,
      min,
      max,
      threshold: 90,
      unit: "cpu",
    },
  };
}

// ── SSE helper ────────────────────────────────────────────────────────

function sendEvent(res: Response, type: string, data: unknown): void {
  const envelope: MonitoringEnvelope<string, unknown> = {
    schemaVersion: 1,
    type,
    id: nanoid(12),
    emittedAt: new Date().toISOString(),
    payload: data,
  };
  res.write(`event: ${type}\ndata: ${JSON.stringify(envelope)}\n\n`);
}

// ── Freshness helpers ─────────────────────────────────────────────────
// Agent metrics prefer receivedAt (server clock) over collectedAt (VPS clock)
// since VPS clocks may be skewed.

/** 2 minutes in ms — samples older than this are considered stale. */
export const STALE_THRESHOLD_MS = 120_000;

export function isFreshTimestamp(timestamp: string, thresholdMs = STALE_THRESHOLD_MS): boolean {
  return Date.now() - new Date(timestamp).getTime() < thresholdMs;
}

// ── Service ───────────────────────────────────────────────────────────

@Injectable()
export class MonitoringService {
  private readonly intervalMs: number;
  private readonly staleThresholdMs = 120_000; // 2 min stale

  // Demo state
  private demoStates: Map<string, MetricState> | null = null;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DashboardService) private readonly dashboardService: DashboardService,
    @Inject(MetricService) private readonly metricService: MetricService,
    @Inject(METRIC_REPOSITORY) private readonly metricRepository: MetricRepository,
  ) {
    this.intervalMs = this.config.mode === "demo" ? 1_500 : 5_000;
  }

  /**
   * Stream SSE events to the given response. Blocks until the client disconnects.
   */
  async stream(res: Response): Promise<void> {
    // SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });

    // Flush headers
    res.flushHeaders();

    // Hello
    sendEvent(res, "monitoring.hello", { mode: this.config.mode, intervalMs: this.intervalMs });

    // Snapshot
    const overview = await this.dashboardService.overview();
    const snapshotPayload: SnapshotPayload = {
      overview,
      servers: overview.servers,
      jobs: overview.jobs,
      metrics: overview.metrics,
      auditEvents: overview.auditEvents,
    };
    sendEvent(res, "monitoring.snapshot", snapshotPayload);

    // Periodic metrics + heartbeat
    if (this.config.mode === "demo") {
      await this.streamDemoLoop(res);
    } else {
      await this.streamLocalLoop(res);
    }
  }

  private async streamDemoLoop(res: Response): Promise<void> {
    // Initialise demo metric state from fixtures
    if (!this.demoStates) {
      const fixtures = getDemoMetrics();
      this.demoStates = new Map(
        fixtures.map((m) => [m.vpsId, createMetricState(m)]),
      );
    }

    // Discover stale VPS IDs from the demo fixture status
    const staleIds = new Set(
      demoServers.filter((s) => s.status === "unreachable").map((s) => s.id),
    );

    const interval = setInterval(() => {
      if (res.destroyed) {
        clearInterval(interval);
        return;
      }

      try {
        // Evolve each metric state
        for (const [vpsId, state] of this.demoStates!) {
          const isStale = staleIds.has(vpsId);
          this.demoStates!.set(vpsId, evolveMetric(state, isStale));
        }

        // Build updated metrics array
        const metrics: DashboardMetricSample[] = [];
        for (const [vpsId, state] of this.demoStates!) {
          const isStale = staleIds.has(vpsId);
          metrics.push(stateToMetricSample(vpsId, state, isStale, "~1m"));
        }

        // Send metrics.updated
        sendEvent(res, "metrics.updated", { metrics, dockerMetrics: [] });

        // Send heartbeat every ~3 ticks
        if (Math.random() < 0.3) {
          sendEvent(res, "monitoring.heartbeat", {});
        }
      } catch {
        // If write fails, client likely disconnected — stop interval
        clearInterval(interval);
      }
    }, this.intervalMs);

    // Cleanup on disconnect
    res.on("close", () => {
      clearInterval(interval);
    });

    // Keep alive — prevent proxy timeout
    const keepAlive = setInterval(() => {
      if (res.destroyed) {
        clearInterval(keepAlive);
        return;
      }
      res.write(": keepalive\n\n");
    }, 15_000);

    res.on("close", () => {
      clearInterval(keepAlive);
    });
  }

  private async streamLocalLoop(res: Response): Promise<void> {
    const interval = setInterval(async () => {
      if (res.destroyed) {
        clearInterval(interval);
        return;
      }

      try {
        // Re-fetch current metrics from the repository
        const metrics = await this.metricService.list();
        const updatedMetrics: DashboardMetricSample[] = metrics.map((m) => ({
          ...m,
          freshness: isFreshTimestamp(m.receivedAt ?? m.collectedAt, this.staleThresholdMs) ? "fresh" : "stale",
        }));

        if (updatedMetrics.length > 0) {
          const overview = await this.dashboardService.overview();
          sendEvent(res, "metrics.updated", { metrics: updatedMetrics, systemInfo: overview.systemInfo, dockerMetrics: overview.dockerMetrics });
        }

        sendEvent(res, "monitoring.heartbeat", {});
      } catch {
        clearInterval(interval);
      }
    }, this.intervalMs);

    res.on("close", () => {
      clearInterval(interval);
    });

    const keepAlive = setInterval(() => {
      if (res.destroyed) {
        clearInterval(keepAlive);
        return;
      }
      res.write(": keepalive\n\n");
    }, 15_000);

    res.on("close", () => {
      clearInterval(keepAlive);
    });
  }
}
