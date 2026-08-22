import { type FormEvent, type ReactNode } from "react";
import type { DashboardOverview, VpsRecord } from "../../../lib/api";

export type ViewMode = "card" | "table";

export type CreateFormType = {
  name: string;
  displayName: string;
  host: string;
  port: string;
  username: string;
  password: string;
};

export type ServersPanelProps = {
  records: VpsRecord[];
  visibleRecords: VpsRecord[];
  statusMessage: ReactNode;
  serverSearch: string;
  statusFilter: string;
  busy: boolean;
  provisionPasswords: Record<string, string>;
  createForm: CreateFormType;
  metrics: DashboardOverview["metrics"];
  systemInfo: DashboardOverview["systemInfo"];
  dockerMetrics: DashboardOverview["dockerMetrics"];
  jobs: DashboardOverview["jobs"];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onCreateFormChange: (value: CreateFormType) => void;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onPasswordChange: (id: string, value: string) => void;
  onProvision: (vps: VpsRecord) => void;
  onVerify: (vps: VpsRecord) => void;
  onInstallAgent: (vps: VpsRecord) => void;
  onToggleDockerMetrics: (vps: VpsRecord) => void;
  onDelete: (vps: VpsRecord) => void;
};
