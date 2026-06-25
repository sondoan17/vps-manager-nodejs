import { Controller, Get, Inject, Query } from "@nestjs/common";
import { AuditService, type AuditFilter } from "../audit/audit.service.js";

@Controller("api/audit")
export class AuditController {
  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  @Get()
  async list(@Query() query: AuditFilter) {
    return { data: await this.auditService.list(query) };
  }
}
