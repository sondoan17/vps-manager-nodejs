import { Inject, Injectable } from "@nestjs/common";
import type { AppConfig } from "../config/app-config.js";
import { DEMO_BANNER, demoAuditEvents, demoServers, demoTerminal, getDemoJobs, getDemoMetrics } from "../demo/demo-fixtures.js";
import type { DashboardOverview, DashboardSummary } from "../dashboard/dashboard.models.js";
import type { VpsRecord } from "../vps/vps.models.js";
import type { VpsRepository } from "../persistence/repositories/vps.repository.js";
import { APP_CONFIG, VPS_REPOSITORY } from "../tokens.js";

function summarize(servers: readonly VpsRecord[], runningJobs: number): DashboardSummary {
  return {
    totalServers: servers.length,
    healthyServers: servers.filter((server) => server.status === "healthy").length,
    warningServers: servers.filter((server) => server.status === "warning").length,
    unreachableServers: servers.filter((server) => server.status === "unreachable").length,
    runningJobs
  };
}

@Injectable()
export class DashboardService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(VPS_REPOSITORY) private readonly vpsRepository: VpsRepository
  ) {}

  async overview(): Promise<DashboardOverview> {
    if (this.config.mode === "demo") {
      const demoJobs = getDemoJobs();
      const demoMetrics = getDemoMetrics();
      const runningJobs = demoJobs.filter((job) => job.status === "running").length;
      return {
        mode: "demo",
        banner: DEMO_BANNER,
        summary: summarize(demoServers, runningJobs),
        servers: [...demoServers],
        metrics: [...demoMetrics],
        jobs: [...demoJobs],
        auditEvents: [...demoAuditEvents],
        terminal: demoTerminal,
        settings: { appMode: "demo", webTerminalEnabled: false, realSshEnabled: false, authRequiredInLocalMode: true }
      };
    }

    const servers = await this.vpsRepository.list();
    return {
      mode: "local",
      summary: summarize(servers, 0),
      servers,
      metrics: [],
      jobs: [],
      auditEvents: [],
      terminal: { label: "Terminal", networkAccess: "disabled", commands: [], sessions: [] },
      settings: { appMode: "local", webTerminalEnabled: this.config.enableWebTerminal, realSshEnabled: true, authRequiredInLocalMode: true }
    };
  }
}
