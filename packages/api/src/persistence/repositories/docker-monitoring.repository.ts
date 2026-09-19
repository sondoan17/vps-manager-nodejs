import { join } from "node:path";
import {
  readJsonFile,
  readModifyWriteJsonFile,
} from "./json-file.js";
import {
  assertDockerCursorBinding,
  decodeDockerCursor,
  encodeDockerCursor,
} from "../../docker/docker-monitoring.schemas.js";
import type {
  DockerAlert,
  DockerContainerSample,
  DockerCursorPayload,
  DockerEventWatermark,
  DockerHostSample,
  DockerIngestBatch,
  DockerListScope,
  DockerMetricRollup,
  DockerOperationalEvent,
  DockerPage,
  DockerStorageLatest,
  DockerMonitoringStore,
  DockerV2IngestUnit,
  DockerV2IngestResult,
} from "../../docker/docker-monitoring.models.js";
import { DockerIngestConflict } from "../../docker/docker-monitoring.models.js";
import { compareDockerSourceSequence, compareDockerWatermarks } from "../../docker/docker-monitoring.schemas.js";

// ── Caps (I1 foundation; retention tuning is an I3 concern) ───────────────
// Every persisted/listed section is bounded. Seed helpers truncate to these
// caps; list methods never return more than the requested (schema-capped)
// limit. No unbounded arrays are persisted or returned.
export const DOCKER_MONITORING_CAPS = {
  samplesPerVps: 5000,
  rollupsPerVps: 2000,
  eventsPerVps: 10000,
  alertsPerVps: 1000,
  watermarksPerVps: 50,
  batchesPerVps: 100,
} as const;

// ── Query types (VPS-scoped, bounded) ─────────────────────────────────────

export type DockerHostSamplesQuery = {
  vpsId: string;
  limit?: number;
  from?: string;
  to?: string;
  cursor?: string;
};

export type DockerContainerSamplesQuery = DockerHostSamplesQuery & {
  agentInstanceId: string;
  containerKey: string;
};

export type DockerEventsQuery = {
  vpsId: string;
  limit?: number;
  from?: string;
  to?: string;
  cursor?: string;
  action?: DockerOperationalEvent["action"];
  agentInstanceId?: string;
  containerKey?: string;
};

export type DockerAlertsQuery = {
  vpsId: string;
  limit?: number;
  from?: string;
  to?: string;
  cursor?: string;
  state?: DockerAlert["state"];
  ruleKind?: string;
  agentInstanceId?: string;
  containerKey?: string;
};

export type DockerRollupsQuery = {
  vpsId: string;
  limit?: number;
  cursor?: string;
  agentInstanceId?: string;
  scope?: DockerMetricRollup["scope"];
  containerKey?: string;
};

// ── Future atomic ingest/cleanup contract (I3+, declared here, not implemented) ──

export type DockerMonitoringCleanup = {
  vpsId: string;
  reason: "monitoring_disabled" | "vps_deleted" | "identity_reset_orphaned";
};

export type DockerHostGaugeRollupOptions = { vpsId: string; now?: string };

/**
 * Observed-only formula v1: closed UTC hourly buckets, unique snapshots, and
 * no counter or availability inference. Expected equals observed; gaps are 0.
 */

// ── Repository interface ──────────────────────────────────────────────────
// Empty reads plus future atomic ingest/cleanup contract. I3 will implement
// the ingest/cleanup behavior; I1 JSON throws for those methods.

export type DockerMonitoringRepository = {
  listHostSamples(query: DockerHostSamplesQuery): Promise<DockerPage<DockerHostSample>>;
  listContainerSamples(query: DockerContainerSamplesQuery): Promise<DockerPage<DockerContainerSample>>;
  listEvents(query: DockerEventsQuery): Promise<DockerPage<DockerOperationalEvent>>;
  listRollups(query: DockerRollupsQuery): Promise<DockerPage<DockerMetricRollup>>;
  getStorageLatest(vpsId: string): Promise<DockerStorageLatest | undefined>;
  listAlerts(query: DockerAlertsQuery): Promise<DockerPage<DockerAlert>>;
  getWatermark(vpsId: string, agentInstanceId: string): Promise<DockerEventWatermark | undefined>;
  getIngestBatch(vpsId: string, agentInstanceId: string, batchId: string): Promise<DockerIngestBatch | undefined>;
  /** Future (I3): atomic ingest of one DockerV2IngestUnit. Not implemented in I1. */
  ingestV2Unit(unit: DockerV2IngestUnit): Promise<DockerV2IngestResult>;
  /** Future (I3): scoped cleanup on disable/delete/identity-reset. Not implemented in I1. */
  cleanupForVps(cleanup: DockerMonitoringCleanup): Promise<void>;
  rollupHostGauges?(options: DockerHostGaugeRollupOptions): Promise<DockerMetricRollup[]>;
};

export type DockerMonitoringSeed = Partial<DockerMonitoringStore>;

export type DockerMonitoringMaintenanceOptions = {
  cutoff: string;
  samplesPerVps: number;
  eventsPerVps: number;
};

export type DockerMonitoringMaintenanceResult = {
  samplesRemoved: number;
  eventsRemoved: number;
};

export type JsonDockerMonitoringRepository = DockerMonitoringRepository & {
  pruneSamplesEventsAndStorage(options: DockerMonitoringMaintenanceOptions): Promise<DockerMonitoringMaintenanceResult>;
};

// ── Internal helpers ──────────────────────────────────────────────────────

function emptyStore(): DockerMonitoringStore {
  return {
    schemaVersion: 2,
    revision: 0,
    latestByVps: {},
    snapshots: [],
    samples: [],
    rollups: [],
    events: [],
    latestStorage: {},
    watermarks: [],
    batches: [],
    alerts: [],
  };
}

function normalizeStore(raw: unknown): DockerMonitoringStore {
  const base = (raw ?? {}) as Partial<DockerMonitoringStore>;
  return {
    schemaVersion: typeof base.schemaVersion === "number" ? base.schemaVersion : 1,
    revision: typeof base.revision === "number" ? base.revision : 0,
    latestByVps: base.latestByVps && typeof base.latestByVps === "object" ? { ...base.latestByVps } : {},
    snapshots: Array.isArray(base.snapshots) ? [...base.snapshots] : [],
    samples: Array.isArray(base.samples) ? [...base.samples] : [],
    rollups: Array.isArray(base.rollups) ? [...base.rollups] : [],
    events: Array.isArray(base.events) ? [...base.events] : [],
    latestStorage: base.latestStorage != null && typeof base.latestStorage === "object" ? { ...(base.latestStorage as Record<string, DockerStorageLatest>) } : {},
    watermarks: Array.isArray(base.watermarks) ? [...base.watermarks] : [],
    batches: Array.isArray(base.batches) ? [...base.batches] : [],
    alerts: Array.isArray(base.alerts) ? [...base.alerts] : [],
  };
}

function resolveFilePath(dataDirOrFile: string): string {
  return dataDirOrFile.endsWith(".json") ? dataDirOrFile : join(dataDirOrFile, "docker-monitoring.json");
}

function isContainerSample(s: DockerHostSample | DockerContainerSample): s is DockerContainerSample {
  return (s as DockerContainerSample).containerKey !== undefined;
}

/** Newest-first stable order: (at DESC, id DESC). */
function compareDesc(atA: string, idA: string, atB: string, idB: string): number {
  if (atA !== atB) return atA < atB ? 1 : -1;
  if (idA !== idB) return idA < idB ? 1 : -1;
  return 0;
}

function inRange(at: string, from?: string, to?: string): boolean {
  if (from !== undefined && at < from) return false;
  if (to !== undefined && at > to) return false;
  return true;
}

function truncatePerVps<T>(rows: T[], pickVps: (row: T) => string | undefined, cap: number): T[] {
  const counts = new Map<string, number>();
  const keptReversed: T[] = [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i]!;
    const key = pickVps(row) ?? "__global__";
    const used = counts.get(key) ?? 0;
    if (used >= cap) continue;
    counts.set(key, used + 1);
    keptReversed.push(row);
  }
  return keptReversed.reverse();
}

function enforceCaps(store: DockerMonitoringStore): DockerMonitoringStore {
  store.samples = truncatePerVps(store.samples, (s) => (s as DockerHostSample).vpsId, DOCKER_MONITORING_CAPS.samplesPerVps);
  store.rollups = truncatePerVps(store.rollups, (r) => r.vpsId, DOCKER_MONITORING_CAPS.rollupsPerVps);
  store.events = truncatePerVps(store.events, (e) => e.vpsId, DOCKER_MONITORING_CAPS.eventsPerVps);
  store.alerts = truncatePerVps(store.alerts, (a) => a.vpsId, DOCKER_MONITORING_CAPS.alertsPerVps);
  store.watermarks = truncatePerVps(store.watermarks, (w) => `${w.vpsId}\0${w.agentInstanceId}`, DOCKER_MONITORING_CAPS.watermarksPerVps);
  store.batches = truncatePerVps(store.batches, (b) => `${b.vpsId}\0${b.agentInstanceId}`, DOCKER_MONITORING_CAPS.batchesPerVps);
  return store;
}

type KeysetPage<T> = {
  rows: T[];
  limit: number;
  cursorPayload: (last: { at: string; id: string }) => DockerCursorPayload;
  binding: { vpsId: string; scope: DockerListScope; agentInstanceId?: string; containerKey?: string; filters?: Record<string, string | undefined>; order: DockerCursorPayload["order"] };
  atOf: (row: T) => string;
  idOf: (row: T) => string;
  incomingCursor?: string;
};

function paginateKeyset<T>(args: KeysetPage<T>): DockerPage<T> {
  const { rows, limit, cursorPayload, binding, atOf, idOf, incomingCursor } = args;
  let start = 0;
  if (incomingCursor !== undefined) {
    const decoded = decodeDockerCursor(incomingCursor);
    assertDockerCursorBinding(decoded, binding);
    const idx = rows.findIndex((r) => atOf(r) === decoded.last.at && idOf(r) === decoded.last.id);
    start = idx === -1 ? rows.length : idx + 1;
  }
  const slice = rows.slice(start, start + limit);
  const hasMore = start + slice.length < rows.length;
  const last = slice.length > 0 ? slice[slice.length - 1]! : undefined;
  return {
    data: slice,
    page: {
      limit,
      hasMore,
      nextCursor: hasMore && last ? encodeDockerCursor(cursorPayload({ at: atOf(last), id: idOf(last) })) : undefined,
    },
  };
}

function alertTime(a: DockerAlert): string {
  return a.lastObservedAt ?? a.openedAt;
}

const OBSERVED_HOST_GAUGES = ["cpuPercent", "memoryUsageBytes"] as const;
function bucketStart(at: string): string {
  const d = new Date(at);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}
function rollupId(vpsId: string, agent: string, metric: string, bucket: string): string {
  return `host-gauge-v1:${encodeURIComponent(vpsId)}:${encodeURIComponent(agent)}:${metric}:${bucket}`;
}

// ── Factory ───────────────────────────────────────────────────────────────

function assertMaintenanceOptions(options: DockerMonitoringMaintenanceOptions): void {
  if (typeof options.cutoff !== "string" || Number.isNaN(Date.parse(options.cutoff))) {
    throw new Error("Invalid maintenance cutoff: must be an ISO datetime string");
  }
  for (const key of ["samplesPerVps", "eventsPerVps"] as const) {
    const value = options[key];
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Invalid maintenance option ${key}: must be a non-negative integer`);
    }
  }
}

function pruneToCapNewestFirst<T>(
  rows: T[],
  atOf: (row: T) => string,
  idOf: (row: T) => string,
  pickVps: (row: T) => string,
  cap: number,
): { kept: T[]; removed: number } {
  const byVps = new Map<string, T[]>();
  for (const row of rows) {
    const key = pickVps(row);
    const list = byVps.get(key);
    if (list) list.push(row);
    else byVps.set(key, [row]);
  }
  const kept: T[] = [];
  let removed = 0;
  for (const list of byVps.values()) {
    list.sort((a, b) => compareDesc(atOf(a), idOf(a), atOf(b), idOf(b)));
    kept.push(...list.slice(0, cap));
    removed += Math.max(0, list.length - cap);
  }
  return { kept, removed };
}

export function createJsonDockerMonitoringRepository(dataDirOrFile = "data"): JsonDockerMonitoringRepository {
  const filePath = resolveFilePath(dataDirOrFile);
  const resolved = filePath;

  async function readStore(): Promise<DockerMonitoringStore> {
    const raw = await readJsonFile<unknown>(filePath, emptyStore());
    return normalizeStore(raw);
  }

  return {
    async listHostSamples(query) {
      const limit = query.limit ?? 100;
      const store = await readStore();
      const rows = store.samples
        .filter((s) => s.vpsId === query.vpsId && !isContainerSample(s))
        .filter((s) => inRange(s.effectiveAt, query.from, query.to))
        .sort((a, b) => compareDesc(a.effectiveAt, a.id, b.effectiveAt, b.id))
        .slice(0, DOCKER_MONITORING_CAPS.samplesPerVps);
      return paginateKeyset<DockerHostSample>({
        rows,
        limit,
        incomingCursor: query.cursor,
        atOf: (r) => r.effectiveAt,
        idOf: (r) => r.id,
        binding: {
          vpsId: query.vpsId,
          scope: "host",
          filters: { from: query.from, to: query.to },
          order: "effectiveAt,id",
        },
        cursorPayload: (last) => ({
          v: 1,
          vpsId: query.vpsId,
          scope: "host",
          filters: { from: query.from, to: query.to },
          order: "effectiveAt,id",
          last,
        }),
      });
    },

    async listContainerSamples(query) {
      const limit = query.limit ?? 100;
      const store = await readStore();
      const rows = store.samples
        .filter(
          (s): s is DockerContainerSample =>
            s.vpsId === query.vpsId &&
            isContainerSample(s) &&
            s.agentInstanceId === query.agentInstanceId &&
            s.containerKey === query.containerKey,
        )
        .filter((s) => inRange(s.effectiveAt, query.from, query.to))
        .sort((a, b) => compareDesc(a.effectiveAt, a.id, b.effectiveAt, b.id))
        .slice(0, DOCKER_MONITORING_CAPS.samplesPerVps);
      return paginateKeyset<DockerContainerSample>({
        rows,
        limit,
        incomingCursor: query.cursor,
        atOf: (r) => r.effectiveAt,
        idOf: (r) => r.id,
        binding: {
          vpsId: query.vpsId,
          scope: "container",
          agentInstanceId: query.agentInstanceId,
          containerKey: query.containerKey,
          filters: { from: query.from, to: query.to },
          order: "effectiveAt,id",
        },
        cursorPayload: (last) => ({
          v: 1,
          vpsId: query.vpsId,
          scope: "container",
          agentInstanceId: query.agentInstanceId,
          containerKey: query.containerKey,
          filters: { from: query.from, to: query.to },
          order: "effectiveAt,id",
          last,
        }),
      });
    },

    async listEvents(query) {
      const limit = query.limit ?? 50;
      const store = await readStore();
      const rows = store.events
        .filter((e) => e.vpsId === query.vpsId)
        .filter((e) => (query.action === undefined ? true : e.action === query.action))
        .filter((e) => (query.agentInstanceId === undefined ? true : e.agentInstanceId === query.agentInstanceId))
        .filter((e) => (query.containerKey === undefined ? true : (e.containerKey ?? undefined) === query.containerKey))
        .filter((e) => inRange(e.eventOccurredAt, query.from, query.to))
        .sort((a, b) => compareDesc(a.eventOccurredAt, a.id, b.eventOccurredAt, b.id))
        .slice(0, DOCKER_MONITORING_CAPS.eventsPerVps);
      return paginateKeyset<DockerOperationalEvent>({
        rows,
        limit,
        incomingCursor: query.cursor,
        atOf: (r) => r.eventOccurredAt,
        idOf: (r) => r.id,
        binding: {
          vpsId: query.vpsId,
          scope: "events",
          agentInstanceId: query.agentInstanceId,
          containerKey: query.containerKey,
          filters: { action: query.action, from: query.from, to: query.to },
          order: "eventOccurredAt,id",
        },
        cursorPayload: (last) => ({
          v: 1,
          vpsId: query.vpsId,
          scope: "events",
          agentInstanceId: query.agentInstanceId,
          containerKey: query.containerKey,
          filters: { action: query.action, from: query.from, to: query.to },
          order: "eventOccurredAt,id",
          last,
        }),
      });
    },

    async listRollups(query) {
      const limit = query.limit ?? 100;
      const store = await readStore();
      const rows = store.rollups
        .filter((r) => r.vpsId === query.vpsId)
        .filter((r) => (query.agentInstanceId === undefined ? true : r.agentInstanceId === query.agentInstanceId))
        .filter((r) => (query.scope === undefined ? true : r.scope === query.scope))
        .filter((r) => (query.containerKey === undefined ? true : (r.containerKey ?? undefined) === query.containerKey))
        .sort((a, b) => compareDesc(a.bucketStart, a.id, b.bucketStart, b.id))
        .slice(0, DOCKER_MONITORING_CAPS.rollupsPerVps);
      return paginateKeyset<DockerMetricRollup>({
        rows,
        limit,
        incomingCursor: query.cursor,
        atOf: (r) => r.bucketStart,
        idOf: (r) => r.id,
        binding: {
          vpsId: query.vpsId,
          scope: "rollups",
          agentInstanceId: query.agentInstanceId,
          containerKey: query.containerKey,
          filters: { scope: query.scope },
          order: "bucketStart,id",
        },
        cursorPayload: (last) => ({
          v: 1,
          vpsId: query.vpsId,
          scope: "rollups",
          agentInstanceId: query.agentInstanceId,
          containerKey: query.containerKey,
          filters: { scope: query.scope },
          order: "bucketStart,id",
          last,
        }),
      });
    },

    async getStorageLatest(vpsId) {
      const store = await readStore();
      return store.latestStorage[vpsId];
    },

    async listAlerts(query) {
      const limit = query.limit ?? 50;
      const store = await readStore();
      const rows = store.alerts
        .filter((a) => a.vpsId === query.vpsId)
        .filter((a) => (query.state === undefined ? true : a.state === query.state))
        .filter((a) => (query.ruleKind === undefined ? true : a.ruleKind === query.ruleKind))
        .filter((a) => (query.agentInstanceId === undefined ? true : (a.agentInstanceId ?? undefined) === query.agentInstanceId))
        .filter((a) => (query.containerKey === undefined ? true : (a.containerKey ?? undefined) === query.containerKey))
        .filter((a) => inRange(alertTime(a), query.from, query.to))
        .sort((a, b) => compareDesc(alertTime(a), a.id, alertTime(b), b.id))
        .slice(0, DOCKER_MONITORING_CAPS.alertsPerVps);
      return paginateKeyset<DockerAlert>({
        rows,
        limit,
        incomingCursor: query.cursor,
        atOf: (r) => alertTime(r),
        idOf: (r) => r.id,
        binding: {
          vpsId: query.vpsId,
          scope: "alerts",
          agentInstanceId: query.agentInstanceId,
          containerKey: query.containerKey,
          filters: { state: query.state, ruleKind: query.ruleKind, from: query.from, to: query.to },
          order: "lastObservedAt,id",
        },
        cursorPayload: (last) => ({
          v: 1,
          vpsId: query.vpsId,
          scope: "alerts",
          agentInstanceId: query.agentInstanceId,
          containerKey: query.containerKey,
          filters: { state: query.state, ruleKind: query.ruleKind, from: query.from, to: query.to },
          order: "lastObservedAt,id",
          last,
        }),
      });
    },

    async getWatermark(vpsId, agentInstanceId) {
      const store = await readStore();
      return store.watermarks.find((w) => w.vpsId === vpsId && w.agentInstanceId === agentInstanceId);
    },

    async getIngestBatch(vpsId, agentInstanceId, batchId) {
      const store = await readStore();
      return store.batches.find((b) => b.vpsId === vpsId && b.agentInstanceId === agentInstanceId && b.batchId === batchId);
    },

    async ingestV2Unit(unit) {
      let result: DockerV2IngestResult | undefined;
      await readModifyWriteJsonFile<unknown>(resolved, emptyStore(), (raw) => {
        const store = normalizeStore(raw);
        const batchKey = unit.batchId && store.batches.find((b) => b.vpsId === unit.vpsId && b.agentInstanceId === unit.agentInstanceId && b.batchId === unit.batchId);
        const snapshotKey = store.snapshots.find((s) => s.vpsId === unit.vpsId && s.snapshotId === unit.snapshotId);
        if (snapshotKey && snapshotKey.requestDigest !== unit.requestDigest) throw new DockerIngestConflict("snapshot_conflict");
        if (snapshotKey && snapshotKey.requestDigest === unit.requestDigest) {
          result = { vpsId: unit.vpsId, ingestStatus: snapshotKey.result.status === "replay_ignored" ? "replay_ignored" : "already_committed", snapshotId: snapshotKey.snapshotId, agentInstanceId: unit.agentInstanceId, batchId: unit.batchId, receivedAt: unit.receivedAt, revision: snapshotKey.revision };
          return store;
        }
        if (batchKey) {
          if (batchKey.requestDigest !== unit.requestDigest) throw new DockerIngestConflict("request_digest_mismatch");
          result = { vpsId: unit.vpsId, ingestStatus: "already_committed", snapshotId: batchKey.snapshotId, agentInstanceId: unit.agentInstanceId, batchId: unit.batchId, receivedAt: unit.receivedAt, revision: batchKey.revision ?? store.revision };
          return store;
        }
        const prior = store.latestByVps[unit.vpsId];
        if (prior && prior.activeInstanceId !== unit.agentInstanceId && compareDockerSourceSequence(unit.sourceSequence, prior.sourceSequence) <= 0) throw new DockerIngestConflict("active_instance_conflict");
        if (prior && prior.activeInstanceId === unit.agentInstanceId && compareDockerSourceSequence(unit.sourceSequence, prior.sourceSequence) < 0) {
          store.snapshots.push({ vpsId: unit.vpsId, snapshotId: unit.snapshotId, agentInstanceId: unit.agentInstanceId, requestDigest: unit.requestDigest, sourceSequence: unit.sourceSequence, result: { status: "replay_ignored", snapshotId: unit.snapshotId, revision: store.revision }, receivedAt: unit.receivedAt, revision: store.revision });
          result = { vpsId: unit.vpsId, ingestStatus: "replay_ignored", snapshotId: unit.snapshotId, agentInstanceId: unit.agentInstanceId, batchId: unit.batchId, receivedAt: unit.receivedAt, revision: store.revision };
          return enforceCaps(store);
        }
        const watermark = store.watermarks.find((w) => w.vpsId === unit.vpsId && w.agentInstanceId === unit.agentInstanceId);
        if (unit.events?.length && unit.eventProtocol) {
          if (watermark && compareDockerWatermarks(unit.eventProtocol.fromWatermark, watermark) !== 0) throw new DockerIngestConflict("watermark_conflict");
          store.events.push(...unit.events);
          const wi = store.watermarks.findIndex((w) => w.vpsId === unit.vpsId && w.agentInstanceId === unit.agentInstanceId);
          if (wi >= 0) store.watermarks[wi] = unit.eventProtocol.proposedWatermark; else store.watermarks.push(unit.eventProtocol.proposedWatermark);
        }
        store.samples.push(unit.hostSample, ...(unit.containerSamples ?? []));
        if (unit.storageLatest) store.latestStorage[unit.vpsId] = unit.storageLatest;
        store.revision += 1;
        store.latestByVps[unit.vpsId] = { activeInstanceId: unit.agentInstanceId, snapshotId: unit.snapshotId, sourceSequence: unit.sourceSequence, receivedAt: unit.receivedAt, updatedAt: unit.receivedAt, revision: store.revision, compatibility: unit.compatibility };
        const committed = { status: "committed" as const, snapshotId: unit.snapshotId, revision: store.revision };
        store.snapshots.push({ vpsId: unit.vpsId, snapshotId: unit.snapshotId, agentInstanceId: unit.agentInstanceId, requestDigest: unit.requestDigest, sourceSequence: unit.sourceSequence, result: committed, receivedAt: unit.receivedAt, revision: store.revision });
        if (unit.batchId) store.batches.push({ vpsId: unit.vpsId, agentInstanceId: unit.agentInstanceId, batchId: unit.batchId, snapshotId: unit.snapshotId, requestDigest: unit.requestDigest, result: committed, revision: store.revision });
        result = { vpsId: unit.vpsId, ingestStatus: "committed", snapshotId: unit.snapshotId, agentInstanceId: unit.agentInstanceId, batchId: unit.batchId, receivedAt: unit.receivedAt, committedWatermark: unit.events?.length ? unit.eventProtocol?.proposedWatermark : undefined, revision: store.revision };
        return enforceCaps(store);
      });
      return result!;
    },

    async pruneSamplesEventsAndStorage(options) {
      assertMaintenanceOptions(options);
      let result: DockerMonitoringMaintenanceResult = { samplesRemoved: 0, eventsRemoved: 0 };
      await readModifyWriteJsonFile<unknown>(resolved, emptyStore(), (raw) => {
        const store = normalizeStore(raw);
        const oldSamples = store.samples.length;
        const oldEvents = store.events.length;
        const eligibleSamples = store.samples.filter((sample) => sample.effectiveAt >= options.cutoff);
        const eligibleEvents = store.events.filter((event) => event.eventOccurredAt >= options.cutoff);
        const samples = pruneToCapNewestFirst(eligibleSamples, (sample) => sample.effectiveAt, (sample) => sample.id, (sample) => sample.vpsId, options.samplesPerVps);
        const events = pruneToCapNewestFirst(eligibleEvents, (event) => event.eventOccurredAt, (event) => event.id, (event) => event.vpsId, options.eventsPerVps);
        store.samples = samples.kept;
        store.events = events.kept;
        result = { samplesRemoved: oldSamples - store.samples.length, eventsRemoved: oldEvents - store.events.length };
        // latestStorage and latestByVps are authoritative state, not history; preserve them.
        return store;
      });
      return result;
    },

    async cleanupForVps(cleanup) {
      await readModifyWriteJsonFile<unknown>(resolved, emptyStore(), (raw) => {
        const store = normalizeStore(raw);
        const v = cleanup.vpsId;
        store.samples = store.samples.filter((x) => x.vpsId !== v);
        store.events = store.events.filter((x) => x.vpsId !== v);
        store.rollups = store.rollups.filter((x) => x.vpsId !== v);
        store.alerts = store.alerts.filter((x) => x.vpsId !== v);
        delete store.latestStorage[v]; delete store.latestByVps[v];
        if (cleanup.reason === "vps_deleted") { store.snapshots = store.snapshots.filter((x) => x.vpsId !== v); store.watermarks = store.watermarks.filter((x) => x.vpsId !== v); store.batches = store.batches.filter((x) => x.vpsId !== v); }
        return store;
      });
    },

    async rollupHostGauges(options) {
      const now = new Date(options.now ?? new Date().toISOString());
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const closedBefore = new Date(now);
      closedBefore.setUTCMinutes(0, 0, 0);
      const store = await readStore();
      const unique = new Map<string, DockerHostSample>();
      for (const sample of store.samples) {
        if (sample.vpsId !== options.vpsId || isContainerSample(sample) || sample.effectiveAt < cutoff || sample.effectiveAt >= closedBefore.toISOString()) continue;
        const prior = unique.get(sample.snapshotId);
        if (!prior || sample.effectiveAt > prior.effectiveAt || (sample.effectiveAt === prior.effectiveAt && sample.id > prior.id)) unique.set(sample.snapshotId, sample);
      }
      const groups = new Map<string, DockerHostSample[]>();
      for (const sample of unique.values()) for (const metric of OBSERVED_HOST_GAUGES) {
        if (typeof sample.metrics[metric] !== "number" || !Number.isFinite(sample.metrics[metric])) continue;
        const key = `${sample.agentInstanceId}\0${metric}\0${bucketStart(sample.effectiveAt)}`;
        const list = groups.get(key); if (list) list.push(sample); else groups.set(key, [sample]);
      }
      const result: DockerMetricRollup[] = [];
      await readModifyWriteJsonFile<unknown>(resolved, emptyStore(), (raw) => {
        const current = normalizeStore(raw);
        for (const [key, samples] of groups) {
          const [agentInstanceId, metricName, bucket] = key.split("\0") as [string, string, string];
          const values = samples.map((s) => s.metrics[metricName]!);
          const row: DockerMetricRollup = { id: rollupId(options.vpsId, agentInstanceId, metricName, bucket), vpsId: options.vpsId, agentInstanceId, scope: "host", metricName, bucketStart: bucket, formulaVersion: 1, firstAt: samples.map(s => s.effectiveAt).sort()[0]!, lastAt: samples.map(s => s.effectiveAt).sort().at(-1)!, sampleCount: values.length, gaugeMin: Math.min(...values), gaugeMax: Math.max(...values), gaugeSum: values.reduce((a,b) => a+b, 0), gaugeAverage: values.reduce((a,b) => a+b, 0) / values.length, resetCount: 0, expectedSamples: values.length, observedSamples: values.length, partialSampleCount: 0, gapCount: 0, coverageRatio: 1 };
          const index = current.rollups.findIndex(r => r.id === row.id); if (index >= 0) current.rollups[index] = row; else current.rollups.push(row); result.push(row);
        }
        current.rollups = truncatePerVps(current.rollups, r => r.vpsId, DOCKER_MONITORING_CAPS.rollupsPerVps);
        return current;
      });
      return result;
    },
  };
}

// ── Test-only seed helpers (shared conformance seeding; not production writes) ──
// Append/merge helpers used by the conformance factory. They enforce the same
// per-VPS caps as production maintenance so tests cannot grow the file
// without bound.

export async function seedDockerMonitoringForTests(filePath: string, seed: DockerMonitoringSeed): Promise<void> {
  const resolved = resolveFilePath(filePath);
  await readModifyWriteJsonFile<unknown>(resolved, emptyStore(), (raw) => {
    const store = normalizeStore(raw);
    if (seed.samples?.length) store.samples.push(...seed.samples);
    if (seed.rollups?.length) store.rollups.push(...seed.rollups);
    if (seed.events?.length) store.events.push(...seed.events);
    if (seed.watermarks?.length) {
      for (const w of seed.watermarks) {
        const idx = store.watermarks.findIndex((x) => x.vpsId === w.vpsId && x.agentInstanceId === w.agentInstanceId);
        if (idx === -1) store.watermarks.push(w);
        else store.watermarks[idx] = w;
      }
    }
    if (seed.batches?.length) {
      for (const b of seed.batches) {
        const idx = store.batches.findIndex((x) => x.vpsId === b.vpsId && x.agentInstanceId === b.agentInstanceId && x.batchId === b.batchId);
        if (idx === -1) store.batches.push(b);
        else store.batches[idx] = b;
      }
    }
    if (seed.alerts?.length) store.alerts.push(...seed.alerts);
    if (seed.latestStorage) {
      for (const [vpsId, latest] of Object.entries(seed.latestStorage)) {
        if (latest !== undefined) store.latestStorage[vpsId] = latest;
      }
    }
    return enforceCaps(store);
  });
}
