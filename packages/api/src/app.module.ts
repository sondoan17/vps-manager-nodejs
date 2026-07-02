import { Inject, Module, Optional, type DynamicModule, type OnApplicationShutdown } from "@nestjs/common";
import { join } from "node:path";
import type { Pool } from "pg";
import { AuditService } from "./audit/audit.service.js";
import { loadAppConfig, type AppConfig } from "./config/app-config.js";
import { AgentController } from "./controllers/agent.controller.js";
import { AuditController } from "./controllers/audit.controller.js";
import { AuthController } from "./controllers/auth.controller.js";
import { DashboardController } from "./controllers/dashboard.controller.js";
import { HealthController } from "./controllers/health.controller.js";
import { JobsController } from "./controllers/jobs.controller.js";
import { MetricsController } from "./controllers/metrics.controller.js";
import { MonitoringController } from "./controllers/monitoring.controller.js";
import { VpsController } from "./controllers/vps.controller.js";
import { DashboardSessionGuard } from "./auth/dashboard-session.guard.js";
import { OriginGuard } from "./auth/origin-guard.js";
import type { AgentRepository } from "./repositories/agent.repository.js";
import type { AuditRepository } from "./repositories/audit.repository.js";
import { createRepositories } from "./repositories/create-repositories.js";
import type { JobRepository } from "./repositories/job.repository.js";
import type { MetricRepository } from "./repositories/metric.repository.js";
import type { SessionRepository } from "./repositories/session.repository.js";
import { createKeyService, type KeyService } from "./services/keyService.js";
import { SshService } from "./services/ssh.service.js";
import { AgentInstallerService } from "./services/agent-installer.service.js";
import { AgentService } from "./services/agent.service.js";
import { DashboardService } from "./dashboard/dashboard.service.js";
import { JobRunnerService } from "./services/job-runner.service.js";
import { JobService } from "./services/job.service.js";
import { MetricService } from "./services/metric.service.js";
import { MonitoringService } from "./services/monitoring.service.js";
import { VpsService } from "./services/vps.service.js";
import type { VpsRepository } from "./repositories/vps.repository.js";
import { AGENT_REPOSITORY, APP_CONFIG, AUDIT_REPOSITORY, DATABASE_POOL, JOB_REPOSITORY, KEY_SERVICE, METRIC_REPOSITORY, SESSION_REPOSITORY, VPS_REPOSITORY } from "./tokens.js";

export { AGENT_REPOSITORY, APP_CONFIG, AUDIT_REPOSITORY, DATABASE_POOL, JOB_REPOSITORY, KEY_SERVICE, METRIC_REPOSITORY, SESSION_REPOSITORY, VPS_REPOSITORY };

export type AppDependencies = {
  config?: AppConfig;
  store?: VpsRepository;
  keys?: KeyService;
  audit?: AuditRepository;
  jobs?: JobRepository;
  metrics?: MetricRepository;
  agent?: AgentRepository;
  sessions?: SessionRepository;
};

export class AppModule {}

Module({})(AppModule);

class DatabasePoolShutdown implements OnApplicationShutdown {
  constructor(@Optional() @Inject(DATABASE_POOL) private readonly pool?: Pool) {}

  async onApplicationShutdown() {
    await this.pool?.end();
  }
}

export function createAppModule(deps: AppDependencies = {}): DynamicModule {
  const config = deps.config ?? loadAppConfig();
  const needsRepositories = !deps.store || !deps.audit || !deps.jobs || !deps.metrics || !deps.agent || !deps.sessions;
  const repositories = needsRepositories ? createRepositories(config) : undefined;

  return {
    module: AppModule,
    controllers: [HealthController, DashboardController, VpsController, JobsController, MetricsController, AuditController, MonitoringController, AgentController, AuthController],
    providers: [
      { provide: APP_CONFIG, useValue: config },
      { provide: DATABASE_POOL, useValue: repositories?.pool },
      DatabasePoolShutdown,
      { provide: VPS_REPOSITORY, useValue: deps.store ?? repositories!.vps },
      { provide: KEY_SERVICE, useValue: deps.keys ?? createKeyService(join(config.privateDir, "keys")) },
      { provide: AUDIT_REPOSITORY, useValue: deps.audit ?? repositories!.audit },
      { provide: JOB_REPOSITORY, useValue: deps.jobs ?? repositories!.jobs },
      { provide: METRIC_REPOSITORY, useValue: deps.metrics ?? repositories!.metrics },
      { provide: AGENT_REPOSITORY, useValue: deps.agent ?? repositories!.agent },
      { provide: SESSION_REPOSITORY, useValue: deps.sessions ?? repositories!.sessions },
      DashboardSessionGuard,
      OriginGuard,
      AgentInstallerService,
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
        inject: [VPS_REPOSITORY, KEY_SERVICE, SshService, AuditService, APP_CONFIG, AgentInstallerService],
        useFactory: (store: VpsRepository, keys: KeyService, ssh: SshService, audit: AuditService, appConfig: AppConfig, installer: AgentInstallerService) => new VpsService(store, keys, ssh, audit, appConfig, installer)
      }
    ]
  };
}
