import { withTransaction, type DatabasePool } from "../../db/pool.js";
import {
  assertDockerCursorBinding,
  decodeDockerCursor,
  encodeDockerCursor,
} from "../../docker/docker-monitoring.schemas.js";
import { DockerIngestConflict } from "../../docker/docker-monitoring.models.js";
import type {
  DockerAlert,
  DockerContainerSample,
  DockerCursorPayload,
  DockerEventWatermark,
  DockerHostSample,
  DockerHostSampleCoverage,
  DockerIngestBatch,
  DockerMetricRollup,
  DockerV2IngestUnit,
  DockerV2IngestResult,
  DockerOperationalEvent,
  DockerPage,
  DockerStorageCategory,
  DockerStorageLatest,
} from "../../docker/docker-monitoring.models.js";
import type {
  DockerAlertsQuery,
  DockerContainerSamplesQuery,
  DockerEventsQuery,
  DockerHostSamplesQuery,
  DockerMonitoringRepository,
  DockerRollupsQuery,
  DockerMonitoringCleanup,
  DockerMonitoringMaintenanceOptions,
  DockerMonitoringMaintenanceResult,
} from "./docker-monitoring.repository.js";
import {
  optionalIsoString,
  requiredIsoString,
} from "./postgres-mappers.js";

// ── PostgreSQL Docker monitoring reads (I1) ──────────────────────────────
// Bounded VPS-scoped keyset reads matching the JSON observable semantics.
// I3 ingest/cleanup throw not-implemented (same contract as JSON).

type SampleRow = {
  id: string;
  vps_id: string;
  agent_instance_id: string;
  snapshot_id: string;
  container_key: string | null;
  name: string | null;
  state: string | null;
  collected_at: Date | string;
  received_at: Date | string;
  effective_at: Date | string;
  metrics: Record<string, number>;
  coverage: Record<string, unknown> | null;
};

type RollupRow = {
  id: string;
  vps_id: string;
  agent_instance_id: string;
  scope: DockerMetricRollup["scope"];
  metric_name: string | null;
  container_key: string | null;
  cohort_digest: string | null;
  bucket_start: Date | string;
  formula_version: number;
  first_at: Date | string;
  last_at: Date | string;
  sample_count: number;
  gauge_min: number | null;
  gauge_max: number | null;
  gauge_sum: number | null;
  gauge_average: number | null;
  counter_first: number | null;
  counter_last: number | null;
  counter_increase: number | null;
  reset_count: number;
  expected_samples: number;
  observed_samples: number;
  partial_sample_count: number;
  gap_count: number;
  coverage_ratio: number;
};

type EventRow = {
  id: string;
  vps_id: string;
  agent_instance_id: string;
  container_key: string | null;
  action: DockerOperationalEvent["action"];
  event_occurred_at: Date | string;
  received_at: Date | string;
  event_digest: string;
  context_version: 1;
  health_status: DockerOperationalEvent["healthStatus"] | null;
  exit_code: number | null;
  signal: number | null;
  oom_killed: boolean | null;
};

type StorageRow = {
  vps_id: string;
  agent_instance_id: string;
  snapshot_id: string;
  collected_at: Date | string;
  received_at: Date | string;
  images: DockerStorageCategory;
  containers: DockerStorageCategory;
  local_volumes: DockerStorageCategory;
  build_cache: DockerStorageCategory;
  formula_version: 1;
};

type WatermarkRow = {
  vps_id: string;
  agent_instance_id: string;
  time_nano: string;
  boundary_digests: string[];
  committed_batch_id: string | null;
  updated_at: Date | string;
};

type BatchRow = {
  vps_id: string;
  agent_instance_id: string;
  batch_id: string;
  snapshot_id: string;
  request_digest: string;
  result: string;
};

type AlertRow = {
  id: string;
  vps_id: string;
  agent_instance_id: string | null;
  rule_kind: string;
  container_key: string | null;
  state: DockerAlert["state"];
  fingerprint: string;
  opened_at: Date | string;
  last_observed_at: Date | string | null;
  resolved_at: Date | string | null;
  acknowledged_at: Date | string | null;
  acknowledged_by: string | null;
  occurrences: number;
  summary: string;
  context_version: 1;
};

function rowToHostSample(row: SampleRow): DockerHostSample {
  const coverage = row.coverage;
  const typedCoverage = coverage && typeof coverage === "object"
    && typeof (coverage as Record<string, unknown>).detailsSampled === "number"
    && typeof (coverage as Record<string, unknown>).detailsTotalEligible === "number"
    && typeof (coverage as Record<string, unknown>).complete === "boolean"
    ? coverage as DockerHostSampleCoverage
    : undefined;
  return {
    id: row.id,
    vpsId: row.vps_id,
    agentInstanceId: row.agent_instance_id,
    snapshotId: row.snapshot_id,
    collectedAt: requiredIsoString(row.collected_at),
    receivedAt: requiredIsoString(row.received_at),
    effectiveAt: requiredIsoString(row.effective_at),
    metrics: row.metrics ?? {},
    ...(typedCoverage ? { coverage: typedCoverage } : {}),
  };
}

function rowToContainerSample(row: SampleRow): DockerContainerSample {
  return {
    ...rowToHostSample(row),
    containerKey: row.container_key!,
    ...(row.name != null ? { name: row.name } : {}),
    ...(row.state != null ? { state: row.state } : {}),
  };
}

function rowToRollup(row: RollupRow): DockerMetricRollup {
  return {
    id: row.id,
    vpsId: row.vps_id,
    agentInstanceId: row.agent_instance_id,
    scope: row.scope,
    ...(row.metric_name != null && row.metric_name !== "legacy" ? { metricName: row.metric_name } : {}),
    ...(row.container_key != null ? { containerKey: row.container_key } : {}),
    ...(row.cohort_digest != null ? { cohortDigest: row.cohort_digest } : {}),
    bucketStart: requiredIsoString(row.bucket_start),
    formulaVersion: row.formula_version,
    firstAt: requiredIsoString(row.first_at),
    lastAt: requiredIsoString(row.last_at),
    sampleCount: row.sample_count,
    ...(row.gauge_min != null ? { gaugeMin: Number(row.gauge_min) } : {}),
    ...(row.gauge_max != null ? { gaugeMax: Number(row.gauge_max) } : {}),
    ...(row.gauge_sum != null ? { gaugeSum: Number(row.gauge_sum) } : {}),
    ...(row.gauge_average != null ? { gaugeAverage: Number(row.gauge_average) } : {}),
    ...(row.counter_first != null ? { counterFirst: Number(row.counter_first) } : {}),
    ...(row.counter_last != null ? { counterLast: Number(row.counter_last) } : {}),
    ...(row.counter_increase != null ? { counterIncrease: Number(row.counter_increase) } : {}),
    resetCount: row.reset_count,
    expectedSamples: row.expected_samples,
    observedSamples: row.observed_samples,
    partialSampleCount: row.partial_sample_count,
    gapCount: row.gap_count,
    coverageRatio: Number(row.coverage_ratio),
  };
}

function rowToEvent(row: EventRow): DockerOperationalEvent {
  return {
    id: row.id,
    vpsId: row.vps_id,
    agentInstanceId: row.agent_instance_id,
    ...(row.container_key != null ? { containerKey: row.container_key } : {}),
    action: row.action,
    eventOccurredAt: requiredIsoString(row.event_occurred_at),
    receivedAt: requiredIsoString(row.received_at),
    eventDigest: row.event_digest,
    contextVersion: 1,
    ...(row.health_status != null ? { healthStatus: row.health_status } : {}),
    ...(row.exit_code != null ? { exitCode: row.exit_code } : {}),
    ...(row.signal != null ? { signal: row.signal } : {}),
    ...(row.oom_killed != null ? { oomKilled: row.oom_killed } : {}),
  };
}

function rowToStorage(row: StorageRow): DockerStorageLatest {
  return {
    vpsId: row.vps_id,
    agentInstanceId: row.agent_instance_id,
    snapshotId: row.snapshot_id,
    collectedAt: requiredIsoString(row.collected_at),
    receivedAt: requiredIsoString(row.received_at),
    images: row.images,
    containers: row.containers,
    localVolumes: row.local_volumes,
    buildCache: row.build_cache,
    formulaVersion: 1,
  };
}

function rowToWatermark(row: WatermarkRow): DockerEventWatermark {
  return {
    vpsId: row.vps_id,
    agentInstanceId: row.agent_instance_id,
    timeNano: row.time_nano,
    boundaryDigests: row.boundary_digests ?? [],
    ...(row.committed_batch_id != null ? { committedBatchId: row.committed_batch_id } : {}),
    updatedAt: requiredIsoString(row.updated_at),
  };
}

function rowToBatch(row: BatchRow): DockerIngestBatch {
  return {
    vpsId: row.vps_id,
    agentInstanceId: row.agent_instance_id,
    batchId: row.batch_id,
    snapshotId: row.snapshot_id,
    requestDigest: row.request_digest,
    result: row.result,
  };
}

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

export type PostgresDockerMonitoringRepository = DockerMonitoringRepository & {
  pruneSamplesEventsAndStorage(
    options: DockerMonitoringMaintenanceOptions,
  ): Promise<DockerMonitoringMaintenanceResult>;
};

function rowToAlert(row: AlertRow): DockerAlert {
  return {
    id: row.id,
    vpsId: row.vps_id,
    ...(row.agent_instance_id != null ? { agentInstanceId: row.agent_instance_id } : {}),
    ruleKind: row.rule_kind,
    ...(row.container_key != null ? { containerKey: row.container_key } : {}),
    state: row.state,
    fingerprint: row.fingerprint,
    openedAt: requiredIsoString(row.opened_at),
    ...(optionalIsoString(row.last_observed_at) !== undefined
      ? { lastObservedAt: optionalIsoString(row.last_observed_at) }
      : {}),
    ...(optionalIsoString(row.resolved_at) !== undefined
      ? { resolvedAt: optionalIsoString(row.resolved_at) }
      : {}),
    ...(optionalIsoString(row.acknowledged_at) !== undefined
      ? { acknowledgedAt: optionalIsoString(row.acknowledged_at) }
      : {}),
    ...(row.acknowledged_by != null ? { acknowledgedBy: row.acknowledged_by } : {}),
    occurrences: row.occurrences,
    summary: row.summary,
    contextVersion: 1,
  };
}

export function createPostgresDockerMonitoringRepository(
  pool: DatabasePool,
): PostgresDockerMonitoringRepository {
  return {
    async rollupHostGauges(options) {
      const now = new Date(options.now ?? new Date().toISOString());
      const closed = new Date(now); closed.setUTCMinutes(0, 0, 0);
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const result: DockerMetricRollup[] = [];
      const metrics = ["cpuPercent", "memoryUsageBytes"] as const;
      for (const metric of metrics) {
        const rows = await pool.query<{ agent_instance_id: string; bucket_start: Date; first_at: Date; last_at: Date; n: number; min: number; max: number; sum: number }>(
          `SELECT agent_instance_id, date_trunc('hour', effective_at) AS bucket_start, min(effective_at) AS first_at, max(effective_at) AS last_at, count(*)::int AS n, min((metrics->>$2)::double precision) AS min, max((metrics->>$2)::double precision) AS max, sum((metrics->>$2)::double precision) AS sum FROM docker_metric_samples WHERE vps_id=$1 AND container_key IS NULL AND effective_at >= $3 AND effective_at < $4 AND metrics ? $2 GROUP BY agent_instance_id, date_trunc('hour', effective_at)`,
          [options.vpsId, metric, cutoff, closed],
        );
        for (const row of rows.rows) {
          const bucket = row.bucket_start.toISOString();
          const id = `host-gauge-v1:${encodeURIComponent(options.vpsId)}:${encodeURIComponent(row.agent_instance_id)}:${metric}:${bucket}`;
          const n = Number(row.n), sum = Number(row.sum);
          const rollup: DockerMetricRollup = { id, vpsId: options.vpsId, agentInstanceId: row.agent_instance_id, scope: "host", metricName: metric, bucketStart: bucket, formulaVersion: 1, firstAt: row.first_at.toISOString(), lastAt: row.last_at.toISOString(), sampleCount: n, gaugeMin: Number(row.min), gaugeMax: Number(row.max), gaugeSum: sum, gaugeAverage: sum / n, resetCount: 0, expectedSamples: n, observedSamples: n, partialSampleCount: 0, gapCount: 0, coverageRatio: 1 };
          await pool.query(`INSERT INTO docker_metric_rollups (id,vps_id,agent_instance_id,scope,metric_name,bucket_start,formula_version,first_at,last_at,sample_count,gauge_min,gauge_max,gauge_sum,gauge_average,reset_count,expected_samples,observed_samples,partial_sample_count,gap_count,coverage_ratio) VALUES ($1,$2,$3,'host',$4,$5,1,$6,$7,$8,$9,$10,$11,$12,0,$8,$8,0,0,1) ON CONFLICT (id) DO UPDATE SET metric_name=EXCLUDED.metric_name,gauge_min=EXCLUDED.gauge_min,gauge_max=EXCLUDED.gauge_max,gauge_sum=EXCLUDED.gauge_sum,gauge_average=EXCLUDED.gauge_average,sample_count=EXCLUDED.sample_count,expected_samples=EXCLUDED.expected_samples,observed_samples=EXCLUDED.observed_samples`, [id, options.vpsId, row.agent_instance_id, metric, row.bucket_start, row.first_at, row.last_at, n, row.min, row.max, sum, sum / n]);
          result.push(rollup);
        }
      }
      return result;
    },
    async listHostSamples(query: DockerHostSamplesQuery): Promise<DockerPage<DockerHostSample>> {
      const limit = query.limit ?? 100;
      const binding = {
        vpsId: query.vpsId,
        scope: "host" as const,
        filters: { from: query.from, to: query.to },
        order: "effectiveAt,id" as const,
      };
      let last: { at: string; id: string } | undefined;
      if (query.cursor !== undefined) {
        const decoded = decodeDockerCursor(query.cursor);
        assertDockerCursorBinding(decoded, binding);
        last = decoded.last;
      }
      const values: unknown[] = [query.vpsId];
      const where: string[] = ["vps_id = $1", "container_key IS NULL"];
      if (query.from !== undefined) {
        values.push(new Date(query.from));
        where.push(`effective_at >= $${values.length}`);
      }
      if (query.to !== undefined) {
        values.push(new Date(query.to));
        where.push(`effective_at <= $${values.length}`);
      }
      if (last !== undefined) {
        values.push(new Date(last.at), last.id);
        where.push(
          `(effective_at < $${values.length - 1} OR (effective_at = $${values.length - 1} AND id < $${values.length}))`,
        );
      }
      values.push(limit + 1);
      const result = await pool.query<SampleRow>(
        `SELECT * FROM docker_metric_samples WHERE ${where.join(" AND ")} ` +
          `ORDER BY effective_at DESC, id DESC LIMIT $${values.length}`,
        values,
      );
      const rows = result.rows.slice(0, limit).map(rowToHostSample);
      const hasMore = result.rows.length > limit;
      const tail = rows.length > 0 ? rows[rows.length - 1]! : undefined;
      const cursorPayload = (at: string, id: string): DockerCursorPayload => ({
        v: 1,
        vpsId: query.vpsId,
        scope: "host",
        filters: { from: query.from, to: query.to },
        order: "effectiveAt,id",
        last: { at, id },
      });
      return {
        data: rows,
        page: {
          limit,
          hasMore,
          nextCursor:
            hasMore && tail ? encodeDockerCursor(cursorPayload(tail.effectiveAt, tail.id)) : undefined,
        },
      };
    },

    async listContainerSamples(
      query: DockerContainerSamplesQuery,
    ): Promise<DockerPage<DockerContainerSample>> {
      const limit = query.limit ?? 100;
      const binding = {
        vpsId: query.vpsId,
        scope: "container" as const,
        agentInstanceId: query.agentInstanceId,
        containerKey: query.containerKey,
        filters: { from: query.from, to: query.to },
        order: "effectiveAt,id" as const,
      };
      let last: { at: string; id: string } | undefined;
      if (query.cursor !== undefined) {
        const decoded = decodeDockerCursor(query.cursor);
        assertDockerCursorBinding(decoded, binding);
        last = decoded.last;
      }
      const values: unknown[] = [query.vpsId, query.agentInstanceId, query.containerKey];
      const where: string[] = ["vps_id = $1", "agent_instance_id = $2", "container_key = $3"];
      if (query.from !== undefined) {
        values.push(new Date(query.from));
        where.push(`effective_at >= $${values.length}`);
      }
      if (query.to !== undefined) {
        values.push(new Date(query.to));
        where.push(`effective_at <= $${values.length}`);
      }
      if (last !== undefined) {
        values.push(new Date(last.at), last.id);
        where.push(
          `(effective_at < $${values.length - 1} OR (effective_at = $${values.length - 1} AND id < $${values.length}))`,
        );
      }
      values.push(limit + 1);
      const result = await pool.query<SampleRow>(
        `SELECT * FROM docker_metric_samples WHERE ${where.join(" AND ")} ` +
          `ORDER BY effective_at DESC, id DESC LIMIT $${values.length}`,
        values,
      );
      const rows = result.rows.slice(0, limit).map(rowToContainerSample);
      const hasMore = result.rows.length > limit;
      const tail = rows.length > 0 ? rows[rows.length - 1]! : undefined;
      return {
        data: rows,
        page: {
          limit,
          hasMore,
          nextCursor:
            hasMore && tail
              ? encodeDockerCursor({
                  v: 1,
                  vpsId: query.vpsId,
                  scope: "container",
                  agentInstanceId: query.agentInstanceId,
                  containerKey: query.containerKey,
                  filters: { from: query.from, to: query.to },
                  order: "effectiveAt,id",
                  last: { at: tail.effectiveAt, id: tail.id },
                })
              : undefined,
        },
      };
    },

    async listEvents(query: DockerEventsQuery): Promise<DockerPage<DockerOperationalEvent>> {
      const limit = query.limit ?? 50;
      const binding = {
        vpsId: query.vpsId,
        scope: "events" as const,
        agentInstanceId: query.agentInstanceId,
        containerKey: query.containerKey,
        filters: { action: query.action, from: query.from, to: query.to },
        order: "eventOccurredAt,id" as const,
      };
      let last: { at: string; id: string } | undefined;
      if (query.cursor !== undefined) {
        const decoded = decodeDockerCursor(query.cursor);
        assertDockerCursorBinding(decoded, binding);
        last = decoded.last;
      }
      const values: unknown[] = [query.vpsId];
      const where: string[] = ["vps_id = $1"];
      if (query.action !== undefined) {
        values.push(query.action);
        where.push(`action = $${values.length}`);
      }
      if (query.agentInstanceId !== undefined) {
        values.push(query.agentInstanceId);
        where.push(`agent_instance_id = $${values.length}`);
      }
      if (query.containerKey !== undefined) {
        values.push(query.containerKey);
        where.push(`container_key = $${values.length}`);
      }
      if (query.from !== undefined) {
        values.push(new Date(query.from));
        where.push(`event_occurred_at >= $${values.length}`);
      }
      if (query.to !== undefined) {
        values.push(new Date(query.to));
        where.push(`event_occurred_at <= $${values.length}`);
      }
      if (last !== undefined) {
        values.push(new Date(last.at), last.id);
        where.push(
          `(event_occurred_at < $${values.length - 1} OR (event_occurred_at = $${values.length - 1} AND id < $${values.length}))`,
        );
      }
      values.push(limit + 1);
      const result = await pool.query<EventRow>(
        `SELECT * FROM docker_operational_events WHERE ${where.join(" AND ")} ` +
          `ORDER BY event_occurred_at DESC, id DESC LIMIT $${values.length}`,
        values,
      );
      const rows = result.rows.slice(0, limit).map(rowToEvent);
      const hasMore = result.rows.length > limit;
      const tail = rows.length > 0 ? rows[rows.length - 1]! : undefined;
      return {
        data: rows,
        page: {
          limit,
          hasMore,
          nextCursor:
            hasMore && tail
              ? encodeDockerCursor({
                  v: 1,
                  vpsId: query.vpsId,
                  scope: "events",
                  agentInstanceId: query.agentInstanceId,
                  containerKey: query.containerKey,
                  filters: { action: query.action, from: query.from, to: query.to },
                  order: "eventOccurredAt,id",
                  last: { at: tail.eventOccurredAt, id: tail.id },
                })
              : undefined,
        },
      };
    },

    async listRollups(query: DockerRollupsQuery): Promise<DockerPage<DockerMetricRollup>> {
      const limit = query.limit ?? 100;
      const binding = {
        vpsId: query.vpsId,
        scope: "rollups" as const,
        agentInstanceId: query.agentInstanceId,
        containerKey: query.containerKey,
        filters: { scope: query.scope },
        order: "bucketStart,id" as const,
      };
      let last: { at: string; id: string } | undefined;
      if (query.cursor !== undefined) {
        const decoded = decodeDockerCursor(query.cursor);
        assertDockerCursorBinding(decoded, binding);
        last = decoded.last;
      }
      const values: unknown[] = [query.vpsId];
      const where: string[] = ["vps_id = $1"];
      if (query.agentInstanceId !== undefined) {
        values.push(query.agentInstanceId);
        where.push(`agent_instance_id = $${values.length}`);
      }
      if (query.scope !== undefined) {
        values.push(query.scope);
        where.push(`scope = $${values.length}`);
      }
      if (query.containerKey !== undefined) {
        values.push(query.containerKey);
        where.push(`container_key = $${values.length}`);
      }
      if (last !== undefined) {
        values.push(new Date(last.at), last.id);
        where.push(
          `(bucket_start < $${values.length - 1} OR (bucket_start = $${values.length - 1} AND id < $${values.length}))`,
        );
      }
      values.push(limit + 1);
      const result = await pool.query<RollupRow>(
        `SELECT * FROM docker_metric_rollups WHERE ${where.join(" AND ")} ` +
          `ORDER BY bucket_start DESC, id DESC LIMIT $${values.length}`,
        values,
      );
      const rows = result.rows.slice(0, limit).map(rowToRollup);
      const hasMore = result.rows.length > limit;
      const tail = rows.length > 0 ? rows[rows.length - 1]! : undefined;
      return {
        data: rows,
        page: {
          limit,
          hasMore,
          nextCursor:
            hasMore && tail
              ? encodeDockerCursor({
                  v: 1,
                  vpsId: query.vpsId,
                  scope: "rollups",
                  agentInstanceId: query.agentInstanceId,
                  containerKey: query.containerKey,
                  filters: { scope: query.scope },
                  order: "bucketStart,id",
                  last: { at: tail.bucketStart, id: tail.id },
                })
              : undefined,
        },
      };
    },

    async getStorageLatest(vpsId: string): Promise<DockerStorageLatest | undefined> {
      const result = await pool.query<StorageRow>(
        "SELECT * FROM docker_storage_latest WHERE vps_id = $1",
        [vpsId],
      );
      return result.rows[0] ? rowToStorage(result.rows[0]) : undefined;
    },

    async listAlerts(query: DockerAlertsQuery): Promise<DockerPage<DockerAlert>> {
      const limit = query.limit ?? 50;
      const binding = {
        vpsId: query.vpsId,
        scope: "alerts" as const,
        agentInstanceId: query.agentInstanceId,
        containerKey: query.containerKey,
        filters: { state: query.state, ruleKind: query.ruleKind, from: query.from, to: query.to },
        order: "lastObservedAt,id" as const,
      };
      let last: { at: string; id: string } | undefined;
      if (query.cursor !== undefined) {
        const decoded = decodeDockerCursor(query.cursor);
        assertDockerCursorBinding(decoded, binding);
        last = decoded.last;
      }
      const values: unknown[] = [query.vpsId];
      const where: string[] = ["vps_id = $1"];
      if (query.state !== undefined) {
        values.push(query.state);
        where.push(`state = $${values.length}`);
      }
      if (query.ruleKind !== undefined) {
        values.push(query.ruleKind);
        where.push(`rule_kind = $${values.length}`);
      }
      if (query.agentInstanceId !== undefined) {
        values.push(query.agentInstanceId);
        where.push(`agent_instance_id = $${values.length}`);
      }
      if (query.containerKey !== undefined) {
        values.push(query.containerKey);
        where.push(`container_key = $${values.length}`);
      }
      if (query.from !== undefined) {
        values.push(new Date(query.from));
        where.push(`COALESCE(last_observed_at, opened_at) >= $${values.length}`);
      }
      if (query.to !== undefined) {
        values.push(new Date(query.to));
        where.push(`COALESCE(last_observed_at, opened_at) <= $${values.length}`);
      }
      if (last !== undefined) {
        values.push(new Date(last.at), last.id);
        where.push(
          `(COALESCE(last_observed_at, opened_at) < $${values.length - 1} OR ` +
            `(COALESCE(last_observed_at, opened_at) = $${values.length - 1} AND id < $${values.length}))`,
        );
      }
      values.push(limit + 1);
      const result = await pool.query<AlertRow>(
        `SELECT * FROM docker_alerts WHERE ${where.join(" AND ")} ` +
          `ORDER BY COALESCE(last_observed_at, opened_at) DESC, id DESC LIMIT $${values.length}`,
        values,
      );
      const rows = result.rows.slice(0, limit).map(rowToAlert);
      const hasMore = result.rows.length > limit;
      const tail = rows.length > 0 ? rows[rows.length - 1]! : undefined;
      const tailAt = (a: DockerAlert): string => a.lastObservedAt ?? a.openedAt;
      return {
        data: rows,
        page: {
          limit,
          hasMore,
          nextCursor:
            hasMore && tail
              ? encodeDockerCursor({
                  v: 1,
                  vpsId: query.vpsId,
                  scope: "alerts",
                  agentInstanceId: query.agentInstanceId,
                  containerKey: query.containerKey,
                  filters: {
                    state: query.state,
                    ruleKind: query.ruleKind,
                    from: query.from,
                    to: query.to,
                  },
                  order: "lastObservedAt,id",
                  last: { at: tailAt(tail), id: tail.id },
                })
              : undefined,
        },
      };
    },

    async getWatermark(
      vpsId: string,
      agentInstanceId: string,
    ): Promise<DockerEventWatermark | undefined> {
      const result = await pool.query<WatermarkRow>(
        "SELECT * FROM docker_event_watermarks WHERE vps_id = $1 AND agent_instance_id = $2",
        [vpsId, agentInstanceId],
      );
      return result.rows[0] ? rowToWatermark(result.rows[0]) : undefined;
    },

    async getIngestBatch(
      vpsId: string,
      agentInstanceId: string,
      batchId: string,
    ): Promise<DockerIngestBatch | undefined> {
      const result = await pool.query<BatchRow>(
        "SELECT * FROM docker_ingest_batches WHERE vps_id = $1 AND agent_instance_id = $2 AND batch_id = $3",
        [vpsId, agentInstanceId, batchId],
      );
      return result.rows[0] ? rowToBatch(result.rows[0]) : undefined;
    },

    async ingestV2Unit(unit: DockerV2IngestUnit): Promise<DockerV2IngestResult> {
      return withTransaction(pool, async (client) => {
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [unit.vpsId]);
        const priorBatch = unit.batchId === undefined ? undefined : (await client.query<BatchRow>(
          "SELECT * FROM docker_ingest_batches WHERE vps_id=$1 AND agent_instance_id=$2 AND batch_id=$3",
          [unit.vpsId, unit.agentInstanceId, unit.batchId])).rows[0];
        if (priorBatch) {
          if (priorBatch.request_digest !== unit.requestDigest) throw new DockerIngestConflict("request_digest_mismatch");
          const parsed = typeof priorBatch.result === "string" ? JSON.parse(priorBatch.result) : priorBatch.result;
          return parsed as DockerV2IngestResult;
        }
        const snapshot = (await client.query<{ request_digest: string; result: unknown }>(
          "SELECT request_digest,result FROM docker_snapshot_ledger WHERE vps_id=$1 AND snapshot_id=$2",
          [unit.vpsId, unit.snapshotId])).rows[0];
        if (snapshot) {
          if (snapshot.request_digest !== unit.requestDigest) throw new DockerIngestConflict("request_digest_mismatch");
          return snapshot.result as DockerV2IngestResult;
        }
        const latest = (await client.query<{ active_instance_id:string; source_sequence:string; revision:string }>(
          "SELECT active_instance_id,source_sequence,revision FROM docker_ingest_latest WHERE vps_id=$1 FOR UPDATE", [unit.vpsId])).rows[0];
        const seq = BigInt(unit.sourceSequence);
        if (latest && latest.active_instance_id !== unit.agentInstanceId && seq <= BigInt(latest.source_sequence)) throw new DockerIngestConflict("active_instance_conflict");
        const revision = (latest ? BigInt(latest.revision) : 0n) + 1n;
        const received = new Date(unit.receivedAt);
        await client.query(`INSERT INTO docker_metric_samples (id,vps_id,agent_instance_id,snapshot_id,container_key,collected_at,received_at,effective_at,metrics,coverage) VALUES ($1,$2,$3,$4,NULL,$5,$6,$5,$7,$8) ON CONFLICT DO NOTHING`, [unit.hostSample.id, unit.vpsId, unit.agentInstanceId, unit.snapshotId, new Date(unit.hostSample.collectedAt), received, unit.hostSample.metrics, unit.hostSample.coverage ?? null]);
        for (const sample of unit.containerSamples ?? []) await client.query(`INSERT INTO docker_metric_samples (id,vps_id,agent_instance_id,snapshot_id,container_key,name,state,collected_at,received_at,effective_at,metrics,coverage) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$8,$10,$11) ON CONFLICT DO NOTHING`, [sample.id, unit.vpsId, unit.agentInstanceId, unit.snapshotId, sample.containerKey, sample.name ?? null, sample.state ?? null, new Date(sample.collectedAt), received, sample.metrics, sample.coverage ?? null]);
        for (const event of unit.events ?? []) await client.query(`INSERT INTO docker_operational_events (id,vps_id,agent_instance_id,container_key,action,event_occurred_at,received_at,event_digest,context_version,health_status,exit_code,signal,oom_killed) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1,$9,$10,$11,$12) ON CONFLICT DO NOTHING`, [event.id,unit.vpsId,unit.agentInstanceId,event.containerKey ?? null,event.action,new Date(event.eventOccurredAt),received,event.eventDigest,event.healthStatus ?? null,event.exitCode ?? null,event.signal ?? null,event.oomKilled ?? null]);
        if (unit.storageLatest) await client.query(`INSERT INTO docker_storage_latest (vps_id,agent_instance_id,snapshot_id,collected_at,received_at,images,containers,local_volumes,build_cache,formula_version) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1) ON CONFLICT (vps_id) DO UPDATE SET agent_instance_id=EXCLUDED.agent_instance_id,snapshot_id=EXCLUDED.snapshot_id,collected_at=EXCLUDED.collected_at,received_at=EXCLUDED.received_at,images=EXCLUDED.images,containers=EXCLUDED.containers,local_volumes=EXCLUDED.local_volumes,build_cache=EXCLUDED.build_cache`, [unit.vpsId,unit.agentInstanceId,unit.snapshotId,new Date(unit.storageLatest.collectedAt),received,unit.storageLatest.images,unit.storageLatest.containers,unit.storageLatest.localVolumes,unit.storageLatest.buildCache]);
        await client.query("INSERT INTO docker_ingest_latest (vps_id,active_instance_id,active_snapshot_id,source_sequence,received_at,updated_at,revision,compatibility) VALUES ($1,$2,$3,$4,$5,$5,$6,$7) ON CONFLICT (vps_id) DO UPDATE SET active_instance_id=EXCLUDED.active_instance_id,active_snapshot_id=EXCLUDED.active_snapshot_id,source_sequence=EXCLUDED.source_sequence,received_at=EXCLUDED.received_at,updated_at=EXCLUDED.updated_at,revision=EXCLUDED.revision,compatibility=EXCLUDED.compatibility", [unit.vpsId,unit.agentInstanceId,unit.snapshotId,unit.sourceSequence,received,revision,unit.compatibility]);
        const result: DockerV2IngestResult = {vpsId:unit.vpsId, ingestStatus:"committed", snapshotId:unit.snapshotId, agentInstanceId:unit.agentInstanceId, ...(unit.batchId ? {batchId:unit.batchId}:{}), receivedAt:unit.receivedAt, revision:Number(revision)};
        await client.query("INSERT INTO docker_snapshot_ledger (vps_id,snapshot_id,agent_instance_id,request_digest,source_sequence,received_at,result,revision) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [unit.vpsId,unit.snapshotId,unit.agentInstanceId,unit.requestDigest,unit.sourceSequence,received,result,revision]);
        if (unit.batchId) await client.query("INSERT INTO docker_ingest_batches (vps_id,agent_instance_id,batch_id,snapshot_id,request_digest,result) VALUES ($1,$2,$3,$4,$5,$6)", [unit.vpsId,unit.agentInstanceId,unit.batchId,unit.snapshotId,unit.requestDigest,JSON.stringify(result)]);
        return result;
      });
    },

    async pruneSamplesEventsAndStorage(
      options: DockerMonitoringMaintenanceOptions,
    ): Promise<DockerMonitoringMaintenanceResult> {
      assertMaintenanceOptions(options);
      return withTransaction(pool, async (client) => {
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
          "docker-monitoring-maintenance",
        ]);
        const cutoff = new Date(options.cutoff);
        const oldSamples = await client.query(
          "DELETE FROM docker_metric_samples WHERE effective_at < $1",
          [cutoff],
        );
        const overCapSamples = await client.query(
          `DELETE FROM docker_metric_samples AS s USING (
             SELECT id FROM (
               SELECT id, ROW_NUMBER() OVER (
                 PARTITION BY vps_id ORDER BY effective_at DESC, id DESC
               ) AS rn
               FROM docker_metric_samples WHERE effective_at >= $1
             ) ranked WHERE rn > $2
           ) AS overcap WHERE s.id = overcap.id`,
          [cutoff, options.samplesPerVps],
        );
        const oldEvents = await client.query(
          "DELETE FROM docker_operational_events WHERE event_occurred_at < $1",
          [cutoff],
        );
        const overCapEvents = await client.query(
          `DELETE FROM docker_operational_events AS e USING (
             SELECT id FROM (
               SELECT id, ROW_NUMBER() OVER (
                 PARTITION BY vps_id ORDER BY event_occurred_at DESC, id DESC
               ) AS rn
               FROM docker_operational_events WHERE event_occurred_at >= $1
             ) ranked WHERE rn > $2
           ) AS overcap WHERE e.id = overcap.id`,
          [cutoff, options.eventsPerVps],
        );
        // Latest state (docker_storage_latest, docker_ingest_latest, watermarks,
        // ledgers, batches, rollups, alerts) is authoritative, not history;
        // preserve it.
        return {
          samplesRemoved: (oldSamples.rowCount ?? 0) + (overCapSamples.rowCount ?? 0),
          eventsRemoved: (oldEvents.rowCount ?? 0) + (overCapEvents.rowCount ?? 0),
        };
      });
    },

    async cleanupForVps(cleanup: DockerMonitoringCleanup): Promise<void> {
      await withTransaction(pool, async (client) => {
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [cleanup.vpsId]);
        for (const table of ["docker_metric_samples","docker_metric_rollups","docker_operational_events","docker_storage_latest","docker_event_watermarks","docker_ingest_batches","docker_snapshot_ledger","docker_ingest_batch_results","docker_ingest_latest","docker_alerts"]) await client.query(`DELETE FROM ${table} WHERE vps_id=$1`, [cleanup.vpsId]);
      });
    },
  };
}
