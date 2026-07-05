import { Inject, Injectable } from "@nestjs/common";
import type { AppConfig } from "../config/app-config.js";
import { demoAuditEvents } from "../demo/demo-fixtures.js";
import type { AuditEvent } from "../audit/audit.models.js";
import type { AuditRepository } from "../persistence/repositories/audit.repository.js";
import type { PaginationParams } from "../common/pagination.js";
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
    @Inject(AUDIT_REPOSITORY) private readonly repository: AuditRepository,
  ) {}

  record(
    event: Omit<AuditEvent, "id" | "timestamp"> & {
      id?: string;
      timestamp?: string;
    },
  ) {
    return this.repository.append(event, this.config.auditHistoryLimit);
  }

  async list(filter?: AuditFilter, page?: PaginationParams): Promise<AuditEvent[]> {
    const events =
      this.config.mode === "demo"
        ? [...demoAuditEvents]
        : await this.repository.list({ filter, page });

    // AND semantics: apply all present filters
    let filtered = events;
    if (filter?.resourceId) {
      filtered = filtered.filter((e) => e.resourceId === filter.resourceId);
    }
    if (filter?.action) {
      filtered = filtered.filter((e) => e.action === filter.action);
    }
    if (filter?.result) {
      filtered = filtered.filter((e) => e.result === filter.result);
    }

    if (page && this.config.mode === "demo") {
      filtered = filtered.slice(page.offset, page.offset + page.limit);
    }

    return filtered;
  }
}
