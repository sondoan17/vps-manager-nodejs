import { Inject, Injectable } from "@nestjs/common";
import type { AppConfig } from "../config/app-config.js";
import { getDemoJobs } from "../demo/demo-fixtures.js";
import type { CommandJob } from "../jobs/jobs.models.js";
import type { JobRepository } from "../persistence/repositories/job.repository.js";
import type { PaginationParams } from "../common/pagination.js";
import { APP_CONFIG, JOB_REPOSITORY } from "../tokens.js";

@Injectable()
export class JobService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(JOB_REPOSITORY) private readonly jobRepository: JobRepository
  ) {}

  async list(page?: PaginationParams): Promise<CommandJob[]> {
    if (this.config.mode === "demo") {
      const all = getDemoJobs();
      return page ? all.slice(page.offset, page.offset + page.limit) : all;
    }
    return this.jobRepository.list(page);
  }

  async get(id: string): Promise<CommandJob | undefined> {
    if (this.config.mode === "demo") {
      return getDemoJobs().find((j) => j.id === id);
    }
    return this.jobRepository.get(id);
  }

  async create(input: Omit<CommandJob, "id"> & { id?: string }): Promise<CommandJob> {
    return this.jobRepository.create(input, this.config.jobHistoryLimit);
  }

  async update(id: string, patch: Partial<Omit<CommandJob, "id">>): Promise<CommandJob | undefined> {
    return this.jobRepository.update(id, patch);
  }

  async append(input: Omit<CommandJob, "id"> & { id?: string }): Promise<CommandJob> {
    return this.jobRepository.append(input, this.config.jobHistoryLimit);
  }
}
