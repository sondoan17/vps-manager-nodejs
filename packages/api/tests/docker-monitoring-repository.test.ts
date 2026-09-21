import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createJsonDockerMonitoringRepository,
  seedDockerMonitoringForTests,
  type DockerMonitoringRepository,
} from "../src/persistence/repositories/docker-monitoring.repository.js";
import {
  decodeDockerCursor,
  dockerAlertsQuerySchema,
  dockerContainerHistoryQuerySchema,
  dockerEventsQuerySchema,
  dockerHostHistoryQuerySchema,
  encodeDockerCursor,
} from "../src/docker/docker-monitoring.schemas.js";
import type {
  DockerAlert,
  DockerContainerSample,
  DockerHostSample,
  DockerMetricRollup,
  DockerOperationalEvent,
} from "../src/docker/docker-monitoring.models.js";

// ── Shared conformance factory (reusable by later PostgreSQL tests) ──────
// JSON is the I1 backend. A future postgres repository can reuse
// `conformanceSuite(makeRepo)` with the same semantics.

function sample(id: string, vpsId: string, effectiveAt: string, extra: Record<string, unknown> = {}): DockerHostSample {
  return {
    id,
    vpsId,
    agentInstanceId: "inst1",
    snapshotId: `snap_${id}`,
    collectedAt: effectiveAt,
    receivedAt: effectiveAt,
    effectiveAt,
    metrics: { cpu: 1 },
    ...extra,
  };
}

function containerSample(id: string, vpsId: string, effectiveAt: string, agentInstanceId = "inst1", containerKey = "ck1"): DockerContainerSample {
  return { ...sample(id, vpsId, effectiveAt), agentInstanceId, containerKey };
}

function event(id: string, vpsId: string, at: string, extra: Partial<DockerOperationalEvent> = {}): DockerOperationalEvent {
  return {
    id,
    vpsId,
    agentInstanceId: "inst1",
    action: "die",
    eventOccurredAt: at,
    receivedAt: at,
    eventDigest: `digest_${id}`,
    contextVersion: 1,
    ...extra,
  };
}

function alert(id: string, vpsId: string, openedAt: string, extra: Partial<DockerAlert> = {}): DockerAlert {
  return {
    id,
    vpsId,
    ruleKind: "container_cpu_high",
    state: "open",
    fingerprint: `fp_${id}`,
    openedAt,
    occurrences: 1,
    summary: "s",
    contextVersion: 1,
    ...extra,
  };
}

export type DockerMonitoringConformanceSeed = Parameters<typeof seedDockerMonitoringForTests>[1];

export function conformanceSuite(
  makeRepo: () => DockerMonitoringRepository | Promise<DockerMonitoringRepository>,
  seedRepo: (repo: DockerMonitoringRepository, seed: DockerMonitoringConformanceSeed) => Promise<void>,
) {
  return () => {
    const seedFor = (repo: DockerMonitoringRepository, seed: DockerMonitoringConformanceSeed) => seedRepo(repo, seed);

    it("empty file yields empty reads, no cursors, storage/watermark/batch undefined", async () => {
      const repo = await makeRepo();
      expect((await repo.listHostSamples({ vpsId: "vps-a" })).data).toEqual([]);
      expect((await repo.listHostSamples({ vpsId: "vps-a" })).page.hasMore).toBe(false);
      expect((await repo.listContainerSamples({ vpsId: "vps-a", agentInstanceId: "i", containerKey: "c" })).data).toEqual([]);
      expect((await repo.listEvents({ vpsId: "vps-a" })).data).toEqual([]);
      expect((await repo.listRollups({ vpsId: "vps-a" })).data).toEqual([]);
      expect((await repo.listAlerts({ vpsId: "vps-a" })).data).toEqual([]);
      expect(await repo.getStorageLatest("vps-a")).toBeUndefined();
      expect(await repo.getWatermark("vps-a", "i")).toBeUndefined();
      expect(await repo.getIngestBatch("vps-a", "i", "b")).toBeUndefined();
    });

    it("scoped reads isolate VPSs; container scope requires exact instance+key", async () => {
      const repo = await makeRepo();
      const t = new Date().toISOString();
      await seedFor(repo, {
        samples: [
          sample("h1", "vps-a", t),
          containerSample("c1", "vps-a", t, "inst1", "ck1"),
          containerSample("c2", "vps-a", t, "inst2", "ck1"),
          containerSample("c3", "vps-b", t, "inst1", "ck1"),
        ],
      });
      expect((await repo.listHostSamples({ vpsId: "vps-a" })).data.map((s) => s.id)).toEqual(["h1"]);
      expect((await repo.listHostSamples({ vpsId: "vps-b" })).data).toEqual([]);
      expect((await repo.listContainerSamples({ vpsId: "vps-a", agentInstanceId: "inst1", containerKey: "ck1" })).data.map((s) => s.id)).toEqual(["c1"]);
      expect((await repo.listContainerSamples({ vpsId: "vps-a", agentInstanceId: "inst2", containerKey: "ck1" })).data.map((s) => s.id)).toEqual(["c2"]);
    });

    it("orders newest-first with stable (at,id) tiebreak", async () => {
      const repo = await makeRepo();
      const t = "2026-09-01T00:00:00.000Z";
      await seedFor(repo, {
        samples: [sample("a", "vps-a", t), sample("b", "vps-a", t), sample("c", "vps-a", "2026-09-02T00:00:00.000Z")],
      });
      const ids = (await repo.listHostSamples({ vpsId: "vps-a" })).data.map((s) => s.id);
      expect(ids).toEqual(["c", "b", "a"]);
    });

    it("cursor pagination walks the full set; tamper/cross-VPS/filter mismatch rejected", async () => {
      const repo = await makeRepo();
      const t = "2026-09-01T00:00:00.000Z";
      const samples = Array.from({ length: 5 }, (_, i) => sample(`s${i}`, "vps-a", `2026-09-0${i + 1}T00:00:00.000Z`));
      await seedFor(repo, { samples });
      void t;
      const first = await repo.listHostSamples({ vpsId: "vps-a", limit: 2 });
      expect(first.data.map((s) => s.id)).toEqual(["s4", "s3"]);
      expect(first.page.hasMore).toBe(true);
      expect(first.page.nextCursor).toBeDefined();
      const second = await repo.listHostSamples({ vpsId: "vps-a", limit: 2, cursor: first.page.nextCursor });
      expect(second.data.map((s) => s.id)).toEqual(["s2", "s1"]);
      const third = await repo.listHostSamples({ vpsId: "vps-a", limit: 2, cursor: second.page.nextCursor });
      expect(third.data.map((s) => s.id)).toEqual(["s0"]);
      expect(third.page.hasMore).toBe(false);
      expect(third.page.nextCursor).toBeUndefined();

      await expect(repo.listHostSamples({ vpsId: "vps-a", limit: 2, cursor: "!!!not-base64!!!" })).rejects.toThrow();
      const cross = first.page.nextCursor!;
      const decoded = decodeDockerCursor(cross);
      const rebound = encodeDockerCursor({ ...decoded, vpsId: "vps-b" });
      await expect(repo.listHostSamples({ vpsId: "vps-a", limit: 2, cursor: rebound })).rejects.toThrow();
      // Host-scope cursor reused on the events list must be rejected (scope binding).
      await expect(repo.listEvents({ vpsId: "vps-a", cursor: cross })).rejects.toThrow();
    });

    it("latest storage round-trips per VPS without leakage", async () => {
      const repo = await makeRepo();
      const t = new Date().toISOString();
      await seedFor(repo, {
        latestStorage: {
          "vps-a": {
            vpsId: "vps-a", agentInstanceId: "inst1", snapshotId: "snap1",
            collectedAt: t, receivedAt: t, formulaVersion: 1,
            images: { supported: true, count: 1, totalBytes: 10 },
            containers: { supported: false, count: 0, totalBytes: 0 },
            localVolumes: { supported: false, count: 0, totalBytes: 0 },
            buildCache: { supported: false, count: 0, totalBytes: 0 },
          },
        },
      });
      expect((await repo.getStorageLatest("vps-a"))?.snapshotId).toBe("snap1");
      expect(await repo.getStorageLatest("vps-b")).toBeUndefined();
    });

    it("no cross-VPS leakage across events/alerts/watermarks/batches", async () => {
      const repo = await makeRepo();
      const t = new Date().toISOString();
      await seedFor(repo, {
        events: [event("e1", "vps-a", t)],
        alerts: [alert("a1", "vps-a", t)],
        watermarks: [{ vpsId: "vps-a", agentInstanceId: "inst1", timeNano: "5", boundaryDigests: [], updatedAt: t }],
        batches: [{ vpsId: "vps-a", agentInstanceId: "inst1", batchId: "b1", snapshotId: "s1", requestDigest: "d", result: "ok" }],
      });
      expect((await repo.listEvents({ vpsId: "vps-b" })).data).toEqual([]);
      expect((await repo.listAlerts({ vpsId: "vps-b" })).data).toEqual([]);
      expect(await repo.getWatermark("vps-b", "inst1")).toBeUndefined();
      expect(await repo.getIngestBatch("vps-b", "inst1", "b1")).toBeUndefined();
      expect(await repo.getWatermark("vps-a", "inst1")).toBeDefined();
      expect(await repo.getIngestBatch("vps-a", "inst1", "b1")).toBeDefined();
    });

  };
}


describe("docker monitoring repository (JSON, I1)", () => {
  let dir = "";

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "docker-monitoring-i1-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  function jsonRepo(): DockerMonitoringRepository {
    const unique = join(dir, `docker-monitoring-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    const repo = createJsonDockerMonitoringRepository(unique);
    (repo as unknown as { __testFile?: string }).__testFile = unique;
    return repo;
  }

  describe("shared conformance (JSON backend)", conformanceSuite(jsonRepo, async (repo, seed) => {
    const file = (repo as unknown as { __testFile?: string }).__testFile;
    if (!file) throw new Error("repo missing __testFile bridge");
    await seedDockerMonitoringForTests(file, seed);
  }));

  describe("JSON backend specifics", () => {
    it("resolves only active alerts for one VPS, persists metadata, and is idempotent", async () => {
      const repo = jsonRepo();
      const resolvedAt = "2026-09-20T12:34:56.000Z";
      await seedDockerMonitoringForTests((repo as unknown as { __testFile: string }).__testFile, {
        alerts: [
          alert("open", "vps-a", "2026-09-20T00:00:00.000Z"),
          alert("ack", "vps-a", "2026-09-20T00:01:00.000Z", { state: "acknowledged" }),
          alert("resolved", "vps-a", "2026-09-20T00:02:00.000Z", {
            state: "resolved",
            resolvedAt: "2026-09-19T00:00:00.000Z",
            resolutionReason: "vps_deleted",
          }),
          alert("other-vps", "vps-b", "2026-09-20T00:03:00.000Z"),
        ],
      });

      // Objective: active alerts transition with reason/timestamp, while resolved and other-VPS alerts do not.
      const firstCount = await repo.resolveActiveAlertsForVps("vps-a", "monitoring_disabled", resolvedAt);
      const first = (await repo.listAlerts({ vpsId: "vps-a" })).data;
      const other = (await repo.listAlerts({ vpsId: "vps-b" })).data;

      expect(firstCount).toBe(2);
      expect(first.find((a) => a.id === "open")).toMatchObject({ state: "resolved", resolvedAt, resolutionReason: "monitoring_disabled" });
      expect(first.find((a) => a.id === "ack")).toMatchObject({ state: "resolved", resolvedAt, resolutionReason: "monitoring_disabled" });
      expect(first.find((a) => a.id === "resolved")).toMatchObject({ state: "resolved", resolvedAt: "2026-09-19T00:00:00.000Z", resolutionReason: "vps_deleted" });
      expect(other.find((a) => a.id === "other-vps")?.state).toBe("open");

      // Repeating the operation must not rewrite resolved alerts or report them again.
      expect(await repo.resolveActiveAlertsForVps("vps-a", "vps_deleted", "2026-09-21T00:00:00.000Z")).toBe(0);
      expect((await repo.listAlerts({ vpsId: "vps-a" })).data.find((a) => a.id === "open")).toMatchObject({ resolvedAt, resolutionReason: "monitoring_disabled" });
    });

    it("missing file behaves as empty store", async () => {
      const repo = jsonRepo();
      const page = await repo.listHostSamples({ vpsId: "nope" });
      expect(page.data).toEqual([]);
      expect(page.page).toEqual({ limit: 100, hasMore: false, nextCursor: undefined });
    });

    it("to-only queries are accepted by schemas and normalize to [to-30d, to]", async () => {
      const { normalizeDockerDateRange, MAX_QUERY_RANGE_MS } = await import(
        "../src/docker/docker-monitoring.schemas.js"
      );
      // Old `to` alone must validate (normalization bounds it downstream).
      const parsed = dockerHostHistoryQuerySchema.parse({
        vpsId: "v",
        to: "2025-01-15T00:00:00.000Z",
      });
      expect(parsed.from).toBeUndefined();
      const normalized = normalizeDockerDateRange(parsed);
      expect(normalized.from).toBe(
        new Date(Date.parse("2025-01-15T00:00:00.000Z") - MAX_QUERY_RANGE_MS).toISOString(),
      );
      expect(normalized.to).toBe("2025-01-15T00:00:00.000Z");
      expect(() =>
        dockerEventsQuerySchema.parse({ vpsId: "v", to: "2025-01-15T00:00:00.000Z" }),
      ).not.toThrow();
      expect(() =>
        dockerAlertsQuerySchema.parse({ vpsId: "v", to: "2025-01-15T00:00:00.000Z" }),
      ).not.toThrow();
    });

    it("structurally invalid base64url cursors decode to controlled cursor errors", async () => {
      const badPayload = {
        v: 1,
        vpsId: "vps-a",
        scope: "host",
        filters: {},
        order: "effectiveAt,id",
        last: { at: "not-a-datetime", id: "!!!bad!!!" },
      };
      const badCursor = Buffer.from(JSON.stringify(badPayload), "utf8").toString("base64url");
      const repo = jsonRepo();
      await expect(repo.listHostSamples({ vpsId: "vps-a", cursor: badCursor })).rejects.toThrow(
        /malformed cursor|cursor/i,
      );
      await expect(repo.listEvents({ vpsId: "vps-a", cursor: badCursor })).rejects.toThrow(
        /malformed cursor|cursor/i,
      );
      await expect(repo.listAlerts({ vpsId: "vps-a", cursor: badCursor })).rejects.toThrow(
        /malformed cursor|cursor/i,
      );
    });

    it("schemas enforce limits and reject >30d ranges; event/alert container filters bind together", () => {
      expect(() => dockerHostHistoryQuerySchema.parse({ vpsId: "v", limit: 501 })).toThrow();
      expect(() => dockerEventsQuerySchema.parse({ vpsId: "v", limit: 201 })).toThrow();
      expect(() => dockerAlertsQuerySchema.parse({ vpsId: "v", limit: 201 })).toThrow();
      expect(() =>
        dockerHostHistoryQuerySchema.parse({ vpsId: "v", from: "2026-01-01T00:00:00.000Z", to: "2026-02-15T00:00:00.000Z" }),
      ).toThrow();
      expect(() =>
        dockerContainerHistoryQuerySchema.parse({ vpsId: "v", agentInstanceId: "i", containerKey: "c", from: "2026-01-01T00:00:00.000Z", to: "2026-03-01T00:00:00.000Z" }),
      ).toThrow();
      expect(() => dockerEventsQuerySchema.parse({ vpsId: "v", containerKey: "c" })).toThrow();
      expect(() => dockerAlertsQuerySchema.parse({ vpsId: "v", agentInstanceId: "i" })).toThrow();
      expect(dockerEventsQuerySchema.parse({ vpsId: "v" }).limit).toBe(50);
      expect(dockerHostHistoryQuerySchema.parse({ vpsId: "v" }).limit).toBe(100);
    });
  });
});
