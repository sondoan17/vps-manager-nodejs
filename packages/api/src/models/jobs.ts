export type CommandJob = {
  id: string;
  vpsId: string;
  type: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
  outputPreview?: string;
  errorMessage?: string;
};
