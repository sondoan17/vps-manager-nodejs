import type { CreateVpsInput, UpdateVpsInput, VpsRecord } from "../../vps/vps.models.js";

export type VpsRepository = {
  list(): Promise<VpsRecord[]>;
  get(id: string): Promise<VpsRecord | undefined>;
  create(input: CreateVpsInput): Promise<VpsRecord>;
  update(id: string, input: UpdateVpsInput): Promise<VpsRecord | undefined>;
  markKeyProvisioned(id: string): Promise<VpsRecord | undefined>;
  delete(id: string): Promise<boolean>;
};

export function withVpsDefaults(record: VpsRecord): VpsRecord {
  return {
    provider: "unknown",
    tags: [],
    status: "unknown",
    ...record
  };
}
