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

  async list(
    filter?: AuditFilter,
    page?: PaginationParams,
  ): Promise<AuditEvent[]> {
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

  /**
   * List audit events scoped to a VPS, including:
   * 1. Direct VPS events (resourceId === vpsId)
   * 2. Job-related events where event.jobId or event.resourceId matches a VPS job ID
   * 3. serverLabel === vpsName as legacy/demo fallback
   *
   * Filter-before-pagination.
   */
  async listForVps(
    vpsId: string,
    vpsName: string,
    vpsJobIds: string[],
    extraFilters?: { action?: string; result?: string },
    page?: PaginationParams,
  ): Promise<AuditEvent[]> {
    // Get all events (no resourceId pre-filter — we apply custom VPS scoping)
    const events: AuditEvent[] =
      this.config.mode === "demo"
        ? [...demoAuditEvents]
        : await this.repository.list();

    // AND: apply extra filters first
    let filtered = events;
    if (extraFilters?.action) {
      filtered = filtered.filter((e) => e.action === extraFilters.action);
    }
    if (extraFilters?.result) {
      filtered = filtered.filter((e) => e.result === extraFilters.result);
    }

    // VPS scope: direct resourceId, job-related (jobId or resourceId), serverLabel legacy
    const jobIdSet = new Set(vpsJobIds);
    filtered = filtered.filter(
      (e) =>
        e.resourceId === vpsId ||
        (e.jobId != null && jobIdSet.has(e.jobId)) ||
        (e.resourceId != null && jobIdSet.has(e.resourceId)) ||
        e.serverLabel === vpsName,
    );

    // Sort newest-first
    filtered.sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      if (bTime !== aTime) return bTime - aTime;
      return b.id.localeCompare(a.id);
    });

    // Paginate after filtering
    if (page) {
      return filtered.slice(page.offset, page.offset + page.limit);
    }
    return filtered;
  }
}
