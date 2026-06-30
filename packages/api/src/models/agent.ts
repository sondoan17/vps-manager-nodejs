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
};
