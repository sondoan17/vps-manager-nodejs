import { Inject, Module, Optional, type DynamicModule, type OnApplicationShutdown } from "@nestjs/common";
import { join } from "node:path";
import type { Pool } from "pg";
import { AuditService } from "./audit/audit.service.js";
import { loadAppConfig, type AppConfig } from "./config/app-config.js";
import { AgentController } from "./agents/agent.controller.js";
import { AuthController } from "./auth/auth.controller.js";
import { VpsController } from "./vps/vps.controller.js";
import { HealthController } from "./health/health.controller.js";
import { DashboardController } from "./dashboard/dashboard.controller.js";
import { DashboardService } from "./dashboard/dashboard.service.js";
import { JobsController } from "./jobs/jobs.controller.js";
import { JobService } from "./jobs/job.service.js";
import { JobRunnerService } from "./jobs/job-runner.service.js";
import { MetricsController } from "./metrics/metrics.controller.js";
import { MetricService } from "./metrics/metric.service.js";
import { AuditController } from "./audit/audit.controller.js";
import { MonitoringController } from "./monitoring/monitoring.controller.js";
import { MonitoringService } from "./monitoring/monitoring.service.js";
import { DashboardSessionGuard } from "./auth/dashboard-session.guard.js";
import { OriginGuard } from "./auth/origin-guard.js";
import type { AdminCredentialRepository } from "./persistence/repositories/admin-credential.repository.js";
import type { AgentRepository } from "./persistence/repositories/agent.repository.js";
import type { AuditRepository } from "./persistence/repositories/audit.repository.js";
import { createRepositories } from "./persistence/repositories/create-repositories.js";
import type { JobRepository } from "./persistence/repositories/job.repository.js";
import type { MetricRepository } from "./persistence/repositories/metric.repository.js";
import type { SessionRepository } from "./persistence/repositories/session.repository.js";
import { createKeyService, type KeyService } from "./ssh/keyService.js";
import { SshService } from "./ssh/ssh.service.js";
import { AgentInstallerService } from "./agents/agent-installer.service.js";
import { AgentService } from "./agents/agent.service.js";
import { VpsService } from "./vps/vps.service.js";
import type { VpsRepository } from "./persistence/repositories/vps.repository.js";
import { LocalAgentSupervisorService } from "./agents/local-agent-supervisor.service.js";
import { ADMIN_CREDENTIAL_REPOSITORY, AGENT_REPOSITORY, APP_CONFIG, AUDIT_REPOSITORY, DATABASE_POOL, JOB_REPOSITORY, KEY_SERVICE, METRIC_REPOSITORY, SESSION_REPOSITORY, VPS_REPOSITORY } from "./tokens.js";

export { ADMIN_CREDENTIAL_REPOSITORY, AGENT_REPOSITORY, APP_CONFIG, AUDIT_REPOSITORY, DATABASE_POOL, JOB_REPOSITORY, KEY_SERVICE, METRIC_REPOSITORY, SESSION_REPOSITORY, VPS_REPOSITORY };

const DATABASE_POOL_OWNS = Symbol("DATABASE_POOL_OWNS");

export type AppDependencies = {
  config?: AppConfig;
  store?: VpsRepository;
  keys?: KeyService;
  audit?: AuditRepository;
  jobs?: JobRepository;
  metrics?: MetricRepository;
  agent?: AgentRepository;
  sessions?: SessionRepository;
  adminCredential?: AdminCredentialRepository;
  /** Optional pre-created DB pool. Caller owns lifecycle unless ownsPool=true. */
  pool?: Pool;
  ownsPool?: boolean;
};

export class AppModule {}

Module({})(AppModule);

class DatabasePoolShutdown implements OnApplicationShutdown {
  constructor(
    @Optional() @Inject(DATABASE_POOL) private readonly pool?: Pool,
    @Optional() @Inject(DATABASE_POOL_OWNS) private readonly ownsPool?: boolean,
  ) {}

  async onApplicationShutdown() {
    if (this.ownsPool) {
      await this.pool?.end();
    }
  }
}

export function createAppModule(deps: AppDependencies = {}): DynamicModule {
  const config = deps.config ?? loadAppConfig();
  const needsRepositories = !deps.store || !deps.audit || !deps.jobs || !deps.metrics || !deps.agent || !deps.sessions || !deps.adminCredential;
  const repositories = needsRepositories ? createRepositories(config, deps.pool) : undefined;
  const pool = deps.pool ?? repositories?.pool;
  const ownsPool = Boolean((deps.pool && deps.ownsPool) || (!deps.pool && repositories?.pool));

  return {
    module: AppModule,
    controllers: [HealthController, DashboardController, VpsController, JobsController, MetricsController, AuditController, MonitoringController, AgentController, AuthController],
    providers: [
      { provide: APP_CONFIG, useValue: config },
      { provide: DATABASE_POOL, useValue: pool },
      { provide: DATABASE_POOL_OWNS, useValue: ownsPool },
      DatabasePoolShutdown,
      { provide: VPS_REPOSITORY, useValue: deps.store ?? repositories!.vps },
      { provide: KEY_SERVICE, useValue: deps.keys ?? createKeyService(join(config.privateDir, "keys")) },
      { provide: AUDIT_REPOSITORY, useValue: deps.audit ?? repositories!.audit },
      { provide: JOB_REPOSITORY, useValue: deps.jobs ?? repositories!.jobs },
      { provide: METRIC_REPOSITORY, useValue: deps.metrics ?? repositories!.metrics },
      { provide: AGENT_REPOSITORY, useValue: deps.agent ?? repositories!.agent },
      { provide: SESSION_REPOSITORY, useValue: deps.sessions ?? repositories!.sessions },
      { provide: ADMIN_CREDENTIAL_REPOSITORY, useValue: deps.adminCredential ?? repositories!.adminCredential },
      DashboardSessionGuard,
      OriginGuard,
      AgentInstallerService,
      LocalAgentSupervisorService,
      {
        provide: AgentService,
        inject: [AGENT_REPOSITORY, METRIC_REPOSITORY, VPS_REPOSITORY, APP_CONFIG],
        useFactory: (agentRepo: AgentRepository, metricRepo: MetricRepository, vpsRepo: VpsRepository, appConfig: AppConfig) =>
          new AgentService(agentRepo, metricRepo, vpsRepo, appConfig),
      },
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
        inject: [VPS_REPOSITORY, KEY_SERVICE, SshService, AuditService, APP_CONFIG, AgentInstallerService, AGENT_REPOSITORY],
        useFactory: (store: VpsRepository, keys: KeyService, ssh: SshService, audit: AuditService, appConfig: AppConfig, installer: AgentInstallerService, agentRepo: AgentRepository) => new VpsService(store, keys, ssh, audit, appConfig, installer, agentRepo)
      }
    ]
  };
}
