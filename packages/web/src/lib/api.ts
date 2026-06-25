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
  metrics: Array<{ vpsId: string; cpu: number; memory: number; disk: number; loadAverage: number; networkRx: number; networkTx: number; uptime: number; collectedAt: string; freshness: "fresh" | "stale"; trend?: { range: string; points: number[]; min: number; max: number; threshold: number; unit?: string } }>;
  jobs: Array<{ id: string; vpsId: string; type: string; status: "queued" | "running" | "succeeded" | "failed" | "cancelled"; progress: number; outputPreview?: string; errorMessage?: string; workerId?: string; durationMs?: number; retryCount?: number; errorLogUrl?: string }>;
  auditEvents: Array<{ id: string; actor?: string; action: string; resourceType?: string; resourceId?: string; result: "success" | "failure" | "blocked"; timestamp: string; severity?: "info" | "warning" | "critical"; serverLabel?: string; actionLabel?: string }>;
  terminal: { label: "Demo terminal"; networkAccess: "disabled"; commands: string[]; sessions: Array<{ command: string; output: string }> };
  settings: { appMode: "demo" | "local"; webTerminalEnabled: boolean; realSshEnabled: boolean; authRequiredInLocalMode: boolean };
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options
  });

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
  return request<VpsRecord>("/api/vps", { method: "POST", body: JSON.stringify(payload) });
}

export function provisionKey(id: string, password: string) {
  return request<VpsRecord>(`/api/vps/${id}/provision-key`, { method: "POST", body: JSON.stringify({ password }) });
}

export function verifyKey(id: string) {
  return request<{ ok: true }>(`/api/vps/${id}/verify-key`, { method: "POST" });
}

export function deleteVps(id: string) {
  return request<null>(`/api/vps/${id}`, { method: "DELETE" });
}
