export type AgentCredentialStatus = "pending" | "active" | "revoked";

export type AgentCredential = {
  id: string;
  vpsId: string;
  secretHash: string;
  status: AgentCredentialStatus;
  createdAt: string;
  activatedAt?: string;
  revokedAt?: string;
  lastUsedAt?: string;
  lastUsedIp?: string;
};

export type AgentState = {
  vpsId: string;
  status: "not_installed" | "installing" | "online" | "offline" | "failed";
  version?: string;
  installedAt?: string;
  lastSeenAt?: string;
  lastError?: string;
  lastInstallJobId?: string;
};

export type AgentSystemOsInfo = {
  family?: string;
  name?: string;
  version?: string;
  prettyName?: string;
};

export type AgentSystemKernelInfo = {
  release?: string;
  version?: string;
  arch?: string;
};

export type AgentSystemCpuInfo = {
  cores?: number;
  model?: string;
};

export type AgentSystemMemoryInfo = {
  totalBytes?: number;
  availableBytes?: number;
};

export type AgentSystemRootDiskInfo = {
  mountPoint: string;
  fsType?: string;
  totalBytes?: number;
  usedBytes?: number;
  freeBytes?: number;
};

export type AgentSystemInfoInput = {
  os?: AgentSystemOsInfo;
  kernel?: AgentSystemKernelInfo;
  cpu?: AgentSystemCpuInfo;
  memory?: AgentSystemMemoryInfo;
  rootDisk?: AgentSystemRootDiskInfo;
};

export type AgentSystemInfo = {
  vpsId: string;
  collectedAt: string;
  receivedAt: string;
  agentVersion?: string;
  os?: AgentSystemOsInfo;
  kernel?: AgentSystemKernelInfo;
  cpu?: AgentSystemCpuInfo;
  memory?: AgentSystemMemoryInfo;
  rootDisk?: AgentSystemRootDiskInfo;
};

export type AgentDockerContainerMetric = {
  id: string;
  name: string;
  image: string;
  status?: string;
  state: string;
  createdAt?: string;
  cpuPercent: number;
  memoryUsageBytes: number;
  memoryLimitBytes?: number;
  networkRxBytes: number;
  networkTxBytes: number;
  blockReadBytes: number;
  blockWriteBytes: number;
  pids: number;
};

export type AgentDockerMetricsInput = {
  collectedAt: string;
  agentVersion?: string;
  schemaVersion: 1;
  available: boolean;
  errorCode?: "socket_missing" | "permission_denied" | "timeout" | "daemon_unreachable" | "unsupported_os" | "bad_response";
  containerTotal: number;
  containerRunning: number;
  cpuPercent: number;
  memoryUsageBytes: number;
  memoryLimitBytes?: number;
  networkRxBytes: number;
  networkTxBytes: number;
  blockReadBytes: number;
  blockWriteBytes: number;
  pids: number;
  containers: AgentDockerContainerMetric[];
};

export type AgentDockerMetrics = AgentDockerMetricsInput & {
  vpsId: string;
  receivedAt: string;
};

export type AgentMetricPayload = {
  vpsId?: string;
  collectedAt: string;
  cpu: number;
  memory: number;
  disk: number;
  loadAverage: number;
  networkRx: number;
  networkTx: number;
  uptime: number;
  agentVersion: string;
  system?: AgentSystemInfoInput;
  docker?: AgentDockerMetricsInput;
};
