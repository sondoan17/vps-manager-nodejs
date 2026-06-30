import { Module, type DynamicModule } from "@nestjs/common";
import { join } from "node:path";
import { AuditService } from "./audit/audit.service.js";
import { loadAppConfig, type AppConfig } from "./config/app-config.js";
import { AgentController } from "./controllers/agent.controller.js";
import { AuditController } from "./controllers/audit.controller.js";
import { DashboardController } from "./controllers/dashboard.controller.js";
import { HealthController } from "./controllers/health.controller.js";
import { JobsController } from "./controllers/jobs.controller.js";
import { MetricsController } from "./controllers/metrics.controller.js";
import { MonitoringController } from "./controllers/monitoring.controller.js";
import { VpsController } from "./controllers/vps.controller.js";
import { LocalAuthGuard } from "./auth/local-auth.guard.js";
import { createJsonAgentRepository, type AgentRepository } from "./repositories/agent.repository.js";
import { createJsonAuditRepository, type AuditRepository } from "./repositories/audit.repository.js";
import { createJsonJobRepository, type JobRepository } from "./repositories/job.repository.js";
import { createJsonMetricRepository, type MetricRepository } from "./repositories/metric.repository.js";
import { createKeyService, type KeyService } from "./services/keyService.js";
import { SshService } from "./services/ssh.service.js";
import { AgentService } from "./services/agent.service.js";
import { DashboardService } from "./dashboard/dashboard.service.js";
import { JobRunnerService } from "./services/job-runner.service.js";
import { JobService } from "./services/job.service.js";
import { MetricService } from "./services/metric.service.js";
import { MonitoringService } from "./services/monitoring.service.js";
import { VpsService } from "./services/vps.service.js";
import { createVpsStore } from "./store/vpsStore.js";
import type { VpsRepository } from "./repositories/vps.repository.js";
import { AGENT_REPOSITORY, APP_CONFIG, AUDIT_REPOSITORY, JOB_REPOSITORY, KEY_SERVICE, METRIC_REPOSITORY, VPS_REPOSITORY } from "./tokens.js";

export { AGENT_REPOSITORY, APP_CONFIG, AUDIT_REPOSITORY, JOB_REPOSITORY, KEY_SERVICE, METRIC_REPOSITORY, VPS_REPOSITORY };

export type AppDependencies = {
  config?: AppConfig;
  store?: VpsRepository;
  keys?: KeyService;
  audit?: AuditRepository;
  jobs?: JobRepository;
  metrics?: MetricRepository;
  agent?: AgentRepository;
};

export class AppModule {}

Module({})(AppModule);

export function createAppModule(deps: AppDependencies = {}): DynamicModule {
  const config = deps.config ?? loadAppConfig();

  return {
    module: AppModule,
    controllers: [HealthController, DashboardController, VpsController, JobsController, MetricsController, AuditController, MonitoringController, AgentController],
    providers: [
      { provide: APP_CONFIG, useValue: config },
      { provide: VPS_REPOSITORY, useValue: deps.store ?? createVpsStore(join(config.dataDir, "vps.json")) },
      { provide: KEY_SERVICE, useValue: deps.keys ?? createKeyService(join(config.privateDir, "keys")) },
      { provide: AUDIT_REPOSITORY, useValue: deps.audit ?? createJsonAuditRepository(join(config.dataDir, "audit.json")) },
      { provide: JOB_REPOSITORY, useValue: deps.jobs ?? createJsonJobRepository(join(config.dataDir, "jobs.json")) },
      { provide: METRIC_REPOSITORY, useValue: deps.metrics ?? createJsonMetricRepository(join(config.dataDir, "metrics.json")) },
      { provide: AGENT_REPOSITORY, useValue: deps.agent ?? createJsonAgentRepository(join(config.dataDir, "agents.json")) },
      LocalAuthGuard,
      AgentService,
      AuditService,
      DashboardService,
      JobRunnerService,
      JobService,
      MetricService,
      MonitoringService,
      {
        provide: SshService,
        inject: [APP_CONFIG, AuditService],
        useFactory: (appConfig: AppConfig, audit: AuditService) => new SshService(appConfig, audit)
      },
      {
        provide: VpsService,
        inject: [VPS_REPOSITORY, KEY_SERVICE, SshService, AuditService, APP_CONFIG],
        useFactory: (store: VpsRepository, keys: KeyService, ssh: SshService, audit: AuditService, appConfig: AppConfig) => new VpsService(store, keys, ssh, audit, appConfig)
      }
    ]
  };
}
