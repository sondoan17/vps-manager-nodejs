import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createJsonDockerMonitoringRepository,
  seedDockerMonitoringForTests,
  type JsonDockerMonitoringRepository,
} from "../src/persistence/repositories/docker-monitoring.repository.js";
import type {
  DockerContainerSample,
  DockerHostSample,
  DockerOperationalEvent,
} from "../src/docker/docker-monitoring.models.js";

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

function containerSample(id: string, vpsId: string, effectiveAt: string): DockerContainerSample {
  return { ...sample(id, vpsId, effectiveAt), containerKey: "ck1" };
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

describe("docker monitoring JSON maintenance (I3 slice)", () => {
  let dir = "";
  let file = "";

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "docker-monitoring-maint-"));
    file = join(dir, "store.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  function repo(): JsonDockerMonitoringRepository {
    return createJsonDockerMonitoringRepository(file);
  }

  const storageSeed = (t: string) => ({
    latestStorage: {
      "vps-a": {
        vpsId: "vps-a",
        agentInstanceId: "inst1",
        snapshotId: "snap-storage",
        collectedAt: t,
        receivedAt: t,
        formulaVersion: 1 as const,
        images: { supported: true, count: 1, totalBytes: 10 },
        containers: { supported: false, count: 0, totalBytes: 0 },
        localVolumes: { supported: false, count: 0, totalBytes: 0 },
        buildCache: { supported: false, count: 0, totalBytes: 0 },
      },
    },
  });

  it("records lastMaintenanceAt on the first successful run", async () => {
    const r = repo();
    await r.pruneSamplesEventsAndStorage({ cutoff: "2026-02-01T00:00:00.000Z", samplesPerVps: 5000, eventsPerVps: 10000 });
    const store = JSON.parse(await (await import("node:fs/promises")).readFile(file, "utf8")) as { lastMaintenanceAt?: string };
    expect(store.lastMaintenanceAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("preserves legacy metadata normalization and updates the timestamp on each run", async () => {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(file, JSON.stringify({ schemaVersion: 1, lastMaintenanceAt: "not-a-date", samples: [], events: [] }));
    const r = repo();
    await r.pruneSamplesEventsAndStorage({ cutoff: "2026-02-01T00:00:00.000Z", samplesPerVps: 5000, eventsPerVps: 10000 });
    const first = JSON.parse(await (await import("node:fs/promises")).readFile(file, "utf8")) as { lastMaintenanceAt?: string };
    expect(first.lastMaintenanceAt).not.toBe("not-a-date");
    await new Promise((resolve) => setTimeout(resolve, 2));
    await r.pruneSamplesEventsAndStorage({ cutoff: "2026-02-01T00:00:00.000Z", samplesPerVps: 5000, eventsPerVps: 10000 });
    const second = JSON.parse(await (await import("node:fs/promises")).readFile(file, "utf8")) as { lastMaintenanceAt?: string };
    expect(new Date(second.lastMaintenanceAt!).getTime()).toBeGreaterThanOrEqual(new Date(first.lastMaintenanceAt!).getTime());
  });

  it("prunes samples/events strictly before cutoff and preserves latest state", async () => {
    const r = repo();
    await seedDockerMonitoringForTests(file, {
      samples: [
        sample("old", "vps-a", "2026-01-01T00:00:00.000Z"),
        sample("new", "vps-a", "2026-03-01T00:00:00.000Z"),
        containerSample("cold", "vps-a", "2026-01-01T00:00:00.000Z"),
        sample("other-old", "vps-b", "2026-01-01T00:00:00.000Z"),
      ],
      events: [
        event("e-old", "vps-a", "2026-01-01T00:00:00.000Z"),
        event("e-new", "vps-a", "2026-03-01T00:00:00.000Z"),
      ],
      ...storageSeed("2026-03-01T00:00:00.000Z"),
    });
    const result = await r.pruneSamplesEventsAndStorage({
      cutoff: "2026-02-01T00:00:00.000Z",
      samplesPerVps: 5000,
      eventsPerVps: 10000,
    });
    expect(result).toEqual({ samplesRemoved: 3, rollupsRemoved: 0, eventsRemoved: 1, alertsRemoved: 0, storageMode: "json" });
    expect((await r.listHostSamples({ vpsId: "vps-a" })).data.map((s) => s.id)).toEqual(["new"]);
    expect((await r.listContainerSamples({ vpsId: "vps-a", agentInstanceId: "inst1", containerKey: "ck1" })).data).toEqual([]);
    expect((await r.listHostSamples({ vpsId: "vps-b" })).data).toEqual([]);
    expect((await r.listEvents({ vpsId: "vps-a" })).data.map((e) => e.id)).toEqual(["e-new"]);
    expect((await r.getStorageLatest("vps-a"))?.snapshotId).toBe("snap-storage");
  });

  it("enforces per-VPS newest-first caps after cutoff filtering", async () => {
    const r = repo();
    const at = (n: number) => `2026-03-${String(n).padStart(2, "0")}T00:00:00.000Z`;
    await seedDockerMonitoringForTests(file, {
      samples: [
        sample("a1", "vps-a", at(1)),
        sample("a2", "vps-a", at(2)),
        sample("a3", "vps-a", at(3)),
        sample("b1", "vps-b", at(1)),
        sample("b2", "vps-b", at(2)),
      ],
      events: [
        event("ea1", "vps-a", at(1)),
        event("ea2", "vps-a", at(2)),
        event("ea3", "vps-a", at(3)),
      ],
    });
    const result = await r.pruneSamplesEventsAndStorage({
      cutoff: "2026-01-01T00:00:00.000Z",
      samplesPerVps: 2,
      eventsPerVps: 1,
    });
    expect(result).toEqual({ samplesRemoved: 1, rollupsRemoved: 0, eventsRemoved: 2, alertsRemoved: 0, storageMode: "json" });
    expect((await r.listHostSamples({ vpsId: "vps-a" })).data.map((s) => s.id)).toEqual(["a3", "a2"]);
    expect((await r.listHostSamples({ vpsId: "vps-b" })).data.map((s) => s.id)).toEqual(["b2", "b1"]);
    expect((await r.listEvents({ vpsId: "vps-a" })).data.map((e) => e.id)).toEqual(["ea3"]);
  });

  it("repeated maintenance is idempotent and ingest still commits afterwards", async () => {
    const r = repo();
    await seedDockerMonitoringForTests(file, {
      samples: [sample("old", "vps-a", "2026-01-01T00:00:00.000Z"), sample("new", "vps-a", "2026-03-01T00:00:00.000Z")],
      events: [event("e-old", "vps-a", "2026-01-01T00:00:00.000Z")],
      ...storageSeed("2026-03-01T00:00:00.000Z"),
    });
    const options = { cutoff: "2026-02-01T00:00:00.000Z", samplesPerVps: 5000, eventsPerVps: 10000 };
    const first = await r.pruneSamplesEventsAndStorage(options);
    expect(first).toEqual({ samplesRemoved: 1, rollupsRemoved: 0, eventsRemoved: 1, alertsRemoved: 0, storageMode: "json" });
    const beforeSamples = (await r.listHostSamples({ vpsId: "vps-a" })).data;
    const beforeStorage = await r.getStorageLatest("vps-a");
    const second = await r.pruneSamplesEventsAndStorage(options);
    expect(second).toEqual({ samplesRemoved: 0, rollupsRemoved: 0, eventsRemoved: 0, alertsRemoved: 0, storageMode: "json" });
    expect((await r.listHostSamples({ vpsId: "vps-a" })).data).toEqual(beforeSamples);
    expect(await r.getStorageLatest("vps-a")).toEqual(beforeStorage);

    const receivedAt = "2026-03-02T00:00:00.000Z";
    const committed = await r.ingestV2Unit({
      vpsId: "vps-a",
      agentInstanceId: "inst1",
      snapshotId: "snap-after",
      requestDigest: "digest-after",
      requestDigestVersion: 1,
      receivedAt,
      sourceSequence: "100",
      compatibility: { latest: true },
      hostSample: sample("after", "vps-a", receivedAt),
    });
    expect(committed.ingestStatus).toBe("committed");
    expect((await r.listHostSamples({ vpsId: "vps-a" })).data.map((s) => s.id)).toContain("after");
  });

  it("rejects invalid maintenance options without mutating the store", async () => {
    const r = repo();
    await seedDockerMonitoringForTests(file, {
      samples: [sample("s1", "vps-a", "2026-03-01T00:00:00.000Z")],
      events: [event("e1", "vps-a", "2026-03-01T00:00:00.000Z")],
    });
    await expect(r.pruneSamplesEventsAndStorage({ cutoff: "not-a-date", samplesPerVps: 10, eventsPerVps: 10 })).rejects.toThrow(/cutoff/i);
    await expect(r.pruneSamplesEventsAndStorage({ cutoff: "2026-01-01T00:00:00.000Z", samplesPerVps: -1, eventsPerVps: 10 })).rejects.toThrow(/samplesPerVps/i);
    await expect(r.pruneSamplesEventsAndStorage({ cutoff: "2026-01-01T00:00:00.000Z", samplesPerVps: 10, eventsPerVps: 1.5 })).rejects.toThrow(/eventsPerVps/i);
    await expect(r.pruneSamplesEventsAndStorage({ cutoff: "2026-01-01T00:00:00.000Z", samplesPerVps: Number.NaN, eventsPerVps: 10 })).rejects.toThrow();
    expect((await r.listHostSamples({ vpsId: "vps-a" })).data.map((s) => s.id)).toEqual(["s1"]);
    expect((await r.listEvents({ vpsId: "vps-a" })).data.map((e) => e.id)).toEqual(["e1"]);
    const raw = JSON.parse(await (await import("node:fs/promises")).readFile(file, "utf8")) as { lastMaintenanceAt?: string };
    expect(raw.lastMaintenanceAt).toBeUndefined();
  });

  it("leaves the file byte-for-byte unchanged when maintenance exceeds its rewrite limit", async () => {
    // Objective: a refused maintenance rewrite must not persist pruning or lastMaintenanceAt.
    await seedDockerMonitoringForTests(file, { samples: [sample("s1", "vps-a", "2026-03-01T00:00:00.000Z")] });
    const before = await readFile(file);
    const limited = createJsonDockerMonitoringRepository(file, { maxBytes: 1 });

    // Arrange / Act / Assert
    await expect(limited.pruneSamplesEventsAndStorage({ cutoff: "2026-01-01T00:00:00.000Z", samplesPerVps: 10, eventsPerVps: 10 })).rejects.toThrow(/rewrite exceeds/i);
    expect(await readFile(file)).toEqual(before);
  });

  it("prunes a store larger than 8 MiB but within the 32 MiB store cap", async () => {
    // Objective: maintenance must rewrite and shrink a valid 8–32 MiB JSON store.
    const r = repo();
    const largeEvents = Array.from({ length: 10 }, (_, i) => ({
      ...event(`large-${i}`, "vps-a", "2026-01-01T00:00:00.000Z"),
      eventDigest: "x".repeat(900_000),
    }));
    await seedDockerMonitoringForTests(file, { events: largeEvents });
    expect((await stat(file)).size).toBeGreaterThan(8 * 1024 * 1024);
    expect((await stat(file)).size).toBeLessThanOrEqual(32 * 1024 * 1024);

    const result = await r.pruneSamplesEventsAndStorage({ cutoff: "2026-02-01T00:00:00.000Z", samplesPerVps: 5000, eventsPerVps: 10000 });
    expect(result.eventsRemoved).toBe(10);
    expect((await stat(file)).size).toBeLessThanOrEqual(32 * 1024 * 1024);
    expect((await r.listEvents({ vpsId: "vps-a" })).data).toEqual([]);
  });
});
