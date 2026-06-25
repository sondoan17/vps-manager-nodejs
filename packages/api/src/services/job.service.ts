import { Inject, Injectable } from "@nestjs/common";
import type { AppConfig } from "../config/app-config.js";
import { demoJobs } from "../demo/demo-data.js";
import type { CommandJob } from "../models/jobs.js";
import type { JobRepository } from "../repositories/job.repository.js";
import { APP_CONFIG, JOB_REPOSITORY } from "../tokens.js";

@Injectable()
export class JobService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(JOB_REPOSITORY) private readonly jobRepository: JobRepository
  ) {}

  async list(): Promise<CommandJob[]> {
    if (this.config.mode === "demo") {
      return [...demoJobs];
    }
    return this.jobRepository.list();
  }
}
