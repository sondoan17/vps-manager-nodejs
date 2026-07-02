import { join } from "node:path";
import type { Pool } from "pg";
import type { AppConfig } from "../config/app-config.js";
import { createDatabasePool } from "../db/pool.js";
import { createVpsStore } from "../store/vpsStore.js";
import { createJsonAgentRepository, type AgentRepository } from "./agent.repository.js";
import { createPostgresAgentRepository } from "./agent.postgres.repository.js";
import { createJsonAuditRepository, type AuditRepository } from "./audit.repository.js";
import { createPostgresAuditRepository } from "./audit.postgres.repository.js";
import { createJsonJobRepository, type JobRepository } from "./job.repository.js";
import { createPostgresJobRepository } from "./job.postgres.repository.js";
import { createJsonMetricRepository, type MetricRepository } from "./metric.repository.js";
import { createPostgresMetricRepository } from "./metric.postgres.repository.js";
import type { VpsRepository } from "./vps.repository.js";
import { createPostgresVpsRepository } from "./vps.postgres.repository.js";
import { createJsonSessionRepository, type SessionRepository } from "./session.repository.js";
import { createPostgresSessionRepository } from "./session.postgres.repository.js";

export type RepositorySet = {
  vps: VpsRepository;
  audit: AuditRepository;
  jobs: JobRepository;
  metrics: MetricRepository;
  agent: AgentRepository;
  sessions: SessionRepository;
  pool?: Pool;
};

export function createRepositories(config: AppConfig): RepositorySet {
  if (config.storageDriver === "postgres") {
    const pool = createDatabasePool(config);
    return {
      pool,
      vps: createPostgresVpsRepository(pool),
      audit: createPostgresAuditRepository(pool),
      jobs: createPostgresJobRepository(pool),
      metrics: createPostgresMetricRepository(pool),
      agent: createPostgresAgentRepository(pool),
      sessions: createPostgresSessionRepository(pool)
    };
  }

  return {
    vps: createVpsStore(join(config.dataDir, "vps.json")),
    audit: createJsonAuditRepository(join(config.dataDir, "audit.json")),
    jobs: createJsonJobRepository(join(config.dataDir, "jobs.json")),
    metrics: createJsonMetricRepository(join(config.dataDir, "metrics.json")),
    agent: createJsonAgentRepository(join(config.dataDir, "agents.json")),
    sessions: createJsonSessionRepository(join(config.dataDir, "sessions.json"))
  };
}
