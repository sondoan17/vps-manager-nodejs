import { Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service.js";
import type { AppConfig } from "../config/app-config.js";
import { DemoSshDisabledError } from "../errors.js";
import type { VpsRecord } from "../models/vps.js";
import { assertSshHostAllowed } from "../security/ssh-host-policy.js";
import { provisionPublicKey, verifyPrivateKey } from "./sshService.js";

@Injectable()
export class SshService {
  constructor(
    private readonly config: AppConfig,
    private readonly audit: AuditService
  ) {}

  private async assertRealSshAllowed(vps: VpsRecord) {
    try {
      if (this.config.mode === "demo") throw new DemoSshDisabledError();
      assertSshHostAllowed(vps.host, this.config);
    } catch (error: unknown) {
      await this.audit.record({
        actor: "system",
        action: "ssh.host.blocked",
        resourceType: "vps",
        resourceId: vps.id,
        result: "blocked",
        metadata: { host: vps.host, error }
      });
      throw error;
    }
  }

  async provisionPublicKey(vps: VpsRecord, password: string, publicKey: string) {
    await this.assertRealSshAllowed(vps);
    return provisionPublicKey(vps, password, publicKey);
  }

  async verifyPrivateKey(vps: VpsRecord, privateKey: string) {
    await this.assertRealSshAllowed(vps);
    return verifyPrivateKey(vps, privateKey);
  }
}
