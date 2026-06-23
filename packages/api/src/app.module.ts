import { Module, type DynamicModule } from "@nestjs/common";
import { join } from "node:path";
import { AuditService } from "./audit/audit.service.js";
import { loadAppConfig, type AppConfig } from "./config/app-config.js";
import { HealthController } from "./controllers/health.controller.js";
import { VpsController } from "./controllers/vps.controller.js";
import { LocalAuthGuard } from "./auth/local-auth.guard.js";
import { createJsonAuditRepository, type AuditRepository } from "./repositories/audit.repository.js";
import { createJsonJobRepository, type JobRepository } from "./repositories/job.repository.js";
import { createJsonMetricRepository, type MetricRepository } from "./repositories/metric.repository.js";
import { createKeyService, type KeyService } from "./services/keyService.js";
import { SshService } from "./services/ssh.service.js";
import { VpsService } from "./services/vps.service.js";
import { createVpsStore } from "./store/vpsStore.js";
import type { VpsRepository } from "./repositories/vps.repository.js";
import { APP_CONFIG, AUDIT_REPOSITORY, JOB_REPOSITORY, KEY_SERVICE, METRIC_REPOSITORY, VPS_REPOSITORY } from "./tokens.js";

export { APP_CONFIG, AUDIT_REPOSITORY, JOB_REPOSITORY, KEY_SERVICE, METRIC_REPOSITORY, VPS_REPOSITORY };

export type AppDependencies = {
  config?: AppConfig;
  store?: VpsRepository;
  keys?: KeyService;
  audit?: AuditRepository;
  jobs?: JobRepository;
  metrics?: MetricRepository;
};

export class AppModule {}

Module({})(AppModule);

export function createAppModule(deps: AppDependencies = {}): DynamicModule {
  const config = deps.config ?? loadAppConfig();

  return {
    module: AppModule,
    controllers: [HealthController, VpsController],
    providers: [
      { provide: APP_CONFIG, useValue: config },
      { provide: VPS_REPOSITORY, useValue: deps.store ?? createVpsStore(join(config.dataDir, "vps.json")) },
      { provide: KEY_SERVICE, useValue: deps.keys ?? createKeyService(join(config.privateDir, "keys")) },
      { provide: AUDIT_REPOSITORY, useValue: deps.audit ?? createJsonAuditRepository(join(config.dataDir, "audit.json")) },
      { provide: JOB_REPOSITORY, useValue: deps.jobs ?? createJsonJobRepository(join(config.dataDir, "jobs.json")) },
      { provide: METRIC_REPOSITORY, useValue: deps.metrics ?? createJsonMetricRepository(join(config.dataDir, "metrics.json")) },
      LocalAuthGuard,
      AuditService,
      {
        provide: SshService,
        inject: [APP_CONFIG, AuditService],
        useFactory: (appConfig: AppConfig, audit: AuditService) => new SshService(appConfig, audit)
      },
      {
        provide: VpsService,
        inject: [VPS_REPOSITORY, KEY_SERVICE, SshService, AuditService],
        useFactory: (store: VpsRepository, keys: KeyService, ssh: SshService, audit: AuditService) => new VpsService(store, keys, ssh, audit)
      }
    ]
  };
}
