import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { DashboardSessionGuard } from "../auth/dashboard-session.guard.js";
import { OriginGuard } from "../auth/origin-guard.js";
import { buildPageMeta, parsePagination, type PaginationQuery } from "../common/pagination.js";
import { JobService } from "./job.service.js";

@Controller("api/jobs")
@UseGuards(DashboardSessionGuard, OriginGuard)
export class JobsController {
  constructor(@Inject(JobService) private readonly jobService: JobService) {}

  @Get()
  async list(@Query() query: PaginationQuery) {
    const page = parsePagination(query, "jobs");
    const data = await this.jobService.list(page);
    return { data, page: buildPageMeta(page, data.length) };
  }
}
