import { Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service.js";
import type { AppConfig } from "../config/app-config.js";
import { DemoSshDisabledError } from "../common/errors.js";
import type { VpsRecord } from "../vps/vps.models.js";
import { assertSshHostAllowedAsync, createHostVerifier } from "./ssh-host-policy.js";
import type { SshSecurityOptions } from "./sshService.js";
import { execCommand, makeDirectory, provisionPublicKey, uploadFile, verifyPrivateKey } from "./sshService.js";

@Injectable()
export class SshService {
  constructor(
    private readonly config: AppConfig,
    private readonly audit: AuditService
  ) {}

  private async buildSecurityOptions(vps: VpsRecord): Promise<SshSecurityOptions> {
    const vettedHost = await assertSshHostAllowedAsync(vps.host, this.config);
    const hostVerifier = createHostVerifier({
      vpsId: vps.id,
      host: vps.host,
      port: vps.port,
      pins: this.config.sshHostKeyPins,
      policy: this.config.sshHostKeyPolicy,
    });
    return { vettedHost, hostVerifier };
  }

  private async assertRealSshAllowed(vps: VpsRecord): Promise<SshSecurityOptions> {
    try {
      if (this.config.mode === "demo") throw new DemoSshDisabledError();
      return await this.buildSecurityOptions(vps);
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
    const security = await this.assertRealSshAllowed(vps);
    return provisionPublicKey(vps, password, publicKey, security);
  }

  async verifyPrivateKey(vps: VpsRecord, privateKey: string) {
    const security = await this.assertRealSshAllowed(vps);
    return verifyPrivateKey(vps, privateKey, security);
  }

  async makeDirectory(
    vps: VpsRecord,
    remotePath: string,
    mode: number,
    auth: { password?: string; privateKey?: string },
  ) {
    const security = await this.assertRealSshAllowed(vps);
    return makeDirectory(vps, remotePath, mode, auth, security);
  }

  async uploadFile(
    vps: VpsRecord,
    remotePath: string,
    content: Buffer,
    mode: number,
    auth: { password?: string; privateKey?: string },
  ) {
    const security = await this.assertRealSshAllowed(vps);
    return uploadFile(vps, remotePath, content, mode, auth, security);
  }

  async execCommand(
    vps: VpsRecord,
    command: string,
    auth: { password?: string; privateKey?: string },
    timeoutMs = 30_000,
  ): Promise<{ stdout: string; stderr: string }> {
    const security = await this.assertRealSshAllowed(vps);
    return execCommand(vps, command, auth, timeoutMs, security);
  }
}
