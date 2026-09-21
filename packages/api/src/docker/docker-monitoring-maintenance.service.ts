import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import type { AppConfig } from "../config/app-config.js";
import { APP_CONFIG } from "../tokens.js";
import { DockerMonitoringService } from "./docker-monitoring.service.js";
import type { DockerMonitoringMaintenanceResult } from "../persistence/repositories/docker-monitoring.repository.js";

export type DockerMaintenanceHealth = {
  status: "healthy" | "degraded" | "unknown";
  lastRunAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastError?: string;
  runs: number;
  failures: number;
  lastResult?: DockerMonitoringMaintenanceResult;
};

@Injectable()
export class DockerMonitoringMaintenanceService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(DockerMonitoringMaintenanceService.name);
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private maintenanceInFlight: Promise<void> | null = null;
  private stopping = false;
  private healthState: DockerMaintenanceHealth = { status: "unknown", runs: 0, failures: 0 };

  getHealth(): DockerMaintenanceHealth {
    return { ...this.healthState, lastResult: this.healthState.lastResult ? { ...this.healthState.lastResult } : undefined };
  }

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly dockerMonitoring: DockerMonitoringService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.mode === "demo") return;
    this.stopping = false;
    if (this.intervalTimer) return;
    void this.runOnce();
    this.intervalTimer = setInterval(() => { void this.runOnce(); }, (this.config.dockerMaintenanceIntervalSeconds ?? 21600) * 1000);
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopping = true;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    await this.maintenanceInFlight;
  }

  async runOnce(): Promise<void> {
    if (this.stopping || this.maintenanceInFlight) return;
    this.maintenanceInFlight = Promise.resolve()
      .then(async () => {
        const startedAt = new Date().toISOString();
        this.healthState = { ...this.healthState, status: "degraded", lastRunAt: startedAt, runs: this.healthState.runs + 1 };
        const result = await this.dockerMonitoring.runMaintenance();
        this.healthState = { ...this.healthState, status: "healthy", lastSuccessAt: new Date().toISOString(), lastResult: result, lastError: undefined };
      })
      .then(() => undefined)
      .catch((error: unknown) => {
        this.healthState = { ...this.healthState, status: "degraded", lastFailureAt: new Date().toISOString(), failures: this.healthState.failures + 1, lastError: error instanceof Error ? error.message : String(error) };
        this.logger.error(
          "runMaintenance failed",
          error instanceof Error ? error.stack ?? error.message : String(error),
        );
      })
      .finally(() => { this.maintenanceInFlight = null; });
    await this.maintenanceInFlight;
  }
}
