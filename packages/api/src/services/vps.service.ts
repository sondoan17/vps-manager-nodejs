import { Injectable } from "@nestjs/common";
import { VpsNotFoundError } from "../errors.js";
import { KEY_SERVICE, VPS_STORE } from "../app.module.js";
import type { KeyService } from "./keyService.js";
import { SshService } from "./ssh.service.js";
import type { VpsStore } from "../store/vpsStore.js";
import { createVpsSchema, provisionKeySchema, updateVpsSchema } from "../validation/vpsSchemas.js";

@Injectable()
export class VpsService {
  constructor(
    private readonly store: VpsStore,
    private readonly keys: KeyService,
    private readonly ssh: SshService
  ) {}

  list() {
    return this.store.list();
  }

  create(body: unknown) {
    return this.store.create(createVpsSchema.parse(body));
  }

  async get(id: string) {
    const record = await this.store.get(id);
    if (!record) throw new VpsNotFoundError();
    return record;
  }

  async update(id: string, body: unknown) {
    const updated = await this.store.update(id, updateVpsSchema.parse(body));
    if (!updated) throw new VpsNotFoundError();
    return updated;
  }

  async delete(id: string) {
    if (!(await this.store.delete(id))) throw new VpsNotFoundError();
  }

  async provisionKey(id: string, body: unknown) {
    const vps = await this.get(id);
    const { password } = provisionKeySchema.parse(body);
    const keyPair = await this.keys.ensureKeyPair(vps.id);
    await this.ssh.provisionPublicKey(vps, password, keyPair.publicKey);
    return this.store.markKeyProvisioned(vps.id);
  }

  async verifyKey(id: string) {
    const vps = await this.get(id);
    const privateKey = await this.keys.readPrivateKey(vps.id);
    await this.ssh.verifyPrivateKey(vps, privateKey);
  }
}
