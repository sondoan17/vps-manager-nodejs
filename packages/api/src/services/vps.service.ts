import { Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service.js";
import type { AppConfig } from "../config/app-config.js";
import { demoServers } from "../demo/demo-data.js";
import { VpsNotFoundError } from "../errors.js";
import type { KeyService } from "./keyService.js";
import { SshService } from "./ssh.service.js";
import type { VpsRepository } from "../repositories/vps.repository.js";
import { createVpsSchema, provisionKeySchema, updateVpsSchema } from "../validation/vpsSchemas.js";

@Injectable()
export class VpsService {
  constructor(
    private readonly store: VpsRepository,
    private readonly keys: KeyService,
    private readonly ssh: SshService,
    private readonly audit: AuditService,
    private readonly config: AppConfig
  ) {}

  async list() {
    const records = await this.store.list();
    if (records.length === 0 && this.config.mode === "demo") return [...demoServers];
    return records;
  }

  async create(body: unknown) {
    const record = await this.store.create(createVpsSchema.parse(body));
    await this.audit.record({ actor: "system", action: "vps.create", resourceType: "vps", resourceId: record.id, result: "success", metadata: { host: record.host } });
    return record;
  }

  async get(id: string) {
    const record = await this.store.get(id);
    if (!record) throw new VpsNotFoundError();
    return record;
  }

  async update(id: string, body: unknown) {
    const updated = await this.store.update(id, updateVpsSchema.parse(body));
    if (!updated) throw new VpsNotFoundError();
    await this.audit.record({ actor: "system", action: "vps.update", resourceType: "vps", resourceId: id, result: "success" });
    return updated;
  }

  async delete(id: string) {
    if (!(await this.store.delete(id))) throw new VpsNotFoundError();
    await this.audit.record({ actor: "system", action: "vps.delete", resourceType: "vps", resourceId: id, result: "success" });
  }

  async provisionKey(id: string, body: unknown) {
    const vps = await this.get(id);
    const { password } = provisionKeySchema.parse(body);
    const keyPair = await this.keys.ensureKeyPair(vps.id);
    try {
      await this.ssh.provisionPublicKey(vps, password, keyPair.publicKey);
      const updated = await this.store.markKeyProvisioned(vps.id);
      await this.audit.record({ actor: "system", action: "vps.key.provision", resourceType: "vps", resourceId: vps.id, result: "success" });
      return updated;
    } catch (error: unknown) {
      await this.audit.record({ actor: "system", action: "vps.key.provision", resourceType: "vps", resourceId: vps.id, result: "failure", metadata: { error } });
      throw error;
    }
  }

  async verifyKey(id: string) {
    const vps = await this.get(id);
    const privateKey = await this.keys.readPrivateKey(vps.id);
    try {
      await this.ssh.verifyPrivateKey(vps, privateKey);
      await this.audit.record({ actor: "system", action: "vps.key.verify", resourceType: "vps", resourceId: vps.id, result: "success" });
    } catch (error: unknown) {
      await this.audit.record({ actor: "system", action: "vps.key.verify", resourceType: "vps", resourceId: vps.id, result: "failure", metadata: { error } });
      throw error;
    }
  }
}
