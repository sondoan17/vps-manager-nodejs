import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service.js";
import type { AppConfig } from "../config/app-config.js";
import { demoServers } from "../demo/demo-fixtures.js";
import {
  DemoMutationBlockedError,
  VpsNotFoundError,
} from "../common/errors.js";
import type { KeyService } from "../ssh/keyService.js";
import { SshService } from "../ssh/ssh.service.js";
import type { VpsRepository } from "../persistence/repositories/vps.repository.js";
import {
  createVpsSchema,
  installAgentSchema,
  provisionKeySchema,
  updateLocalVpsSchema,
  updateVpsSchema,
} from "./vps.schemas.js";
import { AgentInstallerService } from "../agents/agent-installer.service.js";
import { AGENT_REPOSITORY } from "../tokens.js";
import type { AgentRepository } from "../persistence/repositories/agent.repository.js";

@Injectable()
export class VpsService {
  constructor(
    private readonly store: VpsRepository,
    private readonly keys: KeyService,
    private readonly ssh: SshService,
    private readonly audit: AuditService,
    private readonly config: AppConfig,
    private readonly agentInstaller: AgentInstallerService,
    @Inject(AGENT_REPOSITORY) private readonly agentRepository: AgentRepository,
  ) {}

  async list() {
    const records = await this.store.list();
    if (records.length === 0 && this.config.mode === "demo")
      return [...demoServers];
    return records;
  }

  private assertNotDemo() {
    if (this.config.mode === "demo") throw new DemoMutationBlockedError();
  }

  private assertRemoteUserManaged(vps: {
    kind?: string;
    managedBy?: string;
    tags?: string[];
  }) {
    if (vps.kind === "local" || vps.managedBy === "system") {
      throw new BadRequestException(
        "Local host is managed by the built-in agent",
      );
    }
  }

  /** Check if VPS is local/system-managed */
  private isLocalSystemManaged(vps: {
    kind?: string;
    managedBy?: string;
  }): boolean {
    return vps.kind === "local" || vps.managedBy === "system";
  }

  async create(body: unknown) {
    this.assertNotDemo();
    const record = await this.store.create(createVpsSchema.parse(body));
    await this.audit.record({
      actor: "system",
      action: "vps.create",
      resourceType: "vps",
      resourceId: record.id,
      result: "success",
      metadata: { host: record.host },
    });
    return record;
  }

  async get(id: string) {
    const record = await this.store.get(id);
    if (record) return record;
    // In demo mode fall back to demo fixtures (matching list() semantics)
    if (this.config.mode === "demo") {
      const demo = demoServers.find((s) => s.id === id);
      if (demo) return { ...demo };
    }
    throw new VpsNotFoundError();
  }

  async update(id: string, body: unknown) {
    this.assertNotDemo();
    const vps = await this.get(id);

    // For local/system-managed hosts: only allow exactly { dockerMetricsEnabled: boolean }
    if (this.isLocalSystemManaged(vps)) {
      const localPatch = updateLocalVpsSchema.parse(body);
      const oldValue = vps.dockerMetricsEnabled ?? false;
      const newValue = localPatch.dockerMetricsEnabled;

      if (oldValue === newValue) {
        // No change; just return current record
        return vps;
      }

      const updated = await this.store.update(id, {
        dockerMetricsEnabled: newValue,
      });
      if (!updated) throw new VpsNotFoundError();

      // Clear Docker metrics on disable
      if (!newValue) {
        await this.agentRepository.deleteDockerMetrics(id).catch(() => {
          // Best effort clear
        });
      }

      await this.audit.record({
        actor: "system",
        action: "vps.docker_metrics.update",
        resourceType: "vps",
        resourceId: id,
        result: "success",
        metadata: {
          old: { dockerMetricsEnabled: oldValue },
          new: { dockerMetricsEnabled: newValue },
        },
      });
      return updated;
    }

    // For remote/user-managed hosts: normal update but also allow dockerMetricsEnabled
    const parsedBody = updateVpsSchema.parse(body);
    const hasDockerToggle = parsedBody && "dockerMetricsEnabled" in parsedBody;

    if (hasDockerToggle) {
      const oldValue = vps.dockerMetricsEnabled ?? false;
      const newValue = parsedBody.dockerMetricsEnabled as boolean;

      // Clear Docker metrics on disable
      if (oldValue && !newValue) {
        await this.agentRepository.deleteDockerMetrics(id).catch(() => {
          // Best effort clear
        });
      }

      const updated = await this.store.update(id, parsedBody);
      if (!updated) throw new VpsNotFoundError();

      await this.audit.record({
        actor: "system",
        action:
          oldValue !== newValue ? "vps.docker_metrics.update" : "vps.update",
        resourceType: "vps",
        resourceId: id,
        result: "success",
        metadata: hasDockerToggle
          ? {
              old: { dockerMetricsEnabled: oldValue },
              new: { dockerMetricsEnabled: newValue },
            }
          : undefined,
      });
      return updated;
    }

    const updated = await this.store.update(id, parsedBody);
    if (!updated) throw new VpsNotFoundError();
    await this.audit.record({
      actor: "system",
      action: "vps.update",
      resourceType: "vps",
      resourceId: id,
      result: "success",
    });
    return updated;
  }

  async delete(id: string) {
    this.assertNotDemo();
    this.assertRemoteUserManaged(await this.get(id));
    if (!(await this.store.delete(id))) throw new VpsNotFoundError();
    await this.audit.record({
      actor: "system",
      action: "vps.delete",
      resourceType: "vps",
      resourceId: id,
      result: "success",
    });
  }

  async provisionKey(id: string, body: unknown) {
    this.assertNotDemo();
    const vps = await this.get(id);
    this.assertRemoteUserManaged(vps);
    const { password } = provisionKeySchema.parse(body);
    const keyPair = await this.keys.ensureKeyPair(vps.id);
    try {
      await this.ssh.provisionPublicKey(vps, password, keyPair.publicKey);
      const updated = await this.store.markKeyProvisioned(vps.id);
      await this.audit.record({
        actor: "system",
        action: "vps.key.provision",
        resourceType: "vps",
        resourceId: vps.id,
        result: "success",
      });
      return updated;
    } catch (error: unknown) {
      await this.audit.record({
        actor: "system",
        action: "vps.key.provision",
        resourceType: "vps",
        resourceId: vps.id,
        result: "failure",
        metadata: { error },
      });
      throw error;
    }
  }

  async verifyKey(id: string) {
    this.assertNotDemo();
    const vps = await this.get(id);
    this.assertRemoteUserManaged(vps);
    const privateKey = await this.keys.readPrivateKey(vps.id);
    try {
      await this.ssh.verifyPrivateKey(vps, privateKey);
      await this.audit.record({
        actor: "system",
        action: "vps.key.verify",
        resourceType: "vps",
        resourceId: vps.id,
        result: "success",
      });
    } catch (error: unknown) {
      await this.audit.record({
        actor: "system",
        action: "vps.key.verify",
        resourceType: "vps",
        resourceId: vps.id,
        result: "failure",
        metadata: { error },
      });
      throw error;
    }
  }

  async installAgent(id: string, body: unknown, requestHost?: string) {
    this.assertNotDemo();
    const vps = await this.get(id);
    this.assertRemoteUserManaged(vps);
    const { password } = installAgentSchema.parse(body);
    try {
      const result = await this.agentInstaller.install(
        vps.id,
        password,
        requestHost,
      );
      await this.audit.record({
        actor: "system",
        action: "agent.install",
        resourceType: "vps",
        resourceId: vps.id,
        result: "success",
        metadata: { jobId: result.jobId },
      });
      return result;
    } catch (error: unknown) {
      await this.audit.record({
        actor: "system",
        action: "agent.install",
        resourceType: "vps",
        resourceId: vps.id,
        result: "failure",
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
      throw error;
    }
  }
}
