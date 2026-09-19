import { BadRequestException, ConflictException, Injectable, Inject, NotImplementedException } from "@nestjs/common";
import { VpsNotFoundError } from "../common/errors.js";
import { createHash } from "node:crypto";
import type { AgentDockerMetricsInputV2 } from "../agents/agent.models.js";
import { DockerIngestConflict, type DockerV2IngestUnit } from "./docker-monitoring.models.js";
import { DOCKER_INGEST_DIGEST_VERSION, dockerIngestRequestDigest } from "./docker-monitoring.schemas.js";
import { ZodError } from "zod";
import type { DockerMonitoringRepository } from "../persistence/repositories/docker-monitoring.repository.js";
import { DOCKER_MONITORING_REPOSITORY } from "../tokens.js";
import type { VpsRepository } from "../persistence/repositories/vps.repository.js";
import { VPS_REPOSITORY } from "../tokens.js";
import {
  dockerHostHistoryQuerySchema, dockerContainerHistoryQuerySchema,
  dockerEventsQuerySchema, dockerAlertsQuerySchema,
  type DockerHostHistoryQuery, type DockerContainerHistoryQuery,
  type DockerEventsQuery, type DockerAlertsQuery,
  normalizeDockerDateRange,
} from "./docker-monitoring.schemas.js";

@Injectable()
export class DockerMonitoringService {
  constructor(
    @Inject(DOCKER_MONITORING_REPOSITORY) private readonly repository: DockerMonitoringRepository,
    @Inject(VPS_REPOSITORY) private readonly vps: VpsRepository,
  ) {}

  private async verify(vpsId: string) {
    if (!(await this.vps.get(vpsId))) throw new VpsNotFoundError();
  }

  private toBadRequest(error: unknown): never {
    if (error instanceof ZodError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (
      /cursor/i.test(message) ||
      /malformed/i.test(message) ||
      /mismatch/i.test(message) ||
      /unsupported cursor/i.test(message) ||
      /bad charset/i.test(message)
    ) {
      throw new BadRequestException({ error: { message: "Invalid cursor" } });
    }
    throw error;
  }

  async ingestV2(vpsId: string, input: AgentDockerMetricsInputV2, receivedAt: string) {
    await this.verify(vpsId);
    const stable = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
    const sourceSequence = input.sourceSequence;
    const hostMetrics = {
      containerTotal: input.containerTotal, containerRunning: input.containerRunning, cpuPercent: input.cpuPercent,
      memoryUsageBytes: input.memoryUsageBytes, ...(input.memoryLimitBytes === undefined ? {} : { memoryLimitBytes: input.memoryLimitBytes }),
      networkRxBytes: input.networkRxBytes, networkTxBytes: input.networkTxBytes,
      blockReadBytes: input.blockReadBytes, blockWriteBytes: input.blockWriteBytes, pids: input.pids,
    };
    const hostSample = { id: stable([vpsId, input.agentInstanceId, input.snapshotId, input.collectedAt, hostMetrics]), vpsId, agentInstanceId: input.agentInstanceId, snapshotId: input.snapshotId, collectedAt: input.collectedAt, receivedAt, effectiveAt: input.collectedAt, metrics: hostMetrics };
    const containerSamples = input.containers.map((c) => ({
      id: stable([vpsId, input.agentInstanceId, input.snapshotId, input.collectedAt, c.containerKey, c.cpuPercent, c.memoryUsageBytes, c.networkRxBytes, c.networkTxBytes, c.blockReadBytes, c.blockWriteBytes, c.pids]),
      vpsId, agentInstanceId: input.agentInstanceId, snapshotId: input.snapshotId, collectedAt: input.collectedAt, receivedAt, effectiveAt: input.collectedAt,
      containerKey: c.containerKey, state: c.state, metrics: { cpuPercent: c.cpuPercent, memoryUsageBytes: c.memoryUsageBytes, ...(c.memoryLimitBytes === undefined ? {} : { memoryLimitBytes: c.memoryLimitBytes }), networkRxBytes: c.networkRxBytes, networkTxBytes: c.networkTxBytes, blockReadBytes: c.blockReadBytes, blockWriteBytes: c.blockWriteBytes, pids: c.pids },
    }));
    const events = input.events?.map((e, i) => ({ ...e.context, id: stable([vpsId, input.agentInstanceId, e.eventOccurredAt, e.action, e.containerKey, i]), vpsId, agentInstanceId: input.agentInstanceId, containerKey: e.containerKey, action: e.action, eventOccurredAt: e.eventOccurredAt, receivedAt, eventDigest: stable([e.eventOccurredAt, e.action, e.containerKey, e.context]), contextVersion: 1 as const, sourceSequence }));
    const from = input.fromWatermark ?? { timeNano: "0", boundaryDigests: [] };
    const to = input.proposedWatermark ?? { timeNano: sourceSequence, boundaryDigests: [] };
    const unit: DockerV2IngestUnit = {
      vpsId, agentInstanceId: input.agentInstanceId, snapshotId: input.snapshotId, batchId: input.batchId,
      requestDigest: dockerIngestRequestDigest({ vpsId, agentInstanceId: input.agentInstanceId, snapshotId: input.snapshotId, batchId: input.batchId, collectedAt: input.collectedAt, sourceSequence, hostMetrics, containers: containerSamples, events, storage: input.storage, ...(input.monitoring === undefined ? {} : { monitoring: input.monitoring }) }),
      requestDigestVersion: DOCKER_INGEST_DIGEST_VERSION, receivedAt, sourceSequence, compatibility: { latest: true }, hostSample, containerSamples, events,
      storageLatest: input.storage ? { ...input.storage, vpsId, agentInstanceId: input.agentInstanceId, snapshotId: input.snapshotId, collectedAt: input.collectedAt, receivedAt } : undefined,
      eventProtocol: { fromWatermark: { ...from, vpsId, agentInstanceId: input.agentInstanceId, updatedAt: receivedAt }, proposedWatermark: { ...to, vpsId, agentInstanceId: input.agentInstanceId, updatedAt: receivedAt }, eventWindow: { from: input.eventWindow?.since ?? from.timeNano, to: input.eventWindow?.until ?? to.timeNano } },
      ...(input.monitoring === undefined ? {} : { monitoring: { ...input.monitoring } }),
    };
    try { return await this.repository.ingestV2Unit(unit); }
    catch (error) { if (error instanceof DockerIngestConflict) throw new ConflictException({ error: { message: "Docker ingest conflict", code: error.code } }); throw error; }
  }

  async hostHistory(input: Omit<DockerHostHistoryQuery, "vpsId"> & { vpsId: string }) {
    await this.verify(input.vpsId);
    const parsed = dockerHostHistoryQuerySchema.parse(input);
    const query = normalizeDockerDateRange(parsed);
    try {
      return await this.repository.listHostSamples(query);
    } catch (error) { this.toBadRequest(error); }
  }
  async containerHistory(input: Omit<DockerContainerHistoryQuery, "vpsId"> & { vpsId: string }) {
    await this.verify(input.vpsId);
    const parsed = dockerContainerHistoryQuerySchema.parse(input);
    const query = normalizeDockerDateRange(parsed);
    try {
      return await this.repository.listContainerSamples(query);
    } catch (error) { this.toBadRequest(error); }
  }
  async events(input: Omit<DockerEventsQuery, "vpsId"> & { vpsId: string }) {
    await this.verify(input.vpsId);
    const parsed = dockerEventsQuerySchema.parse(input);
    const query = normalizeDockerDateRange(parsed);
    try {
      return await this.repository.listEvents(query);
    } catch (error) { this.toBadRequest(error); }
  }
  async storage(vpsId: string) { await this.verify(vpsId); return this.repository.getStorageLatest(vpsId); }
  async alerts(input: Omit<DockerAlertsQuery, "vpsId"> & { vpsId: string }) {
    await this.verify(input.vpsId);
    const parsed = dockerAlertsQuerySchema.parse(input);
    const query = normalizeDockerDateRange(parsed);
    try {
      return await this.repository.listAlerts(query);
    } catch (error) { this.toBadRequest(error); }
  }
  async acknowledge(vpsId: string) {
    await this.verify(vpsId);
    throw new NotImplementedException({
      error: { message: "Docker alert acknowledgement is not available in I1" },
    });
  }
}
