import { nanoid } from "nanoid";
import type { AgentCredential, AgentState } from "../../agents/agent.models.js";
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
};

// ── Storage shape ───────────────────────────────────────────────────────
// JSON-backed, single-process / local-only until a DB migration is added.

type AgentFile = {
  credentials: AgentCredential[];
  states: Record<string, AgentState>;
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
  };
}
