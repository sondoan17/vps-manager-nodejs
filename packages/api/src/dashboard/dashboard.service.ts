import { Inject, Injectable } from "@nestjs/common";
import type { AppConfig } from "../config/app-config.js";
import {
  DEMO_BANNER,
  demoAuditEvents,
  demoServers,
  demoTerminal,
  getDemoJobs,
  getDemoMetrics,
} from "../demo/demo-fixtures.js";
import type {
  DashboardMetricSample,
  DashboardOverview,
  DashboardSummary,
} from "../dashboard/dashboard.models.js";
import type { VpsRecord } from "../vps/vps.models.js";
import { applyAgentState } from "../vps/vps.models.js";
import {
  deriveHostStatus,
  HOST_FRESHNESS_THRESHOLD_MS,
} from "../common/host-health.js";
import type { AgentRepository } from "../persistence/repositories/agent.repository.js";
import type { VpsRepository } from "../persistence/repositories/vps.repository.js";
import type { MetricRepository } from "../persistence/repositories/metric.repository.js";
import type { JobRepository } from "../persistence/repositories/job.repository.js";
import {
  AGENT_REPOSITORY,
  APP_CONFIG,
  JOB_REPOSITORY,
  METRIC_REPOSITORY,
  VPS_REPOSITORY,
} from "../tokens.js";

const STALE_THRESHOLD_MS = HOST_FRESHNESS_THRESHOLD_MS;

function summarize(
  servers: readonly VpsRecord[],
  runningJobs: number,
): DashboardSummary {
  return {
    totalServers: servers.length,
    healthyServers: servers.filter((server) => server.status === "healthy")
      .length,
    warningServers: servers.filter((server) => server.status === "warning")
      .length,
    unreachableServers: servers.filter(
      (server) => server.status === "unreachable",
    ).length,
    runningJobs,
  };
}

function isFreshTimestamp(
  timestamp: string,
  thresholdMs = STALE_THRESHOLD_MS,
): boolean {
  return Date.now() - new Date(timestamp).getTime() < thresholdMs;
}

@Injectable()
export class DashboardService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(VPS_REPOSITORY) private readonly vpsRepository: VpsRepository,
    @Inject(METRIC_REPOSITORY)
    private readonly metricRepository: MetricRepository,
    @Inject(AGENT_REPOSITORY) private readonly agentRepository: AgentRepository,
    @Inject(JOB_REPOSITORY) private readonly jobRepository: JobRepository,
  ) {}

  async overview(): Promise<DashboardOverview> {
    if (this.config.mode === "demo") {
      const demoJobs = getDemoJobs();
      const demoMetrics = getDemoMetrics();
      const runningJobs = demoJobs.filter(
        (job) => job.status === "running",
      ).length;
      return {
        mode: "demo",
        banner: DEMO_BANNER,
        summary: summarize(demoServers, runningJobs),
        servers: [...demoServers],
        metrics: [...demoMetrics],
        jobs: [...demoJobs],
        auditEvents: [...demoAuditEvents],
        terminal: demoTerminal,
        settings: {
          appMode: "demo",
          webTerminalEnabled: false,
          realSshEnabled: false,
          authRequiredInLocalMode: true,
        },
        systemInfo: [],
        dockerMetrics: [],
      };
    }

    const servers = await this.vpsRepository.list();
    // Attach persisted agent state so dashboard/snapshot data always exposes
    // the real lifecycle status (not just systemInfo).
    const states = await this.agentRepository.listStates();
    const stateById = new Map(states.map((s) => [s.vpsId, s]));
    const serversWithAgent = servers.map((server) =>
      applyAgentState(
        {
          ...server,
          status: deriveHostStatus(server.status, server.lastSeenAt),
        },
        stateById.get(server.id),
      ),
    );
    const rawMetrics = await this.metricRepository.listLatest();
    const metrics: DashboardMetricSample[] = rawMetrics.map((m) => ({
      ...m,
      freshness: isFreshTimestamp(m.receivedAt ?? m.collectedAt)
        ? "fresh"
        : "stale",
    }));
    const serverIds = new Set(servers.map((s) => s.id));
    const allSystemInfo = await this.agentRepository.listSystemInfo();
    const systemInfo = allSystemInfo.filter((si) => serverIds.has(si.vpsId));
    const jobs = await this.jobRepository.list();

    // Only return Docker metrics for servers with dockerMetricsEnabled === true
    const allDockerMetrics = await this.agentRepository.listDockerMetrics();
    const enabledIds = new Set(
      servers.filter((s) => s.dockerMetricsEnabled === true).map((s) => s.id),
    );
    const dockerMetrics = allDockerMetrics.filter((dm) =>
      enabledIds.has(dm.vpsId),
    );

    return {
      mode: "local",
      summary: summarize(serversWithAgent, 0),
      servers: serversWithAgent,
      metrics,
      jobs,
      auditEvents: [],
      terminal: {
        label: "Terminal",
        networkAccess: "disabled",
        commands: [],
        sessions: [],
      },
      settings: {
        appMode: "local",
        webTerminalEnabled: this.config.enableWebTerminal,
        realSshEnabled: true,
        authRequiredInLocalMode: true,
      },
      systemInfo,
      dockerMetrics,
    };
  }
}
