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
  health?: "healthy" | "unhealthy" | "starting" | "none";
  cpuPercent: number;
  memoryUsageBytes: number;
  memoryLimitBytes?: number;
  networkRxBytes: number;
  networkTxBytes: number;
  blockReadBytes: number;
  blockWriteBytes: number;
  pids: number;
};

export type AgentDockerContainerMetricV2 = AgentDockerContainerMetric & {
  containerKey: string;
};

export type AgentDockerErrorCode =
  | "socket_missing"
  | "permission_denied"
  | "timeout"
  | "daemon_unreachable"
  | "unsupported_os"
  | "bad_response";

export type DockerCoverage = {
  detailsSampled: number;
  detailsTotalEligible: number;
  complete: boolean;
  /** SHA-256 over sorted sampled container keys; opaque, max 64 chars. */
  cohortDigest?: string;
};

export type DockerSampledContainerAggregate = {
  coverage: DockerCoverage;
  cpuPercent: number;
  memoryUsageBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
  blockReadBytes: number;
  blockWriteBytes: number;
  pids: number;
};

export type DockerEventGapReason =
  | "boundary_overflow"
  | "boundary_overrun_abandoned"
  | "response_oversize"
  | "collection_deadline";

export type DockerEventContext = {
  version: 1;
  healthStatus?: "healthy" | "unhealthy" | "starting" | "none";
  exitCode?: number;
  signal?: number;
  oomKilled?: boolean;
  reason?: DockerEventGapReason | "daemon_restarted";
  skippedFromNano?: string;
  skippedThroughNano?: string;
  skippedCount?: number;
};

export type AgentDockerEvent = {
  eventId: string;
  eventOccurredAt: string;
  containerKey?: string;
  action:
    | "create"
    | "start"
    | "restart"
    | "die"
    | "stop"
    | "kill"
    | "destroy"
    | "remove"
    | "health_status"
    | "stream_gap"
    | "daemon_restarted";
  context: DockerEventContext;
};

export type DockerStorageCategory = {
  supported: boolean;
  count: number;
  totalBytes: number;
  reclaimableBytes?: number;
  reclaimableSupported?: boolean;
  estimatedReclaimableBytes?: number;
};

export type AgentDockerStorageAggregate = {
  formulaVersion: 1;
  images: DockerStorageCategory;
  containers: DockerStorageCategory;
  localVolumes: DockerStorageCategory;
  buildCache: DockerStorageCategory;
};

export type AgentDockerMetricsInputV1 = {
  collectedAt: string;
  agentVersion?: string;
  engineVersion?: string;
  apiVersion?: string;
  os?: string;
  architecture?: string;
  schemaVersion: 1;
  available: boolean;
  errorCode?:
    | "socket_missing"
    | "permission_denied"
    | "timeout"
    | "daemon_unreachable"
    | "unsupported_os"
    | "bad_response";
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

export type DockerEventWatermark = {
  timeNano: string;
  boundaryDigests: string[];
};

export type DockerEventWindow = {
  since: string;
  until: string;
  capped: boolean;
  lossy: boolean;
  gapReason?:
    | "boundary_overflow"
    | "boundary_overrun_abandoned"
    | "response_oversize"
    | "collection_deadline";
};

export type AgentDockerMetricsInputV2 = {
  collectedAt: string;
  agentVersion?: string;
  engineVersion?: string;
  apiVersion?: string;
  os?: string;
  architecture?: string;
  schemaVersion: 2;
  agentInstanceId: string;
  snapshotId: string;
  /** Monotonically comparable positive canonical decimal sequence supplied by the agent. */
  sourceSequence: string;
  batchId?: string;
  available: boolean;
  errorCode?: AgentDockerErrorCode;
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
  containers: AgentDockerContainerMetricV2[];
  sampledContainerAggregate?: DockerSampledContainerAggregate;
  events?: AgentDockerEvent[];
  eventWindow?: DockerEventWindow;
  fromWatermark?: DockerEventWatermark;
  proposedWatermark?: DockerEventWatermark;
  storage?: AgentDockerStorageAggregate;
};

/** Additive discriminated union for the Docker ingest branch. V1 is unchanged. */
export type AgentDockerMetricsInput =
  AgentDockerMetricsInputV1 | AgentDockerMetricsInputV2;

export type DockerMetricsFreshness = "fresh" | "stale";

/** Derived at read time; freshness is intentionally never persisted. */
export type AgentDockerMetrics = AgentDockerMetricsInputV1 & {
  vpsId: string;
  receivedAt: string;
  freshness?: DockerMetricsFreshness;
  ageSeconds?: number;
  lastUpdatedAt?: string;
};

export type DockerIngestCapability = {
  maxSchemaVersion: 1 | 2;
  history: boolean;
  containerHistory: boolean;
  events: boolean;
  storage: boolean;
};

export type DockerIngestStatus = {
  schemaVersion: 1 | 2;
  capabilities: DockerIngestCapability;
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
  location?: { city: string; country: string; detectedAt: string };
  system?: AgentSystemInfoInput;
  docker?: AgentDockerMetricsInput;
};
