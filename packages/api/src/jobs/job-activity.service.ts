import { Injectable } from "@nestjs/common";
import type { CommandJob } from "./jobs.models.js";

export type JobActivityListener = (job: CommandJob) => void;

/**
 * In-process broadcast bus for job state/progress changes.
 *
 * Producers (JobService mutation methods, JobRunnerService ctx updates)
 * call `publish(job)` whenever a job is created or its state/progress/step
 * changes. Consumers (monitoring SSE streams) subscribe and receive the
 * current job body so they can emit typed `jobs.updated` events without
 * polling the repository on every tick.
 *
 * This is intentionally tiny: failures inside one listener never break
 * other subscribers, and stale listeners are dropped on unsubscribe.
 */
@Injectable()
export class JobActivityService {
  private readonly listeners = new Set<JobActivityListener>();

  subscribe(listener: JobActivityListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(job: CommandJob): void {
    for (const listener of this.listeners) {
      try {
        listener(job);
      } catch {
        // A failing listener must not disrupt other subscribers.
      }
    }
  }
}