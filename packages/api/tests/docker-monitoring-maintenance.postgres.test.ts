import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import pg from "pg";
import { loadMigrations } from "../src/db/migrations.js";
import { createPostgresDockerMonitoringRepository } from "../src/persistence/repositories/docker-monitoring.postgres.repository.js";
import type {
  DockerHostSample,
  DockerOperationalEvent,
} from "../src/docker/docker-monitoring.models.js";

// PostgreSQL parity for the JSON maintenance contract
// (pruneSamplesEventsAndStorage): explicit cutoff + per-VPS newest-first caps,
// latest state preserved, transaction + advisory lock per repository
// conventions. No rollups/alerts/SSE/projections here.

function sample(id: string, vpsId: string, effectiveAt: string): DockerHostSample {
  return {
    id,
    vpsId,
    agentInstanceId: "inst1",
    snapshotId: `snap_${id}`,
    collectedAt: effectiveAt,
    receivedAt: effectiveAt,
    effectiveAt,
    metrics: { cpu: 1 },
  };
}

function event(id: string, vpsId: string, at: string): DockerOperationalEvent {
  return {
    id,
    vpsId,
    agentInstanceId: "inst1",
    action: "die",
    eventOccurredAt: at,
    receivedAt: at,
    eventDigest: `digest_${id}`,
    contextVersion: 1,
  };
}

// ── Static (fake pool, runs locally without a database) ─────────────────────

type RecordedQuery = { text: string; values: unknown[] };

function createFakeMaintenancePool(counts: {
  oldSamples: number;
  overCapSamples: number;
  oldEvents: number;
  overCapEvents: number;
  oldRollups?: number;
  oldAlerts?: number;
}) {
  const queries: RecordedQuery[] = [];
  const fakeClient = {
    async query(text: string, values: unknown[] = []) {
      queries.push({ text, values });
      if (text === "BEGIN" || text === "COMMIT" || text === "ROLLBACK") {
        return { rowCount: 0, rows: [] };
      }
      if (text.includes("pg_advisory_xact_lock")) return { rowCount: 0, rows: [] };
      if (text.startsWith("DELETE FROM docker_metric_samples WHERE")) {
        return { rowCount: counts.oldSamples, rows: [] };
      }
      if (text.startsWith("DELETE FROM docker_metric_samples AS s")) {
        return { rowCount: counts.overCapSamples, rows: [] };
      }
      if (text.startsWith("DELETE FROM docker_metric_rollups WHERE")) return { rowCount: counts.oldRollups ?? 0, rows: [] };
      if (text.startsWith("DELETE FROM docker_alerts WHERE")) return { rowCount: counts.oldAlerts ?? 0, rows: [] };
      if (text.startsWith("DELETE FROM docker_operational_events WHERE")) {
        return { rowCount: counts.oldEvents, rows: [] };
      }
      if (text.startsWith("DELETE FROM docker_operational_events AS e")) {
        return { rowCount: counts.overCapEvents, rows: [] };
      }
      throw new Error(`unexpected query: ${text}`);
    },
    release() {},
  };
  const pool = {
    async query(text: string, values: unknown[] = []) {
      queries.push({ text, values });
      return { rowCount: 0, rows: [] };
    },
    async connect() {
      return fakeClient;
    },
    async end() {},
  };
  return { pool: pool as never, queries };
}

describe("docker monitoring postgres maintenance (static, fake pool)", () => {
  it("rejects invalid options without issuing queries", async () => {
    const { pool, queries } = createFakeMaintenancePool({
      oldSamples: 0,
      overCapSamples: 0,
      oldEvents: 0,
      overCapEvents: 0,
    });
    const repo = createPostgresDockerMonitoringRepository(pool);
    await expect(
      repo.pruneSamplesEventsAndStorage({
        cutoff: "not-a-date",
        samplesPerVps: 10,
        eventsPerVps: 10,
      }),
    ).rejects.toThrow(/cutoff/i);
    await expect(
      repo.pruneSamplesEventsAndStorage({
        cutoff: "2026-01-01T00:00:00.000Z",
        samplesPerVps: -1,
        eventsPerVps: 10,
      }),
    ).rejects.toThrow(/samplesPerVps/i);
    await expect(
      repo.pruneSamplesEventsAndStorage({
        cutoff: "2026-01-01T00:00:00.000Z",
        samplesPerVps: 10,
        eventsPerVps: 1.5,
      }),
    ).rejects.toThrow(/eventsPerVps/i);
    expect(queries).toEqual([]);
  });

  it("locks, deletes strictly-before-cutoff then over-cap newest-first per VPS, and sums counts", async () => {
    const { pool, queries } = createFakeMaintenancePool({
      oldSamples: 3,
      overCapSamples: 1,
      oldEvents: 2,
      overCapEvents: 4,
    });
    const repo = createPostgresDockerMonitoringRepository(pool);
    const result = await repo.pruneSamplesEventsAndStorage({
      cutoff: "2026-02-01T00:00:00.000Z",
      samplesPerVps: 2,
      eventsPerVps: 1,
    });
    expect(result).toEqual({ samplesRemoved: 4, rollupsRemoved: 0, eventsRemoved: 6, alertsRemoved: 0, storageMode: "postgres" });

    const texts = queries.map((q) => q.text);
    expect(texts[0]).toBe("BEGIN");
    expect(texts[1]).toMatch(/pg_advisory_xact_lock/);
    // Cutoff deletes use strict < on the history timestamps.
    const cutoffDelete = queries.find((q) =>
      q.text.startsWith("DELETE FROM docker_metric_samples WHERE"),
    )!;
    expect(cutoffDelete.text).toContain("effective_at < $1");
    expect((cutoffDelete.values[0] as Date).toISOString()).toBe(
      "2026-02-01T00:00:00.000Z",
    );
    const eventCutoffDelete = queries.find((q) =>
      q.text.startsWith("DELETE FROM docker_operational_events WHERE"),
    )!;
    expect(eventCutoffDelete.text).toContain("event_occurred_at < $1");
    // Over-cap deletes keep newest-first per VPS via ROW_NUMBER partition.
    const capSamples = queries.find((q) =>
      q.text.startsWith("DELETE FROM docker_metric_samples AS s"),
    )!;
    expect(capSamples.text).toMatch(/PARTITION BY vps_id ORDER BY effective_at DESC, id DESC/);
    expect(capSamples.values).toEqual([new Date("2026-02-01T00:00:00.000Z"), 2]);
    const capEvents = queries.find((q) =>
      q.text.startsWith("DELETE FROM docker_operational_events AS e"),
    )!;
    expect(capEvents.text).toMatch(
      /PARTITION BY vps_id ORDER BY event_occurred_at DESC, id DESC/,
    );
    expect(capEvents.values).toEqual([new Date("2026-02-01T00:00:00.000Z"), 1]);
    expect(texts[texts.length - 1]).toBe("COMMIT");
    // Latest state tables are never touched.
    expect(texts.join("\n")).not.toMatch(/docker_storage_latest|docker_ingest_latest|docker_event_watermarks|docker_snapshot_ledger|docker_ingest_batches/);
  });
});

// ── Live PostgreSQL (gated by VPS_MANAGER_TEST_POSTGRES_URL) ────────────────

const databaseUrl = process.env.VPS_MANAGER_TEST_POSTGRES_URL;

describe("docker monitoring postgres maintenance (PostgreSQL)", () => {
  const admin = databaseUrl ? new pg.Pool({ connectionString: databaseUrl }) : undefined;
  const schema = `vps_manager_dm_maint_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  let pool: pg.Pool | undefined;
  let repo: ReturnType<typeof createPostgresDockerMonitoringRepository> | undefined;

  beforeAll(async () => {
    if (!databaseUrl || !admin) return;
    await admin.query(`CREATE SCHEMA "${schema}"`);
    pool = new pg.Pool({
      connectionString: databaseUrl,
      options: `-c search_path=${schema}`,
    });
    await pool.query(
      `CREATE TABLE vps (id text PRIMARY KEY, name text NOT NULL, host text NOT NULL, ` +
        `port integer NOT NULL, username text NOT NULL, created_at timestamptz NOT NULL, ` +
        `updated_at timestamptz NOT NULL)`,
    );
    const migrations = await loadMigrations();
    await pool.query(migrations.find((m) => m.id === "013_docker_monitoring.sql")!.sql);
    await pool.query(migrations.find((m) => m.id === "014_docker_ingest.sql")!.sql);
    repo = createPostgresDockerMonitoringRepository(pool as never);
  }, 30000);

  afterAll(async () => {
    await pool?.end().catch(() => undefined);
    await admin?.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    await admin?.end().catch(() => undefined);
  });

  beforeEach(async () => {
    if (!pool) return;
    for (const table of [
      "docker_metric_samples",
      "docker_metric_rollups",
      "docker_operational_events",
      "docker_storage_latest",
      "docker_event_watermarks",
      "docker_ingest_batches",
      "docker_snapshot_ledger",
      "docker_ingest_batch_results",
      "docker_ingest_latest",
      "docker_alerts",
      "vps",
    ]) {
      await pool.query(`DELETE FROM ${table}`);
    }
  });

  async function ensureVps(id: string): Promise<void> {
    await pool!.query(
      `INSERT INTO vps (id, name, host, port, username, created_at, updated_at) ` +
        `VALUES ($1, $1, 'host', 22, 'root', now(), now()) ON CONFLICT (id) DO NOTHING`,
      [id],
    );
  }

  async function seedSamples(rows: DockerHostSample[]): Promise<void> {
    for (const s of rows) {
      await ensureVps(s.vpsId);
      await pool!.query(
        `INSERT INTO docker_metric_samples ` +
          `(id, vps_id, agent_instance_id, snapshot_id, container_key, name, state, ` +
          `collected_at, received_at, effective_at, metrics, coverage) ` +
          `VALUES ($1,$2,$3,$4,NULL,NULL,NULL,$5,$5,$5,$6,NULL)`,
        [
          s.id,
          s.vpsId,
          s.agentInstanceId,
          s.snapshotId,
          new Date(s.effectiveAt),
          JSON.stringify(s.metrics ?? {}),
        ],
      );
    }
  }

  async function seedEvents(rows: DockerOperationalEvent[]): Promise<void> {
    for (const e of rows) {
      await ensureVps(e.vpsId);
      await pool!.query(
        `INSERT INTO docker_operational_events ` +
          `(id, vps_id, agent_instance_id, container_key, action, event_occurred_at, ` +
          `received_at, event_digest, context_version, health_status, exit_code, signal, oom_killed) ` +
          `VALUES ($1,$2,$3,NULL,$4,$5,$5,$6,1,NULL,NULL,NULL,NULL)`,
        [
          e.id,
          e.vpsId,
          e.agentInstanceId,
          e.action,
          new Date(e.eventOccurredAt),
          e.eventDigest,
        ],
      );
    }
  }

  it.skipIf(!databaseUrl)("prunes strictly before cutoff and preserves latest state", async () => {
    const t = "2026-03-01T00:00:00.000Z";
    await seedSamples([
      sample("old", "vps-a", "2026-01-01T00:00:00.000Z"),
      sample("new", "vps-a", t),
      sample("other-old", "vps-b", "2026-01-01T00:00:00.000Z"),
    ]);
    await seedEvents([
      event("e-old", "vps-a", "2026-01-01T00:00:00.000Z"),
      event("e-new", "vps-a", t),
    ]);
    await ensureVps("vps-a");
    await pool!.query(
      `INSERT INTO docker_storage_latest ` +
        `(vps_id, agent_instance_id, snapshot_id, collected_at, received_at, images, containers, ` +
        `local_volumes, build_cache, formula_version) ` +
        `VALUES ('vps-a','inst1','snap-storage',$1,$1,'{"supported":true,"count":1,"totalBytes":10}',` +
        `'{"supported":false,"count":0,"totalBytes":0}','{"supported":false,"count":0,"totalBytes":0}',` +
        `'{"supported":false,"count":0,"totalBytes":0}',1)`,
      [new Date(t)],
    );

    const result = await repo!.pruneSamplesEventsAndStorage({
      cutoff: "2026-02-01T00:00:00.000Z",
      samplesPerVps: 5000,
      eventsPerVps: 10000,
    });
    expect(result).toEqual({ samplesRemoved: 2, rollupsRemoved: 0, eventsRemoved: 1, alertsRemoved: 0, storageMode: "postgres" });
    expect((await repo!.listHostSamples({ vpsId: "vps-a" })).data.map((s) => s.id)).toEqual([
      "new",
    ]);
    expect((await repo!.listHostSamples({ vpsId: "vps-b" })).data).toEqual([]);
    expect((await repo!.listEvents({ vpsId: "vps-a" })).data.map((e) => e.id)).toEqual([
      "e-new",
    ]);
    expect((await repo!.getStorageLatest("vps-a"))?.snapshotId).toBe("snap-storage");
  });

  it.skipIf(!databaseUrl)("enforces per-VPS newest-first caps after cutoff filtering", async () => {
    const at = (n: number) => `2026-03-${String(n).padStart(2, "0")}T00:00:00.000Z`;
    await seedSamples([
      sample("a1", "vps-a", at(1)),
      sample("a2", "vps-a", at(2)),
      sample("a3", "vps-a", at(3)),
      sample("b1", "vps-b", at(1)),
      sample("b2", "vps-b", at(2)),
    ]);
    await seedEvents([
      event("ea1", "vps-a", at(1)),
      event("ea2", "vps-a", at(2)),
      event("ea3", "vps-a", at(3)),
    ]);

    const result = await repo!.pruneSamplesEventsAndStorage({
      cutoff: "2026-01-01T00:00:00.000Z",
      samplesPerVps: 2,
      eventsPerVps: 1,
    });
    expect(result).toEqual({ samplesRemoved: 1, rollupsRemoved: 0, eventsRemoved: 2, alertsRemoved: 0, storageMode: "postgres" });
    expect((await repo!.listHostSamples({ vpsId: "vps-a" })).data.map((s) => s.id)).toEqual([
      "a3",
      "a2",
    ]);
    expect((await repo!.listHostSamples({ vpsId: "vps-b" })).data.map((s) => s.id)).toEqual([
      "b2",
      "b1",
    ]);
    expect((await repo!.listEvents({ vpsId: "vps-a" })).data.map((e) => e.id)).toEqual(["ea3"]);
  });

  it.skipIf(!databaseUrl)("repeated maintenance is idempotent and rejects invalid options without mutation", async () => {
    await seedSamples([
      sample("old", "vps-a", "2026-01-01T00:00:00.000Z"),
      sample("new", "vps-a", "2026-03-01T00:00:00.000Z"),
    ]);
    await seedEvents([event("e-old", "vps-a", "2026-01-01T00:00:00.000Z")]);
    const options = {
      cutoff: "2026-02-01T00:00:00.000Z",
      samplesPerVps: 5000,
      eventsPerVps: 10000,
    };
    expect(await repo!.pruneSamplesEventsAndStorage(options)).toEqual({
      samplesRemoved: 1,
      rollupsRemoved: 0,
      eventsRemoved: 1,
      alertsRemoved: 0,
      storageMode: "postgres",
    });
    expect(await repo!.pruneSamplesEventsAndStorage(options)).toEqual({
      samplesRemoved: 0,
      rollupsRemoved: 0,
      eventsRemoved: 0,
      alertsRemoved: 0,
      storageMode: "postgres",
    });

    await expect(
      repo!.pruneSamplesEventsAndStorage({
        cutoff: "not-a-date",
        samplesPerVps: 10,
        eventsPerVps: 10,
      }),
    ).rejects.toThrow(/cutoff/i);
    await expect(
      repo!.pruneSamplesEventsAndStorage({
        cutoff: "2026-01-01T00:00:00.000Z",
        samplesPerVps: -1,
        eventsPerVps: 10,
      }),
    ).rejects.toThrow(/samplesPerVps/i);
    expect((await repo!.listHostSamples({ vpsId: "vps-a" })).data.map((s) => s.id)).toEqual([
      "new",
    ]);
  });
});
