import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { DashboardSessionGuard } from "../auth/dashboard-session.guard.js";
import { OriginGuard } from "../auth/origin-guard.js";
import { JobService } from "../services/job.service.js";

@Controller("api/jobs")
@UseGuards(DashboardSessionGuard, OriginGuard)
export class JobsController {
  constructor(@Inject(JobService) private readonly jobService: JobService) {}

  @Get()
  async list() {
    return { data: await this.jobService.list() };
  }
}
