import { Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service.js";
import type { AppConfig } from "../config/app-config.js";
import { DemoSshDisabledError } from "../common/errors.js";
import type { VpsRecord } from "../vps/vps.models.js";
import { assertSshHostAllowed } from "./ssh-host-policy.js";
import { execCommand, makeDirectory, provisionPublicKey, uploadFile, verifyPrivateKey } from "./sshService.js";

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

  async makeDirectory(
    vps: VpsRecord,
    remotePath: string,
    mode: number,
    auth: { password?: string; privateKey?: string },
  ) {
    await this.assertRealSshAllowed(vps);
    return makeDirectory(vps, remotePath, mode, auth);
  }

  async uploadFile(
    vps: VpsRecord,
    remotePath: string,
    content: Buffer,
    mode: number,
    auth: { password?: string; privateKey?: string },
  ) {
    await this.assertRealSshAllowed(vps);
    return uploadFile(vps, remotePath, content, mode, auth);
  }

  async execCommand(
    vps: VpsRecord,
    command: string,
    auth: { password?: string; privateKey?: string },
    timeoutMs = 30_000,
  ): Promise<{ stdout: string; stderr: string }> {
    await this.assertRealSshAllowed(vps);
    return execCommand(vps, command, auth, timeoutMs);
  }
}
