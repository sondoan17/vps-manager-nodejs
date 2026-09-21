import { describe, expect, it } from "vitest";
import { agentMetricPayloadSchema } from "../src/agents/agent.schemas.js";

// ── Docker Phase 1 I0 contract tests ─────────────────────────────────────
// Additive v2 contract only. No ingestion/capability/persistence wiring.
// V1 validation must remain byte-for-byte the pre-Phase-1 behavior.

function corePayload() {
  return {
    cpu: 10,
    memory: 20,
    disk: 30,
    loadAverage: 0.5,
    networkRx: 100,
    networkTx: 100,
    uptime: 60,
    collectedAt: new Date().toISOString(),
    agentVersion: "1.0.0",
  };
}

function validV1Docker(overrides: Record<string, unknown> = {}) {
  return {
    collectedAt: new Date().toISOString(),
    schemaVersion: 1 as const,
    available: true,
    containerTotal: 1,
    containerRunning: 1,
    cpuPercent: 5,
    memoryUsageBytes: 1024,
    networkRxBytes: 10,
    networkTxBytes: 10,
    blockReadBytes: 10,
    blockWriteBytes: 10,
    pids: 2,
    containers: [],
    ...overrides,
  };
}

function validV2Container(overrides: Record<string, unknown> = {}) {
  return {
    name: "/web-nginx",
    image: "nginx:1.25",
    status: "Up 3 hours",
    state: "running",
    containerKey: "ck_abc123",
    cpuPercent: 12.3,
    memoryUsageBytes: 65_536_000,
    networkRxBytes: 800_000,
    networkTxBytes: 400_000,
    blockReadBytes: 50_000,
    blockWriteBytes: 20_000,
    pids: 12,
    ...overrides,
  };
}

function validV2Docker(overrides: Record<string, unknown> = {}) {
  return {
    collectedAt: new Date().toISOString(),
    schemaVersion: 2 as const,
    agentInstanceId: "instance_abc123",
    snapshotId: "snap_abc123",
    sourceSequence: "1",
    batchId: "batch_abc123",
    available: true,
    containerTotal: 1,
    containerRunning: 1,
    cpuPercent: 5,
    memoryUsageBytes: 1024,
    networkRxBytes: 10,
    networkTxBytes: 10,
    blockReadBytes: 10,
    blockWriteBytes: 10,
    pids: 2,
    containers: [validV2Container()],
    sampledContainerAggregate: {
      coverage: { detailsSampled: 1, detailsTotalEligible: 1, complete: true },
      cpuPercent: 5,
      memoryUsageBytes: 1024,
      networkRxBytes: 10,
      networkTxBytes: 10,
      blockReadBytes: 10,
      blockWriteBytes: 10,
      pids: 2,
    },
    events: [
      {
        eventId: "evt_1",
        eventOccurredAt: new Date().toISOString(),
        containerKey: "ck_abc123",
        action: "die",
        context: { version: 1 as const, exitCode: 1, oomKilled: false },
      },
    ],
    eventWindow: { since: "1", until: "2", capped: false, lossy: false },
    fromWatermark: { timeNano: "1", boundaryDigests: [] },
    proposedWatermark: { timeNano: "2", boundaryDigests: [] },
    storage: {
      formulaVersion: 1 as const,
      images: { supported: true, count: 2, totalBytes: 1000, reclaimableSupported: false },
      containers: { supported: true, count: 1, totalBytes: 500, reclaimableBytes: 0 },
      localVolumes: { supported: false, count: 0, totalBytes: 0 },
      buildCache: { supported: false, count: 0, totalBytes: 0 },
    },
    ...overrides,
  };
}

describe("I0 v1 compatibility (literal v1 unchanged)", () => {
  it("accepts a minimal v1 docker branch under the v2 API", () => {
    const parsed = agentMetricPayloadSchema.parse({
      ...corePayload(),
      docker: validV1Docker(),
    });
    expect(parsed.docker?.schemaVersion).toBe(1);
  });

  it("accepts v1 engine metadata at exact cap lengths", () => {
    const parsed = agentMetricPayloadSchema.parse({
      ...corePayload(),
      docker: validV1Docker({
        engineVersion: "e".repeat(64),
        apiVersion: "a".repeat(64),
        os: "o".repeat(32),
        architecture: "x".repeat(32),
      }),
    });
    expect(parsed.docker?.schemaVersion).toBe(1);
  });

  it("still rejects v1 unknown fields, >20 containers, and over-limit metadata", () => {
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV1Docker({ extraField: "nope" }),
      }),
    ).toThrow();
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV1Docker({
          containers: Array.from({ length: 21 }, () => validV2Container()),
        }),
      }),
    ).toThrow();
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV1Docker({ engineVersion: "e".repeat(65) }),
      }),
    ).toThrow();
  });

  it("still enforces the v1 docker collectedAt -10m/+2m window", () => {
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV1Docker({
          collectedAt: new Date(Date.now() - 11 * 60_1000).toISOString(),
        }),
      }),
    ).toThrow();
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV1Docker({
          collectedAt: new Date(Date.now() + 3 * 60_1000).toISOString(),
        }),
      }),
    ).toThrow();
  });
});

describe("I0 v2 acceptance + strict unknown fields", () => {
  it("accepts a full bounded v2 snapshot/event/storage payload", () => {
    const parsed = agentMetricPayloadSchema.parse({
      ...corePayload(),
      docker: validV2Docker(),
    });
    expect(parsed.docker?.schemaVersion).toBe(2);
  });

  it("accepts a minimal v2 snapshot without optional branches", () => {
    const { sampledContainerAggregate, events, eventWindow, fromWatermark, proposedWatermark, batchId, storage, ...rest } =
      validV2Docker();
    void batchId;
    void sampledContainerAggregate;
    void events;
    void eventWindow;
    void fromWatermark;
    void proposedWatermark;
    void storage;
    const parsed = agentMetricPayloadSchema.parse({ ...corePayload(), docker: rest });
    expect(parsed.docker?.schemaVersion).toBe(2);
  });

  it("rejects unknown fields at every v2 nesting level", () => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ["top", { nope: 1 }],
      ["container", { containers: [validV2Container({ nope: 1 })] }],
      [
        "aggregate",
        {
          sampledContainerAggregate: {
            coverage: { detailsSampled: 1, detailsTotalEligible: 1, complete: true },
            cpuPercent: 1,
            memoryUsageBytes: 1,
            networkRxBytes: 1,
            networkTxBytes: 1,
            blockReadBytes: 1,
            blockWriteBytes: 1,
            pids: 1,
            nope: 1,
          },
        },
      ],
      ["coverage", {
        sampledContainerAggregate: {
          coverage: { detailsSampled: 1, detailsTotalEligible: 1, complete: true, nope: 1 },
          cpuPercent: 1,
          memoryUsageBytes: 1,
          networkRxBytes: 1,
          networkTxBytes: 1,
          blockReadBytes: 1,
          blockWriteBytes: 1,
          pids: 1,
        },
      }],
      ["event", {
        events: [
          {
            eventId: "e1",
            eventOccurredAt: new Date().toISOString(),
            action: "die",
            context: { version: 1 as const, nope: 1 },
          },
        ],
      }],
      ["window", { eventWindow: { since: "1", until: "2", capped: false, lossy: false, nope: 1 } }],
      ["watermark", { fromWatermark: { timeNano: "1", boundaryDigests: [], nope: 1 } }],
      ["storage", {
        storage: {
          formulaVersion: 1 as const,
          images: { supported: true, count: 1, totalBytes: 1, nope: 1 },
          containers: { supported: false, count: 0, totalBytes: 0 },
          localVolumes: { supported: false, count: 0, totalBytes: 0 },
          buildCache: { supported: false, count: 0, totalBytes: 0 },
        },
      }],
    ];
    for (const [label, extra] of cases) {
      expect(
        () =>
          agentMetricPayloadSchema.parse({
            ...corePayload(),
            docker: validV2Docker(extra),
          }),
        label,
      ).toThrow();
    }
  });

  it("rejects an unknown schemaVersion discriminator", () => {
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV1Docker({ schemaVersion: 99 }),
      }),
    ).toThrow();
  });
});

describe("I0 privacy invariants: forbidden docker detail classes", () => {
  const forbiddenContainerFields = [
    ["env", { env: ["SECRET=1"] }],
    ["labels", { labels: { team: "x" } }],
    ["mounts", { mounts: [{ source: "/etc/passwd", destination: "/data" }] }],
    ["command", { command: "npm start" }],
    ["entrypoint", { entrypoint: "/bin/sh" }],
    ["args", { args: ["--password", "x"] }],
    ["logs", { logs: "some log output" }],
    ["secrets", { secrets: ["s3cr3t"] }],
    ["configs", { configs: ["cfg"] }],
    ["inspect", { inspect: { Id: "abc" } }],
  ] as Array<[string, Record<string, unknown>]>;

  it.each(forbiddenContainerFields)("rejects container field %s", (_label, extra) => {
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV2Docker({ containers: [validV2Container(extra)] }),
      }),
    ).toThrow();
  });

  it("rejects arbitrary event attributes and per-object storage details", () => {
    // Arbitrary extra event attribute.
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV2Docker({
          events: [
            {
              eventId: "e1",
              eventOccurredAt: new Date().toISOString(),
              action: "die",
              context: { version: 1 as const },
              attributes: { user: "root" },
            },
          ],
        }),
      }),
    ).toThrow();
    // Per-object storage details have no home in the aggregate contract.
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV2Docker({
          storage: {
            formulaVersion: 1 as const,
            images: { supported: true, count: 1, totalBytes: 1 },
            containers: { supported: false, count: 0, totalBytes: 0 },
            localVolumes: {
              supported: true,
              count: 1,
              totalBytes: 1,
              volumes: [{ name: "data", mountpoint: "/var/lib" }],
            },
            buildCache: { supported: false, count: 0, totalBytes: 0 },
          },
        }),
      }),
    ).toThrow();
    // Unknown event action and unversioned context are rejected.
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV2Docker({
          events: [
            {
              eventId: "e1",
              eventOccurredAt: new Date().toISOString(),
              action: "exec_start",
              context: { version: 1 as const },
            },
          ],
        }),
      }),
    ).toThrow();
  });
});

describe("I0 v2 caps and timestamps", () => {
  it("enforces 20-container, 100-event, and 256-digest caps", () => {
    const containers = Array.from({ length: 21 }, (_, i) =>
      validV2Container({ containerKey: `ck_${i}` }),
    );
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV2Docker({ containers }),
      }),
    ).toThrow();

    const events = Array.from({ length: 101 }, (_, i) => ({
      eventId: `evt_${i}`,
      eventOccurredAt: new Date().toISOString(),
      action: "die" as const,
      context: { version: 1 as const },
    }));
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV2Docker({ events }),
      }),
    ).toThrow();

    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV2Docker({
          proposedWatermark: {
            timeNano: "2",
            boundaryDigests: Array.from({ length: 257 }, (_, i) => `d${i}`),
          },
        }),
      }),
    ).toThrow();
  });

  it("enforces v2 collectedAt window, event ISO time, and watermark format", () => {
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV2Docker({
          collectedAt: new Date(Date.now() - 11 * 60_1000).toISOString(),
        }),
      }),
    ).toThrow();
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV2Docker({
          events: [
            {
              eventId: "e1",
              eventOccurredAt: "not-a-date",
              action: "die",
              context: { version: 1 as const },
            },
          ],
        }),
      }),
    ).toThrow();
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV2Docker({ fromWatermark: { timeNano: "-5", boundaryDigests: [] } }),
      }),
    ).toThrow();
  });

  it("requires agentInstanceId/snapshotId/containerKey and rejects bad ids", () => {
    const base = validV2Docker();
    for (const key of ["agentInstanceId", "snapshotId"] as const) {
      const { [key]: _dropped, ...rest } = base;
      void _dropped;
      expect(() =>
        agentMetricPayloadSchema.parse({ ...corePayload(), docker: rest }),
      ).toThrow();
    }
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV2Docker({ containers: [validV2Container({ containerKey: "has space!" })] }),
      }),
    ).toThrow();
  });

  it("rejects v2 gap payload without a typed gapReason enum value", () => {
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV2Docker({
          eventWindow: { since: "1", until: "2", capped: true, lossy: true, gapReason: "mystery" },
          events: [
            {
              eventId: "g1",
              eventOccurredAt: new Date().toISOString(),
              action: "stream_gap",
              context: { version: 1 as const, reason: "mystery" },
            },
          ],
        }),
      }),
    ).toThrow();
  });
});

describe("Gate 1 canonical flat plan contract (golden + protocol rules)", () => {
  // Cross-language golden object: flat top-level batch fields, canonical
  // decimal-string exact nanoseconds, identical field names in both
  // languages, contemporary 19-digit nanoseconds.
  function goldenV2Docker() {
    const since = "1767225590000000000";
    const until = "1767225620000000000";
    return {
      collectedAt: new Date().toISOString(),
      schemaVersion: 2 as const,
      agentInstanceId: "a".repeat(32),
      snapshotId: "b".repeat(64),
      sourceSequence: "1",
      batchId: "c".repeat(64),
      available: true,
      containerTotal: 2,
      containerRunning: 1,
      cpuPercent: 5,
      memoryUsageBytes: 1024,
      networkRxBytes: 10,
      networkTxBytes: 10,
      blockReadBytes: 10,
      blockWriteBytes: 10,
      pids: 2,
      containers: [validV2Container({ containerKey: "k".repeat(32) })],
      sampledContainerAggregate: {
        coverage: {
          detailsSampled: 1,
          detailsTotalEligible: 2,
          complete: false,
          cohortDigest: "d".repeat(64),
        },
        cpuPercent: 5,
        memoryUsageBytes: 1024,
        networkRxBytes: 10,
        networkTxBytes: 10,
        blockReadBytes: 10,
        blockWriteBytes: 10,
        pids: 2,
      },
      events: [
        {
          eventId: "e".repeat(128),
          eventOccurredAt: new Date().toISOString(),
          containerKey: "k".repeat(32),
          action: "die" as const,
          context: { version: 1 as const, exitCode: 137, oomKilled: true },
        },
        {
          eventId: "gap1",
          eventOccurredAt: new Date().toISOString(),
          action: "stream_gap" as const,
          context: {
            version: 1 as const,
            reason: "boundary_overflow" as const,
            skippedFromNano: since,
            skippedThroughNano: until,
            skippedCount: 3,
          },
        },
      ],
      eventWindow: { since, until, capped: true, lossy: true, gapReason: "boundary_overflow" as const },
      fromWatermark: { timeNano: since, boundaryDigests: ["f".repeat(64)] },
      proposedWatermark: { timeNano: until, boundaryDigests: [] },
      storage: {
        formulaVersion: 1 as const,
        images: { supported: true, count: 2, totalBytes: 1000, reclaimableSupported: false },
        containers: { supported: true, count: 1, totalBytes: 500, reclaimableBytes: 0 },
        localVolumes: { supported: false, count: 0, totalBytes: 0 },
        buildCache: { supported: false, count: 0, totalBytes: 0 },
      },
    };
  }

  it("accepts the canonical golden object with 19-digit nanoseconds", () => {
    const parsed = agentMetricPayloadSchema.parse({ ...corePayload(), docker: goldenV2Docker() });
    expect(parsed.docker?.schemaVersion).toBe(2);
    if (parsed.docker?.schemaVersion === 2) {
      expect(parsed.docker.eventWindow?.since).toBe("1767225590000000000");
      expect(parsed.docker.fromWatermark?.timeNano).toBe("1767225590000000000");
      expect(parsed.docker.proposedWatermark?.timeNano).toBe("1767225620000000000");
    }
  });

  it("rejects partial event batches (all-or-none protocol, batchId included)", () => {
    // A complete batch carries all five flat fields; the golden object has them.
    const complete = agentMetricPayloadSchema.parse({ ...corePayload(), docker: goldenV2Docker() });
    expect(complete.docker?.schemaVersion).toBe(2);
    // Empty branch (no event fields at all, batchId absent) is the minimal snapshot.
    const minimal = goldenV2Docker();
    for (const k of ["batchId", "events", "eventWindow", "fromWatermark", "proposedWatermark"] as const) {
      delete (minimal as Record<string, unknown>)[k];
    }
    const parsedMinimal = agentMetricPayloadSchema.parse({ ...corePayload(), docker: minimal });
    expect(parsedMinimal.docker?.schemaVersion).toBe(2);
    // Events without batchId is partial even when window/watermarks are present.
    const noBatch = goldenV2Docker();
    delete (noBatch as Record<string, unknown>).batchId;
    expect(() => agentMetricPayloadSchema.parse({ ...corePayload(), docker: noBatch })).toThrow();
    // batchId alone without the event branch is partial.
    const batchAlone = minimal;
    (batchAlone as Record<string, unknown>).batchId = "c".repeat(64);
    expect(() => agentMetricPayloadSchema.parse({ ...corePayload(), docker: batchAlone })).toThrow();
    // Events alone, without batchId/window/watermarks, is a partial batch.
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: validV2Docker({
          batchId: undefined,
          eventWindow: undefined,
          fromWatermark: undefined,
          proposedWatermark: undefined,
        }),
      }),
    ).toThrow();
    // Window alone without batchId/events/watermarks is also partial.
    const noEvents = goldenV2Docker();
    delete (noEvents as Record<string, unknown>).batchId;
    delete (noEvents as Record<string, unknown>).events;
    delete (noEvents as Record<string, unknown>).fromWatermark;
    delete (noEvents as Record<string, unknown>).proposedWatermark;
    expect(() => agentMetricPayloadSchema.parse({ ...corePayload(), docker: noEvents })).toThrow();
  });

  it("enforces since<until and canonical decimal-string nanoseconds", () => {
    const badWindow = (since: string, until: string) =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: goldenV2DockerWithWindow(since, until),
      });
    // Equal and inverted windows rejected (canonical ordering, no overflow).
    expect(() => badWindow("1767225620000000000", "1767225620000000000")).toThrow();
    expect(() => badWindow("1767225620000000000", "1767225590000000000")).toThrow();
    // Non-canonical nanos: leading zeros, empty, signs, >32 digits.
    for (const bad of ["01", "00", "-5", "", "1 ".trim() + " ", "1".repeat(33)]) {
      expect(() =>
        agentMetricPayloadSchema.parse({
          ...corePayload(),
          docker: validV2Docker({ fromWatermark: { timeNano: bad, boundaryDigests: [] } }),
        }),
      ).toThrow();
    }
    function goldenV2DockerWithWindow(since: string, until: string) {
      const g = goldenV2Docker();
      return {
        ...g,
        eventWindow: { ...g.eventWindow, since, until },
        fromWatermark: { timeNano: since, boundaryDigests: [] as string[] },
        proposedWatermark: { timeNano: until, boundaryDigests: [] as string[] },
      };
    }
  });

  it("enforces lossy/gapReason consistency", () => {
    const base = goldenV2Docker();
    // lossy=true without gapReason rejected.
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: {
          ...base,
          eventWindow: { since: base.eventWindow.since, until: base.eventWindow.until, capped: true, lossy: true },
        },
      }),
    ).toThrow();
    // lossy=false with gapReason rejected.
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: {
          ...base,
          eventWindow: {
            since: base.eventWindow.since,
            until: base.eventWindow.until,
            capped: false,
            lossy: false,
            gapReason: "boundary_overflow" as const,
          },
        },
      }),
    ).toThrow();
  });

  it("enforces safe watermark/window relations (since=S, until=U)", () => {
    const base = goldenV2Docker();
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: { ...base, fromWatermark: { timeNano: "1", boundaryDigests: [] as string[] } },
      }),
    ).toThrow();
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: { ...base, proposedWatermark: { timeNano: "1", boundaryDigests: [] as string[] } },
      }),
    ).toThrow();
  });

  it.each([
    "boundary_overrun_abandoned",
    "response_oversize",
    "collection_deadline",
  ] as const)(
    "abandonment-through-U reason %s requires proposed==until",
    (gapReason) => {
      const base = goldenV2Docker();
      const since = base.eventWindow.since as string;
      const until = base.eventWindow.until as string;
      const mid = "1767225605000000000";
      // Intermediate proposed (since < proposed < until) is rejected.
      expect(
        () =>
          agentMetricPayloadSchema.parse({
            ...corePayload(),
            docker: {
              ...base,
              eventWindow: { since, until, capped: true, lossy: true, gapReason },
              fromWatermark: { timeNano: since, boundaryDigests: [] as string[] },
              proposedWatermark: { timeNano: mid, boundaryDigests: [] as string[] },
            },
          }),
        `${gapReason} partial`,
      ).toThrow();
      // Equality (proposed==until) is accepted.
      const parsed = agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: {
          ...base,
          eventWindow: { since, until, capped: true, lossy: true, gapReason },
          fromWatermark: { timeNano: since, boundaryDigests: [] as string[] },
          proposedWatermark: { timeNano: until, boundaryDigests: [] as string[] },
        },
      });
      expect(parsed.docker?.schemaVersion).toBe(2);
    },
  );

  it("allows partial proposed<until for boundary_overflow and capped non-lossy batches", () => {
    const base = goldenV2Docker();
    const since = base.eventWindow.since as string;
    const until = base.eventWindow.until as string;
    const mid = "1767225605000000000";
    // Partial boundary_overflow (lossy cap-boundary progress) stays accepted.
    const partialOverflow = agentMetricPayloadSchema.parse({
      ...corePayload(),
      docker: {
        ...base,
        eventWindow: { since, until, capped: true, lossy: true, gapReason: "boundary_overflow" as const },
        fromWatermark: { timeNano: since, boundaryDigests: [] as string[] },
        proposedWatermark: { timeNano: mid, boundaryDigests: [] as string[] },
      },
    });
    expect(partialOverflow.docker?.schemaVersion).toBe(2);
    // Partial capped non-lossy complete-boundary batch stays accepted.
    const { gapReason: _dropped, ...cappedWindow } = {
      since,
      until,
      capped: true,
      lossy: false,
      gapReason: "boundary_overflow" as const,
    };
    void _dropped;
    const partialCapped = agentMetricPayloadSchema.parse({
      ...corePayload(),
      docker: {
        ...base,
        eventWindow: { ...cappedWindow },
        fromWatermark: { timeNano: since, boundaryDigests: [] as string[] },
        proposedWatermark: { timeNano: mid, boundaryDigests: [] as string[] },
      },
    });
    expect(partialCapped.docker?.schemaVersion).toBe(2);
  });

  it("requires containerKey for container actions, allows host-scope omission", () => {
    const base = goldenV2Docker();
    // die without containerKey rejected.
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: {
          ...base,
          events: [
            {
              eventId: "e1",
              eventOccurredAt: new Date().toISOString(),
              action: "die" as const,
              context: { version: 1 as const },
            },
          ],
        },
      }),
    ).toThrow();
    // stream_gap and daemon_restarted may omit containerKey.
    for (const action of ["stream_gap", "daemon_restarted"] as const) {
      const parsed = agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: {
          ...base,
          events: [
            {
              eventId: `h_${action}`,
              eventOccurredAt: new Date().toISOString(),
              action,
              context: { version: 1 as const },
            },
          ],
        },
      });
      expect(parsed.docker?.schemaVersion).toBe(2);
    }
  });

  it("enforces exact ID/digest limits (32/64/128/64)", () => {
    const base = goldenV2Docker();
    // agentInstanceId/containerKey cap at 32; snapshot/batch at 64; event at 128; digest at 64.
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: { ...base, agentInstanceId: "a".repeat(33) },
      }),
    ).toThrow();
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: { ...base, snapshotId: "b".repeat(65) },
      }),
    ).toThrow();
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: { ...base, batchId: "c".repeat(65) },
      }),
    ).toThrow();
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: {
          ...base,
          events: [
            {
              eventId: "e".repeat(129),
              eventOccurredAt: new Date().toISOString(),
              containerKey: "k".repeat(32),
              action: "die" as const,
              context: { version: 1 as const },
            },
          ],
        },
      }),
    ).toThrow();
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: { ...base, fromWatermark: { timeNano: base.eventWindow.since, boundaryDigests: ["f".repeat(65)] } },
      }),
    ).toThrow();
    expect(() =>
      agentMetricPayloadSchema.parse({
        ...corePayload(),
        docker: {
          ...base,
          sampledContainerAggregate: {
            ...base.sampledContainerAggregate,
            coverage: { ...base.sampledContainerAggregate.coverage, cohortDigest: "d".repeat(65) },
          },
        },
      }),
    ).toThrow();
  });

  it("requires top-level host aggregates and keeps sampled aggregate optional", () => {
    const base = goldenV2Docker();
    // Host aggregate is required: dropping cpuPercent fails.
    const { cpuPercent: _dropped, ...withoutHost } = base;
    void _dropped;
    expect(() => agentMetricPayloadSchema.parse({ ...corePayload(), docker: withoutHost })).toThrow();
    // Sampled aggregate is optional: dropping it still validates.
    const { sampledContainerAggregate: _s, ...withoutSampled } = base;
    void _s;
    const parsed = agentMetricPayloadSchema.parse({ ...corePayload(), docker: withoutSampled });
    expect(parsed.docker?.schemaVersion).toBe(2);
  });
});
