import type { AuditEvent } from "./audit.js";
import type { CommandJob } from "./jobs.js";
import type { MetricSample } from "./metrics.js";
import type { VpsRecord } from "./vps.js";
import type { AppMode } from "../config/app-config.js";

export type MetricFreshness = "fresh" | "stale";

export type DashboardMetricSample = MetricSample & {
  freshness: MetricFreshness;
};

export type DashboardJob = CommandJob & {
  progress: number;
};

export type DemoTerminalSession = {
  command: string;
  output: string;
};

export type DemoTerminalOverview = {
  label: string;
  networkAccess: "disabled";
  commands: string[];
  sessions: DemoTerminalSession[];
};

export type DashboardSettings = {
  appMode: AppMode;
  webTerminalEnabled: boolean;
  realSshEnabled: boolean;
  authRequiredInLocalMode: boolean;
};

export type DashboardSummary = {
  totalServers: number;
  healthyServers: number;
  warningServers: number;
  unreachableServers: number;
  runningJobs: number;
};

export type DashboardOverview = {
  mode: AppMode;
  banner?: string;
  summary: DashboardSummary;
  servers: VpsRecord[];
  metrics: DashboardMetricSample[];
  jobs: DashboardJob[];
  auditEvents: AuditEvent[];
  terminal: DemoTerminalOverview;
  settings: DashboardSettings;
};
