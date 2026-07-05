import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { DashboardSessionGuard } from "../auth/dashboard-session.guard.js";
import { OriginGuard } from "../auth/origin-guard.js";
import { buildPageMeta, parsePagination, type PaginationQuery } from "../common/pagination.js";
import { AuditService, type AuditFilter } from "./audit.service.js";

@Controller("api/audit")
@UseGuards(DashboardSessionGuard, OriginGuard)
export class AuditController {
  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  @Get()
  async list(@Query() query: AuditFilter & PaginationQuery) {
    const { limit: _l, offset: _o, ...filters } = query as Record<string, string | string[]>;
    const page = parsePagination({ limit: _l, offset: _o }, "audit");
    const data = await this.auditService.list(filters as AuditFilter, page);
    return { data, page: buildPageMeta(page, data.length) };
  }
}
