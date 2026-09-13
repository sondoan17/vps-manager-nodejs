import type { AgentState } from "../agents/agent.models.js";

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
  keyProvisionedAt?: string;
  kind?: "remote" | "local";
  managedBy?: "user" | "system";
  dockerMetricsEnabled?: boolean;
  /** Persisted agent lifecycle state (from agent_states), surfaced on VPS data. */
  agentStatus?: "not_installed" | "installing" | "online" | "offline" | "failed";
  /** Job that last drove agent install/uninstall (used to track progress live). */
  lastAgentInstallJobId?: string;
  /** Last error captured by the agent lifecycle (install/uninstall). */
  agentLastError?: string;
  createdAt: string;
  updatedAt: string;
};

export type AgentStateOnVps = Pick<
  VpsRecord,
  "agentStatus" | "lastAgentInstallJobId" | "agentLastError"
>;

/**
 * Merge the persisted agent state for a VPS onto its record. Does not mutate
 * the input; returns the input untouched when no state exists so callers can
 * safely pass demo fixtures through.
 */
export function applyAgentState(
  record: VpsRecord,
  state?: AgentState,
): VpsRecord {
  if (!state) return record;
  return {
    ...record,
    agentStatus: state.status,
    lastAgentInstallJobId: state.lastInstallJobId,
    agentLastError: state.lastError,
  };
}

export type CreateVpsInput = {
  name: string;
  displayName?: string;
  host: string;
  port: number;
  username: string;
  provider?: string;
  region?: string;
  tags?: string[];
  status?: "unknown" | "healthy" | "warning" | "unreachable";
  notes?: string;
  password?: string;
};

export type UpdateVpsInput = Partial<Omit<CreateVpsInput, "password">> & {
  dockerMetricsEnabled?: boolean;
};
