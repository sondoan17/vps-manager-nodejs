import { Inject, Injectable } from "@nestjs/common";
import type { AppConfig } from "../config/app-config.js";
import { demoAuditEvents } from "../demo/demo-data.js";
import type { AuditEvent } from "../models/audit.js";
import type { AuditRepository } from "../repositories/audit.repository.js";
import { APP_CONFIG, AUDIT_REPOSITORY } from "../tokens.js";

export type AuditFilter = {
  resourceId?: string;
  action?: string;
  result?: string;
};

@Injectable()
export class AuditService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(AUDIT_REPOSITORY) private readonly repository: AuditRepository
  ) {}

  record(event: Omit<AuditEvent, "id" | "timestamp"> & { id?: string; timestamp?: string }) {
    return this.repository.append(event);
  }

  async list(filter?: AuditFilter): Promise<AuditEvent[]> {
    const events = this.config.mode === "demo"
      ? [...demoAuditEvents]
      : await this.repository.list();

    if (filter?.resourceId) {
      return events.filter((e) => e.resourceId === filter.resourceId);
    }
    if (filter?.action) {
      return events.filter((e) => e.action === filter.action);
    }
    if (filter?.result) {
      return events.filter((e) => e.result === filter.result);
    }
    return events;
  }
}
