import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { DashboardSessionGuard } from "../auth/dashboard-session.guard.js";
import { OriginGuard } from "../auth/origin-guard.js";
import { AuditService, type AuditFilter } from "./audit.service.js";

@Controller("api/audit")
@UseGuards(DashboardSessionGuard, OriginGuard)
export class AuditController {
  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  @Get()
  async list(@Query() query: AuditFilter) {
    return { data: await this.auditService.list(query) };
  }
}
