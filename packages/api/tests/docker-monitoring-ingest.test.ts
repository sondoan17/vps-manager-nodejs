import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createJsonDockerMonitoringRepository, type DockerMonitoringRepository } from "../src/persistence/repositories/docker-monitoring.repository.js";
import { DockerIngestConflict, type DockerV2IngestUnit } from "../src/docker/docker-monitoring.models.js";

const t = (n: number) => `2026-01-01T00:00:${String(n).padStart(2, "0")}.000Z`;
function unit(n: string, o: Partial<DockerV2IngestUnit> = {}): DockerV2IngestUnit {
  const receivedAt = t(Number(n) % 60);
  return { vpsId: "v", agentInstanceId: "i", snapshotId: `s${n}`, requestDigest: `d${n}`, requestDigestVersion: 1, receivedAt, sourceSequence: n, compatibility: { latest: true }, hostSample: { id: `h${n}`, vpsId: "v", agentInstanceId: "i", snapshotId: `s${n}`, collectedAt: receivedAt, receivedAt, effectiveAt: receivedAt, metrics: { cpu: 1 } }, ...o };
}
function event(id: string, seq: string, digest = id) { return { id, vpsId: "v", agentInstanceId: "i", action: "start" as const, eventOccurredAt: t(Number(seq)), receivedAt: t(Number(seq)), eventDigest: digest, contextVersion: 1 as const, sourceSequence: seq }; }
function batch(n: string, o: Partial<DockerV2IngestUnit> = {}) { return unit(n, { batchId: `b${n}`, events: [event(`e${n}`, n)], eventProtocol: { fromWatermark: { vpsId: "v", agentInstanceId: "i", timeNano: String(Number(n) - 1), boundaryDigests: [], updatedAt: t(Number(n) - 1) }, proposedWatermark: { vpsId: "v", agentInstanceId: "i", timeNano: n, boundaryDigests: [], updatedAt: t(Number(n)) }, eventWindow: { from: String(Number(n) - 1), to: n } }, ...o }); }

describe("Docker JSON I3 ingest", () => {
  let dir: string; let repo: DockerMonitoringRepository;
  beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), "dm-i3-")); repo = createJsonDockerMonitoringRepository(join(dir, "store.json")); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

  it("commits eventless units, exact replays, and rejects snapshot digest changes without mutation", async () => {
    const a = unit("1"); expect((await repo.ingestV2Unit(a)).ingestStatus).toBe("committed");
    expect((await repo.ingestV2Unit(a)).ingestStatus).toBe("already_committed");
    const before = (await repo.listHostSamples({ vpsId: "v" })).data;
    await expect(repo.ingestV2Unit({ ...a, requestDigest: "changed" })).rejects.toMatchObject({ code: "snapshot_conflict" });
    expect((await repo.listHostSamples({ vpsId: "v" })).data).toEqual(before);
  });
  it("commits watermark batches, replays them, and applies CAS conflicts atomically", async () => {
    const a = batch("1"); expect((await repo.ingestV2Unit(a)).committedWatermark?.timeNano).toBe("1");
    const replay = await repo.ingestV2Unit(a); expect(replay.ingestStatus).toBe("already_committed");
    const before = (await repo.listEvents({ vpsId: "v" })).data;
    await expect(repo.ingestV2Unit({ ...batch("2"), requestDigest: "x", eventProtocol: { ...batch("2").eventProtocol!, fromWatermark: { vpsId: "v", agentInstanceId: "i", timeNano: "0", boundaryDigests: [], updatedAt: t(0) } } })).rejects.toMatchObject({ code: "watermark_conflict" });
    expect((await repo.listEvents({ vpsId: "v" })).data).toEqual(before);
    await expect(repo.ingestV2Unit({ ...a, requestDigest: "other" })).rejects.toBeInstanceOf(DockerIngestConflict);
  });
  it("deduplicates events, preserves storage on omission, and orders latest by sequence", async () => {
    const storage = { vpsId: "v", agentInstanceId: "i", snapshotId: "st", collectedAt: t(1), receivedAt: t(1), formulaVersion: 1 as const, images: { supported: true, count: 1, totalBytes: 1 }, containers: { supported: false, count: 0, totalBytes: 0 }, localVolumes: { supported: false, count: 0, totalBytes: 0 }, buildCache: { supported: false, count: 0, totalBytes: 0 } };
    await repo.ingestV2Unit(batch("3", { storageLatest: storage }));
    await repo.ingestV2Unit(batch("4", { events: [event("e3", "4")] }));
    expect((await repo.listEvents({ vpsId: "v" })).data).toHaveLength(2);
    expect((await repo.getStorageLatest("v"))?.snapshotId).toBe("st");
    await expect(repo.ingestV2Unit(unit("2"))).resolves.toMatchObject({ ingestStatus: "replay_ignored" });
  });
  it("handles instance transitions and old-instance retries", async () => {
    await repo.ingestV2Unit(unit("10"));
    await expect(repo.ingestV2Unit(unit("9", { agentInstanceId: "old" }))).rejects.toMatchObject({ code: "active_instance_conflict" });
    await repo.ingestV2Unit(unit("11", { agentInstanceId: "new" }));
    await expect(repo.ingestV2Unit(unit("10", { agentInstanceId: "i" })).then(x => x.ingestStatus)).resolves.toBe("already_committed");
  });
  it("serializes concurrent commits and supports restart replay and cleanup", async () => {
    const a = unit("20"); const results = await Promise.all([repo.ingestV2Unit(a), repo.ingestV2Unit(a)]);
    expect(results.map(x => x.ingestStatus).sort()).toEqual(["already_committed", "committed"]);
    const restarted = createJsonDockerMonitoringRepository(join(dir, "store.json"));
    expect((await restarted.ingestV2Unit(a)).ingestStatus).toBe("already_committed");
    await restarted.cleanupForVps({ vpsId: "v", reason: "vps_deleted" });
    expect((await restarted.listHostSamples({ vpsId: "v" })).data).toEqual([]);
    expect(await restarted.getIngestBatch("v", "i", "b20")).toBeUndefined();
  });
});
