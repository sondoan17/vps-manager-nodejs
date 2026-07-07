import { nanoid } from "nanoid";
import type { AgentCredential, AgentDockerMetrics, AgentState, AgentSystemInfo } from "../../agents/agent.models.js";
import { readJsonFile, readModifyWriteJsonFile, withFileLock, writeJsonFile } from "./json-file.js";

// ── Type ────────────────────────────────────────────────────────────────

export type AgentRepository = {
  createCredential(input: Omit<AgentCredential, "id" | "createdAt"> & { id?: string }): Promise<AgentCredential>;
  getCredential(id: string): Promise<AgentCredential | undefined>;
  listCredentialsByVps(vpsId: string): Promise<AgentCredential[]>;
  updateCredential(id: string, patch: Partial<AgentCredential>): Promise<AgentCredential | undefined>;
  revokeCredential(id: string): Promise<AgentCredential | undefined>;

  getState(vpsId: string): Promise<AgentState | undefined>;
  upsertState(state: AgentState): Promise<AgentState>;

  upsertSystemInfo(info: AgentSystemInfo): Promise<AgentSystemInfo>;
  getSystemInfo(vpsId: string): Promise<AgentSystemInfo | undefined>;
  listSystemInfo(): Promise<AgentSystemInfo[]>;

  upsertDockerMetrics(metrics: AgentDockerMetrics): Promise<AgentDockerMetrics>;
  getDockerMetrics(vpsId: string): Promise<AgentDockerMetrics | undefined>;
  listDockerMetrics(): Promise<AgentDockerMetrics[]>;
  deleteDockerMetrics(vpsId: string): Promise<boolean>;
};

// ── Storage shape ───────────────────────────────────────────────────────
// JSON-backed, single-process / local-only until a DB migration is added.

type AgentFile = {
  credentials: AgentCredential[];
  states: Record<string, AgentState>;
  systemInfo?: Record<string, AgentSystemInfo>;
  dockerMetrics?: Record<string, AgentDockerMetrics>;
};

// ── Factory ─────────────────────────────────────────────────────────────

export function createJsonAgentRepository(filePath = "data/agents.json"): AgentRepository {
  return {
    async createCredential(input) {
      return readModifyWriteJsonFile<AgentFile>(
        filePath,
        { credentials: [], states: {} },
        (data) => {
          const credential: AgentCredential = {
            ...input,
            id: input.id ?? `cred_${nanoid(12)}`,
            createdAt: new Date().toISOString(),
          };
          data.credentials.push(credential);
          return data;
        },
      ).then((data) => {
        const created = data.credentials[data.credentials.length - 1];
        if (!created) throw new Error("Failed to create credential");
        return created;
      });
    },

    async getCredential(id) {
      const data = await readJsonFile<AgentFile>(filePath, { credentials: [], states: {} });
      return data.credentials.find((c) => c.id === id);
    },

    async listCredentialsByVps(vpsId) {
      const data = await readJsonFile<AgentFile>(filePath, { credentials: [], states: {} });
      return data.credentials.filter((c) => c.vpsId === vpsId);
    },

    async updateCredential(id, patch) {
      return withFileLock(filePath, async () => {
        const data = await readJsonFile<AgentFile>(filePath, { credentials: [], states: {} });
        const index = data.credentials.findIndex((c) => c.id === id);
        if (index === -1) return undefined;
        data.credentials[index] = { ...data.credentials[index], ...patch };
        await writeJsonFile(filePath, data);
        return data.credentials[index];
      });
    },

    async revokeCredential(id) {
      return this.updateCredential(id, {
        status: "revoked",
        revokedAt: new Date().toISOString(),
      });
    },

    async getState(vpsId) {
      const data = await readJsonFile<AgentFile>(filePath, { credentials: [], states: {} });
      return data.states[vpsId];
    },

    async upsertState(state) {
      return readModifyWriteJsonFile<AgentFile>(
        filePath,
        { credentials: [], states: {} },
        (data) => {
          data.states[state.vpsId] = state;
          return data;
        },
      ).then(() => state);
    },

    async upsertSystemInfo(info) {
      let stored = info;
      return readModifyWriteJsonFile<AgentFile>(
        filePath,
        { credentials: [], states: {} },
        (data) => {
          if (!data.systemInfo) data.systemInfo = {};
          const current = data.systemInfo[info.vpsId];
          if (current && new Date(current.collectedAt).getTime() > new Date(info.collectedAt).getTime()) {
            stored = current;
            return data;
          }
          data.systemInfo[info.vpsId] = info;
          stored = info;
          return data;
        },
      ).then(() => stored);
    },

    async getSystemInfo(vpsId) {
      const data = await readJsonFile<AgentFile>(filePath, { credentials: [], states: {} });
      return data.systemInfo?.[vpsId];
    },

    async listSystemInfo() {
      const data = await readJsonFile<AgentFile>(filePath, { credentials: [], states: {} });
      return Object.values(data.systemInfo ?? {});
    },

    async upsertDockerMetrics(metrics) {
      let stored = metrics;
      await readModifyWriteJsonFile<AgentFile>(
        filePath,
        { credentials: [], states: {} },
        (data) => {
          if (!data.dockerMetrics) data.dockerMetrics = {};
          const current = data.dockerMetrics[metrics.vpsId];
          if (current && new Date(current.collectedAt).getTime() > new Date(metrics.collectedAt).getTime()) {
            stored = current;
            return data;
          }
          data.dockerMetrics[metrics.vpsId] = metrics;
          stored = metrics;
          return data;
        },
      );
      return stored;
    },

    async getDockerMetrics(vpsId) {
      const data = await readJsonFile<AgentFile>(filePath, { credentials: [], states: {} });
      return data.dockerMetrics?.[vpsId];
    },

    async listDockerMetrics() {
      const data = await readJsonFile<AgentFile>(filePath, { credentials: [], states: {} });
      return Object.values(data.dockerMetrics ?? {});
    },

    async deleteDockerMetrics(vpsId) {
      let deleted = false;
      await readModifyWriteJsonFile<AgentFile>(
        filePath,
        { credentials: [], states: {} },
        (data) => {
          if (!data.dockerMetrics) return data;
          if (data.dockerMetrics[vpsId]) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete data.dockerMetrics[vpsId];
            deleted = true;
          }
          return data;
        },
      );
      return deleted;
    },
  };
}
