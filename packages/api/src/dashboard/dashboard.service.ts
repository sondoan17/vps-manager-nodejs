import { Inject, Injectable } from "@nestjs/common";
import type { AppConfig } from "../config/app-config.js";
import { DEMO_BANNER, demoAuditEvents, demoJobs, demoMetrics, demoServers, demoTerminal } from "../demo/demo-data.js";
import type { DashboardOverview, DashboardSummary } from "../models/dashboard.js";
import type { VpsRecord } from "../models/vps.js";
import type { VpsRepository } from "../repositories/vps.repository.js";
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
      terminal: { label: "Demo terminal", networkAccess: "disabled", commands: [], sessions: [] },
      settings: { appMode: "local", webTerminalEnabled: this.config.enableWebTerminal, realSshEnabled: true, authRequiredInLocalMode: true }
    };
  }
}
