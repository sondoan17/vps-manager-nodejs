export type VpsRecord = {
  id: string;
  name: string;
  displayName?: string;
  host: string;
  port: number;
  username: string;
  provider?: string;
  region?: string;
  city?: string;
  country?: string;
  locationDetectedAt?: string;
  tags?: string[];
  status?: "unknown" | "healthy" | "warning" | "unreachable";
  lastSeenAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  keyProvisionedAt?: string;
  kind?: "remote" | "local";
  managedBy?: "user" | "system";
  dockerMetricsEnabled?: boolean;
  agentStatus?:
    "not_installed" | "installing" | "online" | "offline" | "failed";
  lastAgentInstallJobId?: string;
  agentLastError?: string;
};

export type DashboardDockerContainerMetric = {
  id: string;
  name: string;
  image: string;
  state: string;
  status?: string;
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

export type DashboardDockerMetrics = {
  vpsId: string;
  collectedAt: string;
  receivedAt: string;
  agentVersion?: string;
  schemaVersion: 1;
  available: boolean;
  freshness?: "fresh" | "stale";
  ageSeconds?: number;
  lastUpdatedAt?: string;
  engineVersion?: string;
  apiVersion?: string;
  errorCode?:
    | "socket_missing"
    | "permission_denied"
    | "timeout"
    | "daemon_unreachable"
    | "unsupported_os"
    | "bad_response"
    | string;
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
  containers: DashboardDockerContainerMetric[];
};

export type DashboardOverview = {
  mode: "demo" | "local";
  banner?: string;
  summary: {
    totalServers: number;
    healthyServers: number;
    warningServers: number;
    unreachableServers: number;
    runningJobs: number;
  };
  servers: VpsRecord[];
  metrics: Array<{
    vpsId: string;
    cpu: number;
    memory: number;
    disk: number;
    loadAverage: number;
    networkRx: number;
    networkTx: number;
    uptime: number;
    collectedAt: string;
    freshness: "fresh" | "stale";
    trend?: {
      range: string;
      points: number[];
      min: number;
      max: number;
      threshold: number;
      unit?: string;
    };
  }>;
  systemInfo: Array<{
    vpsId: string;
    collectedAt: string;
    receivedAt: string;
    agentVersion?: string;
    os?: {
      family?: string;
      name?: string;
      version?: string;
      prettyName?: string;
    };
    kernel?: {
      release?: string;
      version?: string;
      arch?: string;
    };
    cpu?: {
      cores?: number;
      model?: string;
    };
    memory?: {
      totalBytes?: number;
      availableBytes?: number;
    };
    rootDisk?: {
      mountPoint: string;
      fsType?: string;
      totalBytes?: number;
      usedBytes?: number;
      freeBytes?: number;
    };
  }>;
  dockerMetrics: DashboardDockerMetrics[];
  jobs: Array<{
    id: string;
    vpsId: string;
    type: string;
    status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
    progress: number;
    step?: string;
    startedAt?: string;
    finishedAt?: string;
    outputPreview?: string;
    errorMessage?: string;
    workerId?: string;
    durationMs?: number;
    retryCount?: number;
    errorLogUrl?: string;
  }>;
  auditEvents: Array<{
    id: string;
    actor?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    result: "success" | "failure" | "blocked";
    timestamp: string;
    severity?: "info" | "warning" | "critical";
    serverLabel?: string;
    actionLabel?: string;
    eventCode?: string;
    sourceIp?: string;
    requestId?: string;
    client?: string;
    jobId?: string;
    durationMs?: number;
    authMethod?: string;
    reason?: string;
  }>;
  terminal: {
    label: string;
    networkAccess: "disabled";
    commands: string[];
    sessions: Array<{ command: string; output: string }>;
  };
  settings: {
    appMode: "demo" | "local";
    webTerminalEnabled: boolean;
    realSshEnabled: boolean;
    authRequiredInLocalMode: boolean;
  };
};

export type DashboardMetric = DashboardOverview["metrics"][number];
export type DashboardSystemInfo = DashboardOverview["systemInfo"][number];
export type { DashboardDockerMetrics as DashboardDockerMetric };
export type DashboardJob = DashboardOverview["jobs"][number];
export type AuditEvent = DashboardOverview["auditEvents"][number];

export type CreateVpsPayload = {
  name: string;
  displayName: string;
  host: string;
  port: number;
  username: string;
};

type ApiResponse<T> = {
  data?: T;
  error?: { message?: string; [key: string]: unknown };
};
const REQUEST_TIMEOUT_MS = 45_000;

export type SshHostKeyTrustRequired = {
  error: "SSH_HOST_KEY_TRUST_REQUIRED";
  vpsId: string;
  host: string;
  port: number;
  fingerprint?: string;
  keyType?: string;
  message?: string;
};

export class ApiError extends Error {
  readonly payload?: ApiResponse<unknown>["error"];

  constructor(message: string, payload?: ApiResponse<unknown>["error"]) {
    super(message);
    this.name = "ApiError";
    this.payload = payload;
  }
}

export function getHostKeyTrustRequired(
  error: unknown,
): SshHostKeyTrustRequired | undefined {
  if (!(error instanceof ApiError)) return undefined;
  if (error.payload?.error !== "SSH_HOST_KEY_TRUST_REQUIRED") return undefined;
  return error.payload as SshHostKeyTrustRequired;
}

export type AuthSession = {
  user?: string;
  createdAt?: string;
  expiresAt?: string;
};

export type AuthStatus = {
  mode: "demo" | "local";
  authenticated: boolean;
  authRequired: boolean;
  session?: AuthSession;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      credentials: options.credentials || "same-origin",
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        "Request timed out. Check backend connectivity and retry.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) return null as T;
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T>;
  if (!response.ok) {
    throw new ApiError(
      payload.error?.message || "Request failed",
      payload.error,
    );
  }
  return payload.data as T;
}

export function getAuthStatus() {
  return request<AuthStatus>("/api/auth/me");
}

export function loginWithDashboardPassword(password: string) {
  return request<AuthStatus>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function logoutDashboard() {
  return request<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

export function listVps() {
  return request<VpsRecord[]>("/api/vps");
}

export function getDashboardOverview() {
  return request<DashboardOverview>("/api/dashboard");
}

export function listJobs() {
  return request<DashboardJob[]>("/api/jobs");
}

export function listMetrics() {
  return request<DashboardMetric[]>("/api/metrics");
}

export function listAuditEvents() {
  return request<AuditEvent[]>("/api/audit");
}

export function createVps(payload: CreateVpsPayload) {
  return request<VpsRecord>("/api/vps", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function vpsPath(id: string): string {
  return `/api/vps/${encodeURIComponent(id)}`;
}

export function updateVps(id: string, payload: UpdateVpsPayload) {
  return request<VpsRecord>(`${vpsPath(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type UpdateVpsPayload = Partial<
  Pick<
    VpsRecord,
    | "displayName"
    | "host"
    | "port"
    | "username"
    | "provider"
    | "notes"
    | "dockerMetricsEnabled"
  >
>;

export function provisionKey(id: string, password: string) {
  return request<VpsRecord>(`${vpsPath(id)}/provision-key`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export type SshHostKeyScanResult = {
  vpsId: string;
  host: string;
  port: number;
  keys: Array<{ type: string; key: string; fingerprint: string }>;
};

export function scanSshHostKey(id: string) {
  return request<SshHostKeyScanResult>(`${vpsPath(id)}/ssh/host-key/scan`, {
    method: "POST",
  });
}

export function trustSshHostKey(
  id: string,
  payload: { fingerprint: string; keyType?: string },
) {
  return request<unknown>(`${vpsPath(id)}/ssh/host-key/trust`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyKey(id: string) {
  return request<{ ok: true }>(`${vpsPath(id)}/verify-key`, { method: "POST" });
}

export function installAgent(id: string, password?: string) {
  return request<{
    jobId: string;
    state: { status: string; lastInstallJobId?: string };
  }>(`${vpsPath(id)}/install-agent`, {
    method: "POST",
    body: JSON.stringify(password ? { password } : {}),
  });
}

export function uninstallAgent(id: string) {
  return request<{
    jobId: string;
    state: { status: string; lastInstallJobId?: string };
  }>(`${vpsPath(id)}/uninstall-agent`, { method: "POST" });
}

export function upgradeAgent(id: string) {
  return request<{
    jobId: string;
    state: { status: string; lastInstallJobId?: string };
  }>(`${vpsPath(id)}/upgrade-agent`, { method: "POST" });
}

export function restartAgent(id: string) {
  return request<{
    jobId: string;
    state: { status: string; lastInstallJobId?: string };
  }>(`${vpsPath(id)}/restart-agent`, { method: "POST" });
}

export function rotateAgent(id: string) {
  return request<{
    jobId: string;
    state: { status: string; lastInstallJobId?: string };
  }>(`${vpsPath(id)}/rotate-agent`, { method: "POST" });
}

export function deleteVps(id: string) {
  return request<null>(`${vpsPath(id)}`, { method: "DELETE" });
}

// ── Docker monitoring (bounded, read-only detail data) ──────────────

export type DockerPage<T> = { data: T[]; page: { limit: number; nextCursor?: string; hasMore: boolean } };
export type DockerHostSample = { id: string; vpsId: string; agentInstanceId: string; snapshotId: string; collectedAt: string; receivedAt: string; effectiveAt: string; metrics: Record<string, number>; coverage?: { detailsSampled: number; detailsTotalEligible: number; complete: boolean; cohortDigest?: string } };
export type DockerMetricRollup = { id: string; vpsId: string; agentInstanceId: string; scope: "host" | "container" | "aggregate"; metricName?: string; containerKey?: string; bucketStart: string; formulaVersion: number; firstAt: string; lastAt: string; sampleCount: number; gaugeMin?: number; gaugeMax?: number; gaugeAverage?: number; counterIncrease?: number; resetCount: number; expectedSamples: number; observedSamples: number; partialSampleCount: number; gapCount: number; coverageRatio: number };
export type DockerOperationalEvent = { id: string; vpsId: string; agentInstanceId: string; containerKey?: string; action: string; eventOccurredAt: string; receivedAt: string; eventDigest: string; contextVersion: 1; healthStatus?: string; exitCode?: number; signal?: number; oomKilled?: boolean };
export type DockerStorageCategory = { supported: boolean; count: number; totalBytes: number; reclaimableBytes?: number; reclaimableSupported?: boolean; estimatedReclaimableBytes?: number };
export type DockerStorageLatest = { vpsId: string; agentInstanceId: string; snapshotId: string; collectedAt: string; receivedAt: string; images: DockerStorageCategory; containers: DockerStorageCategory; localVolumes: DockerStorageCategory; buildCache: DockerStorageCategory; formulaVersion: 1 };
export type DockerAlert = { id: string; vpsId: string; agentInstanceId?: string; ruleKind: string; containerKey?: string; state: "open" | "acknowledged" | "resolved"; openedAt: string; lastObservedAt?: string; resolvedAt?: string; acknowledgedAt?: string; occurrences: number; summary: string; resolutionReason?: string; contextVersion: 1 };
export type DockerHistoryQuery = { limit?: number; from?: string; to?: string; cursor?: string };
export type DockerContainerHistoryQuery = DockerHistoryQuery & { agentInstanceId: string; containerKey: string };
export type DockerEventsQuery = DockerHistoryQuery & { action?: string; agentInstanceId?: string; containerKey?: string };
export type DockerAlertsQuery = DockerHistoryQuery & { state?: DockerAlert["state"]; ruleKind?: string; agentInstanceId?: string; containerKey?: string };

async function requestEnvelope<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      credentials: options.credentials || "same-origin",
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        "Request timed out. Check backend connectivity and retry.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) return { data: [], page: { limit: 0, hasMore: false } } as T;
  const payload = (await response.json().catch(() => ({}))) as T & ApiResponse<unknown>;
  if (!response.ok) {
    const err = (payload as ApiResponse<unknown>).error;
    throw new ApiError(err?.message || "Request failed", err);
  }
  return payload;
}

function dockerQueryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) query.set(key, String(value));
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
}
export function listVpsDockerHistory(id: string, params: DockerHistoryQuery = {}) { return requestEnvelope<DockerPage<DockerHostSample>>(`${vpsPath(id)}/docker/history${dockerQueryString(params)}`); }
export function listVpsDockerContainerHistory(id: string, params: DockerContainerHistoryQuery) {
  const { agentInstanceId, containerKey, ...query } = params;
  return requestEnvelope<DockerPage<DockerHostSample>>(`${vpsPath(id)}/docker/instances/${encodeURIComponent(agentInstanceId)}/containers/${encodeURIComponent(containerKey)}/history${dockerQueryString(query)}`);
}
export function listVpsDockerRollups(id: string, params: DockerHistoryQuery = {}) { return requestEnvelope<DockerPage<DockerMetricRollup>>(`${vpsPath(id)}/docker/rollups${dockerQueryString(params)}`); }
export function listVpsDockerEvents(id: string, params: DockerEventsQuery = {}) { return requestEnvelope<DockerPage<DockerOperationalEvent>>(`${vpsPath(id)}/docker/events${dockerQueryString(params)}`); }
export function getVpsDockerStorage(id: string) { return request<DockerStorageLatest | null>(`${vpsPath(id)}/docker/storage`); }
export function listVpsDockerAlerts(id: string, params: DockerAlertsQuery = {}) { return requestEnvelope<DockerPage<DockerAlert>>(`${vpsPath(id)}/docker/alerts${dockerQueryString(params)}`); }
export function acknowledgeVpsDockerAlert(id: string, alertId: string) { return requestEnvelope<{ data: DockerAlert }>(`${vpsPath(id)}/docker/alerts/${encodeURIComponent(alertId)}/acknowledge`, { method: "POST" }); }

// ── Scoped VPS endpoints (Phase 4) ──────────────────────────────────

export function listVpsJobs(
  id: string,
  params?: { limit?: number; offset?: number },
) {
  const query = params
    ? `?limit=${params.limit ?? 100}&offset=${params.offset ?? 0}`
    : "";
  return request<DashboardJob[]>(`${vpsPath(id)}/jobs${query}`);
}

export function listVpsMetrics(id: string) {
  return request<DashboardMetric[]>(`${vpsPath(id)}/metrics`);
}

export function listVpsAuditEvents(
  id: string,
  params?: { limit?: number; offset?: number },
) {
  const query = params
    ? `?limit=${params.limit ?? 100}&offset=${params.offset ?? 0}`
    : "";
  return request<AuditEvent[]>(`${vpsPath(id)}/audit${query}`);
}
