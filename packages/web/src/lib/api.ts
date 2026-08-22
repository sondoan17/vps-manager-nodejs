export type VpsRecord = {
  id: string;
  name: string;
  displayName?: string;
  host: string;
  port: number;
  username: string;
  provider?: string;
  region?: string;
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

type ApiResponse<T> = { data?: T; error?: { message?: string; [key: string]: unknown } };
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

export function getHostKeyTrustRequired(error: unknown): SshHostKeyTrustRequired | undefined {
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
    throw new ApiError(payload.error?.message || "Request failed", payload.error);
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

export function updateVps(
  id: string,
  payload: Partial<Pick<VpsRecord, "dockerMetricsEnabled">>,
) {
  return request<VpsRecord>(`${vpsPath(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

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

export function deleteVps(id: string) {
  return request<null>(`${vpsPath(id)}`, { method: "DELETE" });
}

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
