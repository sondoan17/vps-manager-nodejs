import { getLocalAuthToken } from "./auth-token";

export type VpsRecord = {
  id: string;
  name: string;
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
export type DashboardJob = DashboardOverview["jobs"][number];
export type AuditEvent = DashboardOverview["auditEvents"][number];

export type CreateVpsPayload = {
  name: string;
  host: string;
  port: number;
  username: string;
};

type ApiResponse<T> = { data?: T; error?: { message?: string } };
const REQUEST_TIMEOUT_MS = 45_000;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const localAuthToken = getLocalAuthToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (localAuthToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${localAuthToken}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out. Check backend connectivity and retry.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) return null as T;
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T>;
  if (!response.ok) throw new Error(payload.error?.message || "Request failed");
  return payload.data as T;
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

export function provisionKey(id: string, password: string) {
  return request<VpsRecord>(`/api/vps/${id}/provision-key`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function verifyKey(id: string) {
  return request<{ ok: true }>(`/api/vps/${id}/verify-key`, { method: "POST" });
}

export function installAgent(id: string, password?: string) {
  return request<{ jobId: string; state: { status: string; lastInstallJobId?: string } }>(`/api/vps/${id}/install-agent`, {
    method: "POST",
    body: JSON.stringify(password ? { password } : {}),
  });
}

export function deleteVps(id: string) {
  return request<null>(`/api/vps/${id}`, { method: "DELETE" });
}
