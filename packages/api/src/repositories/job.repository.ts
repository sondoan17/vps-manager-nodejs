import { nanoid } from "nanoid";
import type { CommandJob } from "../models/jobs.js";
import { readJsonFile, writeJsonFile, withFileLock } from "./json-file.js";

type JobFile = { jobs: CommandJob[] };

export type JobRepository = {
  list(): Promise<CommandJob[]>;
  get(id: string): Promise<CommandJob | undefined>;
  create(job: Omit<CommandJob, "id"> & { id?: string }): Promise<CommandJob>;
  update(id: string, patch: Partial<Omit<CommandJob, "id">>): Promise<CommandJob | undefined>;
  append(job: Omit<CommandJob, "id"> & { id?: string }): Promise<CommandJob>;
};

/** Normalize jobs that may be missing progress/updatedAt from old files. */
function normalizeJob(job: CommandJob): CommandJob {
  return {
    ...job,
    progress: job.progress ?? 0,
    updatedAt: job.updatedAt ?? job.startedAt ?? new Date().toISOString(),
  };
}

export function createJsonJobRepository(filePath = "data/jobs.json"): JobRepository {
  return {
    async list() {
      const data = await readJsonFile<JobFile>(filePath, { jobs: [] });
      return data.jobs.map(normalizeJob);
    },

    async get(id: string) {
      const data = await readJsonFile<JobFile>(filePath, { jobs: [] });
      const job = data.jobs.find((j) => j.id === id);
      return job ? normalizeJob(job) : undefined;
    },

    async create(input) {
      return withFileLock(filePath, async () => {
        const data = await readJsonFile<JobFile>(filePath, { jobs: [] });
        const job: CommandJob = {
          ...input,
          id: input.id ?? `job_${nanoid(12)}`,
          progress: input.progress ?? 0,
          updatedAt: new Date().toISOString(),
        };
        data.jobs.push(job);
        await writeJsonFile(filePath, data);
        return job;
      });
    },

    async update(id: string, patch: Partial<Omit<CommandJob, "id">>) {
      return withFileLock(filePath, async () => {
        const data = await readJsonFile<JobFile>(filePath, { jobs: [] });
        const index = data.jobs.findIndex((j) => j.id === id);
        if (index === -1) return undefined;
        data.jobs[index] = { ...data.jobs[index], ...patch, updatedAt: new Date().toISOString() };
        await writeJsonFile(filePath, data);
        return data.jobs[index];
      });
    },

    async append(input) {
      return this.create(input);
    }
  };
}
