import { nanoid } from "nanoid";
import type { CommandJob } from "../models/jobs.js";
import { readJsonFile, writeJsonFile } from "./json-file.js";

type JobFile = { jobs: CommandJob[] };

export type JobRepository = {
  list(): Promise<CommandJob[]>;
  append(job: Omit<CommandJob, "id"> & { id?: string }): Promise<CommandJob>;
};

export function createJsonJobRepository(filePath = "data/jobs.json"): JobRepository {
  return {
    async list() {
      return (await readJsonFile<JobFile>(filePath, { jobs: [] })).jobs;
    },
    async append(input) {
      const data = await readJsonFile<JobFile>(filePath, { jobs: [] });
      const job = { ...input, id: input.id ?? `job_${nanoid(12)}` };
      data.jobs.push(job);
      await writeJsonFile(filePath, data);
      return job;
    }
  };
}
