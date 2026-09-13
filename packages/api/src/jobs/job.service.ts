import { Inject, Injectable } from "@nestjs/common";
import type { AppConfig } from "../config/app-config.js";
import { getDemoJobs } from "../demo/demo-fixtures.js";
import type { CommandJob } from "../jobs/jobs.models.js";
import type { JobRepository } from "../persistence/repositories/job.repository.js";
import type { PaginationParams } from "../common/pagination.js";
import { APP_CONFIG, JOB_REPOSITORY } from "../tokens.js";
import { JobActivityService } from "./job-activity.service.js";

@Injectable()
export class JobService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(JOB_REPOSITORY) private readonly jobRepository: JobRepository,
    @Inject(JobActivityService) private readonly activity: JobActivityService,
  ) {}

  async list(page?: PaginationParams): Promise<CommandJob[]> {
    if (this.config.mode === "demo") {
      const all = getDemoJobs();
      return page ? all.slice(page.offset, page.offset + page.limit) : all;
    }
    return this.jobRepository.list(page);
  }

  /**
   * List jobs for a specific VPS.
   * Filters by VPS id before pagination.
   *
   * Follow-up: add repository-level filtering when repository supports it.
   */
  async listByVpsId(
    vpsId: string,
    page?: PaginationParams,
  ): Promise<CommandJob[]> {
    if (this.config.mode === "demo") {
      const all = getDemoJobs().filter((j) => j.vpsId === vpsId);
      return page ? all.slice(page.offset, page.offset + page.limit) : all;
    }
    // Get all jobs, filter by vpsId, then paginate
    const all = await this.jobRepository.list();
    const filtered = all.filter((j) => j.vpsId === vpsId);
    return page
      ? filtered.slice(page.offset, page.offset + page.limit)
      : filtered;
  }

  async get(id: string): Promise<CommandJob | undefined> {
    if (this.config.mode === "demo") {
      return getDemoJobs().find((j) => j.id === id);
    }
    return this.jobRepository.get(id);
  }

  async create(
    input: Omit<CommandJob, "id"> & { id?: string },
  ): Promise<CommandJob> {
    const job = await this.jobRepository.create(input, this.config.jobHistoryLimit);
    this.activity.publish(job);
    return job;
  }

  async update(
    id: string,
    patch: Partial<Omit<CommandJob, "id">>,
  ): Promise<CommandJob | undefined> {
    const job = await this.jobRepository.update(id, patch);
    if (job) this.activity.publish(job);
    return job;
  }

  async append(
    input: Omit<CommandJob, "id"> & { id?: string },
  ): Promise<CommandJob> {
    const job = await this.jobRepository.append(input, this.config.jobHistoryLimit);
    this.activity.publish(job);
    return job;
  }
}
