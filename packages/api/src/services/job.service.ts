import { Inject, Injectable } from "@nestjs/common";
import type { AppConfig } from "../config/app-config.js";
import { getDemoJobs } from "../demo/demo-fixtures.js";
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
      return getDemoJobs();
    }
    return this.jobRepository.list();
  }

  async get(id: string): Promise<CommandJob | undefined> {
    if (this.config.mode === "demo") {
      return getDemoJobs().find((j) => j.id === id);
    }
    return this.jobRepository.get(id);
  }

  async create(input: Omit<CommandJob, "id"> & { id?: string }): Promise<CommandJob> {
    return this.jobRepository.create(input);
  }

  async update(id: string, patch: Partial<Omit<CommandJob, "id">>): Promise<CommandJob | undefined> {
    return this.jobRepository.update(id, patch);
  }

  async append(input: Omit<CommandJob, "id"> & { id?: string }): Promise<CommandJob> {
    return this.jobRepository.append(input);
  }
}
