import { nanoid } from "nanoid";
import type { CreateVpsInput, UpdateVpsInput, VpsRecord } from "../../vps/vps.models.js";
import { readJsonFile, writeJsonFile } from "../repositories/json-file.js";
import { withVpsDefaults, type VpsRepository } from "../repositories/vps.repository.js";

type StoreFile = { vps: VpsRecord[] };

const now = () => new Date().toISOString();

export function createVpsStore(filePath = "data/vps.json") {
  async function readStore(): Promise<StoreFile> {
    const data = await readJsonFile<StoreFile>(filePath, { vps: [] });
    return { vps: data.vps.map(withVpsDefaults) };
  }

  async function writeStore(data: StoreFile): Promise<void> {
    await writeJsonFile(filePath, data);
  }

  const repository: VpsRepository = {
    async list() {
      return (await readStore()).vps;
    },
    async get(id: string) {
      return (await readStore()).vps.find((vps) => vps.id === id);
    },
    async create(input: CreateVpsInput) {
      const data = await readStore();
      const timestamp = now();
      const record: VpsRecord = {
        id: `vps_${nanoid(12)}`,
        name: input.name,
        host: input.host,
        port: input.port,
        username: input.username,
        provider: input.provider ?? "unknown",
        region: input.region,
        tags: input.tags ?? [],
        status: input.status ?? "unknown",
        notes: input.notes,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      data.vps.push(record);
      await writeStore(data);
      return record;
    },
    async update(id: string, input: UpdateVpsInput) {
      const data = await readStore();
      const index = data.vps.findIndex((vps) => vps.id === id);
      if (index === -1) return undefined;
      data.vps[index] = { ...data.vps[index], ...input, updatedAt: now() };
      await writeStore(data);
      return data.vps[index];
    },
    async markKeyProvisioned(id: string) {
      const data = await readStore();
      const index = data.vps.findIndex((vps) => vps.id === id);
      if (index === -1) return undefined;
      data.vps[index] = { ...data.vps[index], keyProvisionedAt: now(), updatedAt: now() };
      await writeStore(data);
      return data.vps[index];
    },
    async delete(id: string) {
      const data = await readStore();
      const next = data.vps.filter((vps) => vps.id !== id);
      if (next.length === data.vps.length) return false;
      await writeStore({ vps: next });
      return true;
    }
  };

  return repository;
}

export type VpsStore = ReturnType<typeof createVpsStore>;
