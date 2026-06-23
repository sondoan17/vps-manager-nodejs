import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { nanoid } from "nanoid";
import type { CreateVpsInput, UpdateVpsInput, VpsRecord } from "../models/vps.js";

type StoreFile = { vps: VpsRecord[] };

const now = () => new Date().toISOString();

export function createVpsStore(filePath = "data/vps.json") {
  async function readStore(): Promise<StoreFile> {
    try {
      return JSON.parse(await readFile(filePath, "utf8")) as StoreFile;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { vps: [] };
      throw error;
    }
  }

  async function writeStore(data: StoreFile): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.${process.pid}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
    await rename(tempPath, filePath);
  }

  return {
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
}

export type VpsStore = ReturnType<typeof createVpsStore>;
