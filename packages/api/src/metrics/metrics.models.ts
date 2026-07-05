export type MetricTrend = {
  range: string;
  points: number[];
  min: number;
  max: number;
  threshold: number;
  unit?: string;
};

export type MetricSample = {
  vpsId: string;
  cpu: number;
  memory: number;
  disk: number;
  loadAverage: number;
  networkRx: number;
  networkTx: number;
  uptime: number;
  collectedAt: string;
  receivedAt?: string;
  source?: "demo" | "agent" | "repository" | "local-agent";
  agentVersion?: string;
  trend?: MetricTrend;
};
