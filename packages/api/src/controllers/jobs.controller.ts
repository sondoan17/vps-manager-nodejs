import { Controller, Get, Inject } from "@nestjs/common";
import { JobService } from "../services/job.service.js";

@Controller("api/jobs")
export class JobsController {
  constructor(@Inject(JobService) private readonly jobService: JobService) {}

  @Get()
  async list() {
    return { data: await this.jobService.list() };
  }
}
