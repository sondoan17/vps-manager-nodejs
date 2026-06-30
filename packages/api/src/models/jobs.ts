export type CommandJob = {
  id: string;
  vpsId: string;
  type: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  progress: number;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
  outputPreview?: string;
  errorMessage?: string;
  workerId?: string;
  durationMs?: number;
  retryCount?: number;
  errorLogUrl?: string;
  step?: string;
  updatedAt?: string;
};
