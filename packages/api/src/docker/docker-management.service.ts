import { Injectable, ForbiddenException, InternalServerErrorException, NotFoundException, UnauthorizedException, Inject } from "@nestjs/common";
import { VPS_REPOSITORY, DOCKER_MANAGEMENT_REPOSITORY } from "../tokens.js";
import { createHash } from "node:crypto";
import type { VpsRepository } from "../persistence/repositories/vps.repository.js";
import type { DockerManagementRepository } from "../persistence/repositories/docker-management.repository.js";
import type { DockerManagementAction, DockerManagementOperation, DockerManagementResult, DockerManagementTarget } from "./docker-management.models.js";
import { DockerManagementConflict } from "./docker-management.models.js";
import { agentCommandSchema, type AgentCommand, type AgentCommandReport } from "./docker-management.schemas.js";

type AllowedDockerManagementAction = Extract<DockerManagementAction, "start" | "stop" | "restart">;
const ACTIONS: Record<AllowedDockerManagementAction, true> = { start: true, stop: true, restart: true };
const TTL_MS = 5 * 60_000;
const LOG_LIMIT = 200;
const LOG_BODY_LIMIT = 2000;
type LogEntry = { vpsId: string; target: DockerManagementTarget; line: string };

@Injectable()
export class DockerManagementService {
  private readonly logs: LogEntry[] = [];
  constructor(
    @Inject(VPS_REPOSITORY) private readonly vps: VpsRepository,
    @Inject(DOCKER_MANAGEMENT_REPOSITORY) private readonly repository: DockerManagementRepository,
  ) {}

  async capability(vpsId: string) {
    const record = await this.vps.get(vpsId);
    if (!record) throw new NotFoundException("VPS not found");
    const enabled = record.dockerManagementEnabled === true;
    return { supported: enabled, reason: enabled ? undefined : "Docker management is disabled", actions: enabled ? ["start", "stop", "restart"] : [], logsSupported: true, maxLogLines: LOG_LIMIT };
  }

  async create(vpsId: string, input: { action: DockerManagementAction; target: DockerManagementTarget; idempotencyKey: string; confirmedAt?: string }) {
    const record = await this.vps.get(vpsId);
    if (!record) throw new NotFoundException("VPS not found");
    if (record.managedBy === "system") throw new ForbiddenException("Docker management is unavailable");
    if (record.dockerManagementEnabled !== true) throw new ForbiddenException("Docker management is disabled");
    if (!(input.action in ACTIONS)) throw new ForbiddenException("Action is not allowed");
    if (input.confirmedAt && Math.abs(Date.now() - Date.parse(input.confirmedAt)) > TTL_MS) throw new ForbiddenException("Confirmation expired");
    const requestDigest = createHash("sha256").update(JSON.stringify({ action: input.action, target: input.target })).digest("hex");
    return (await this.repository.create({ vpsId, idempotencyKey: input.idempotencyKey, requestDigest, action: input.action, target: input.target })).operation;
  }

  async get(vpsId: string, id: string) {
    const op = await this.repository.status(id);
    if (!op || op.vpsId !== vpsId) throw new NotFoundException("Operation not found");
    return op;
  }

  async claim(vpsId: string, id: string, claimedBy: string) {
    await this.get(vpsId, id);
    const op = await this.repository.claim(id, claimedBy);
    if (!op) throw new NotFoundException("Operation not found");
    return op;
  }

  async result(vpsId: string, id: string, claimedBy: string, result: DockerManagementResult) {
    const op = await this.get(vpsId, id);
    if (op.claimedBy !== claimedBy || op.status !== "claimed") throw new DockerManagementConflict("not_claimable", id);
    const updated = await this.repository.setResult(id, result.ok ? "succeeded" : "failed", result);
    if (!updated) throw new NotFoundException("Operation not found");
    return updated;
  }

  /**
   * Queue claim for the authenticated agent (its credential is bound to
   * vpsId). Returns null — not an error — when the queue is empty or
   * management is not allowed (disabled, missing, or a system-managed host),
   * mirroring create() policy: an empty queue and a denied queue are
   * indistinguishable to the agent, so policy state never leaks.
   */
  async claimForAgent(vpsId: string, agentInstanceId: string): Promise<AgentCommand | null> {
    const record = await this.vps.get(vpsId);
    if (!record || record.managedBy === "system" || record.dockerManagementEnabled !== true) return null;
    const op = await this.repository.claimNextQueued(vpsId, agentInstanceId);
    if (!op) return null;
    if (!op.leaseExpiresAt) throw new InternalServerErrorException("Claimed operation is missing its lease");
    const deadlineMs = Date.parse(op.leaseExpiresAt);
    const nowMs = Date.now();
    // deadlineNano is the lease deadline in epoch nanoseconds — beyond Number
    // precision, so scale the millisecond epoch through BigInt. The timeout is
    // the remaining lease clamped to the agent's 1..120s execution bound.
    const parsed = agentCommandSchema.safeParse({
      commandId: op.id,
      agentInstanceId,
      vpsId,
      action: op.action,
      containerKey: op.target.containerKey,
      deadlineNano: (BigInt(deadlineMs) * 1_000_000n).toString(),
      timeoutSeconds: Math.max(1, Math.min(120, Math.ceil((deadlineMs - nowMs) / 1000))),
    });
    if (!parsed.success) throw new InternalServerErrorException("Queued operation is not executable by the agent");
    return parsed.data;
  }

  /**
   * Terminal result receipt from the claiming agent. Binds on the
   * credential's vpsId (404 for foreign ids) and the claim-holding instance
   * (401 otherwise). An identical replay of an already-recorded result
   * echoes success without rewriting, so the agent's durable receipt can
   * commit; a divergent second result is a conflict. Deliberately not gated
   * on dockerManagementEnabled: blocking it would strand the receipt forever.
   */
  async resultForAgent(vpsId: string, report: AgentCommandReport) {
    const op = await this.repository.get(report.commandId);
    if (!op || op.vpsId !== vpsId) throw new NotFoundException("Operation not found");
    if (
      (op.target.agentInstanceId && op.target.agentInstanceId !== report.agentInstanceId) ||
      (op.claimedBy !== undefined && op.claimedBy !== report.agentInstanceId)
    ) {
      throw new UnauthorizedException({ error: { message: "Agent identity mismatch" } });
    }
    const result: DockerManagementResult = {
      ok: report.status === "succeeded",
      ...(report.exitCode !== undefined ? { exitCode: report.exitCode } : {}),
      ...(report.errorCode !== undefined ? { message: report.errorCode } : {}),
    };
    const echo = { ok: true as const, commandId: op.id, agentInstanceId: report.agentInstanceId };
    if (op.status === "succeeded" || op.status === "failed") {
      const stored = op.result;
      const identical =
        stored !== undefined &&
        stored.ok === result.ok &&
        stored.exitCode === result.exitCode &&
        stored.message === result.message;
      if (identical) return echo;
      throw new DockerManagementConflict("not_claimable", op.id);
    }
    if (op.status !== "claimed") throw new DockerManagementConflict("not_claimable", op.id);
    const updated = await this.repository.setResult(op.id, result.ok ? "succeeded" : "failed", result);
    if (!updated) throw new NotFoundException("Operation not found");
    return echo;
  }

  appendLog(vpsId: string, id: string, line: string) {
    const opPromise = this.get(vpsId, id);
    void opPromise.then(op => {
      this.logs.push({ vpsId, target: op.target, line: line.slice(0, LOG_BODY_LIMIT) });
      if (this.logs.length > LOG_LIMIT) this.logs.splice(0, this.logs.length - LOG_LIMIT);
    });
  }

  async getLogs(vpsId: string, target: DockerManagementTarget, lines = 100) {
    const n = Math.min(LOG_LIMIT, Math.max(1, Math.floor(lines)));
    const values = this.logs.filter(entry => entry.vpsId === vpsId && entry.target.containerKey === target.containerKey && entry.target.agentInstanceId === target.agentInstanceId).map(entry => entry.line);
    return { lines: values.slice(-n), truncated: values.length > n };
  }
}
