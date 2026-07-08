import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AppConfig } from "../src/config/app-config.js";
import type { VpsRepository } from "../src/persistence/repositories/vps.repository.js";
import { createJsonAgentRepository } from "../src/persistence/repositories/agent.repository.js";
import { createJsonAuditRepository } from "../src/persistence/repositories/audit.repository.js";
import { createJsonJobRepository } from "../src/persistence/repositories/job.repository.js";
import { createJsonMetricRepository } from "../src/persistence/repositories/metric.repository.js";
import { createKeyService } from "../src/ssh/keyService.js";
import { createVpsStore } from "../src/persistence/store/vpsStore.js";
import { AgentService } from "../src/agents/agent.service.js";
import { isFreshTimestamp } from "../src/monitoring/monitoring.service.js";

const demoConfig: AppConfig = {
  mode: "demo",
  enableWebTerminal: false,
  allowPrivateNetworkTargets: false,
  dataDir: "data",
  privateDir: "private",
  rateLimitWindowMs: 60_000,
  rateLimitMax: 120,
  agentInstallIntervalSeconds: 1,
  allowInsecureAgentHttp: false,
  storageDriver: "json",
  dbSsl: false,
  dbPoolMax: 10,
  dashboardSessionTtlSeconds: 86_400,
  dashboardCookieSecure: false,
  dashboardCookieSameSite: "lax",
  dashboardSessionSecret: "test-secret",
  trustProxyHops: 0,
  jobHistoryLimit: 1000,
  auditHistoryLimit: 5000,
  metricWindowLimit: 120,
  sshHostKeyPins: {},
  sshHostKeyPolicy: "strict",
};

let tempDir: string;
let vpsRepo: VpsRepository;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "vps-manager-agent-"));
  vpsRepo = createVpsStore(join(tempDir, "data", "vps.json"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// ── Test helpers ────────────────────────────────────────────────────────

/** Create a VPS record and return its auto-generated id. */
async function createVps(): Promise<string> {
  const record = await vpsRepo.create({
    name: "test-vps",
    host: "10.0.0.1",
    port: 22,
    username: "root",
  });
  return record.id;
}

function makeService() {
  const agentRepo = createJsonAgentRepository(
    join(tempDir, "data", "agents.json"),
  );
  const metricRepo = createJsonMetricRepository(
    join(tempDir, "data", "metrics.json"),
  );
  const service = new AgentService(agentRepo, metricRepo, vpsRepo, demoConfig);
  return { agentRepo, metricRepo, service };
}

function app(overrides?: Partial<AppConfig>) {
  const config = { ...demoConfig, ...overrides };
  return createApp({
    config: {
      ...config,
      dataDir: join(tempDir, "data"),
      privateDir: join(tempDir, "private"),
    },
    store: vpsRepo,
    keys: createKeyService(join(tempDir, "private", "keys")),
    audit: createJsonAuditRepository(join(tempDir, "data", "audit.json")),
    jobs: createJsonJobRepository(join(tempDir, "data", "jobs.json")),
    metrics: createJsonMetricRepository(join(tempDir, "data", "metrics.json")),
    agent: createJsonAgentRepository(join(tempDir, "data", "agents.json")),
  });
}

function validPayload(overrides?: Record<string, unknown>) {
  return {
    cpu: 42,
    memory: 65,
    disk: 55,
    loadAverage: 1.5,
    networkRx: 100_000,
    networkTx: 50_000,
    uptime: 3600,
    collectedAt: new Date().toISOString(),
    agentVersion: "1.0.0",
    ...overrides,
  };
}

// ── VPS existence ───────────────────────────────────────────────────────

describe("VPS existence checks", () => {
  it("createCredential fails when VPS does not exist", async () => {
    const { service } = makeService();
    await expect(service.createCredential("nonexistent_vps")).rejects.toThrow(
      "VPS not found",
    );
  });

  it("createCredential succeeds when VPS exists", async () => {
    const vpsId = await createVps();
    const { service } = makeService();
    const result = await service.createCredential(vpsId);
    expect(result.credential.vpsId).toBe(vpsId);
    expect(result.token).toContain(result.credential.id);
  });

  it("ingestMetric fails when VPS deleted after credential creation", async () => {
    const vpsId = await createVps();
    const { service } = makeService();
    const { credential } = await service.createCredential(vpsId);
    // Delete the VPS
    await vpsRepo.delete(vpsId);
    // Ingest should now fail
    await expect(
      service.ingestMetric(credential, validPayload()),
    ).rejects.toThrow("VPS not found");
  });
});

// ── Token verification ──────────────────────────────────────────────────

describe("agent token verification", () => {
  it("generates unique token with correct format", async () => {
    const vpsId = await createVps();
    const { service, agentRepo } = makeService();
    const { credential, token } = await service.createCredential(vpsId);

    expect(token).toMatch(/^vma_[A-Za-z0-9_-]+_[a-f0-9]{64}$/);
    expect(token.startsWith("vma_" + credential.id + "_")).toBe(true);

    const stored = await agentRepo.getCredential(credential.id);
    expect(stored).toBeDefined();
    expect(stored!.vpsId).toBe(vpsId);
    expect(stored!.status).toBe("active");
  });

  it("stores only secret hash, not raw secret", async () => {
    const vpsId = await createVps();
    const { service, agentRepo } = makeService();
    const { credential, token } = await service.createCredential(vpsId);
    const secret = token.slice(token.lastIndexOf("_") + 1);

    const stored = await agentRepo.getCredential(credential.id);
    expect(stored!.secretHash).not.toBe(secret);

    const expectedHash = createHash("sha256").update(secret).digest("hex");
    expect(stored!.secretHash).toBe(expectedHash);
  });

  it("verifies bearer token successfully", async () => {
    const vpsId = await createVps();
    const { service } = makeService();
    const { token } = await service.createCredential(vpsId);

    const credential = await service.verifyBearerToken(`Bearer ${token}`);
    expect(credential.vpsId).toBe(vpsId);
    expect(credential.status).toBe("active");
  });

  it("rejects missing authorization header", async () => {
    const { service } = makeService();
    await expect(service.verifyBearerToken(undefined)).rejects.toThrow();
  });

  it("rejects invalid header format", async () => {
    const { service } = makeService();
    await expect(service.verifyBearerToken("NotBearer xyz")).rejects.toThrow();
  });

  it("rejects malformed token format", async () => {
    const { service } = makeService();
    await expect(
      service.verifyBearerToken("Bearer invalidtoken"),
    ).rejects.toThrow();
  });

  it("rejects revoked credential even with correct secret", async () => {
    const vpsId = await createVps();
    const { service } = makeService();
    const { credential, token } = await service.createCredential(vpsId);
    const secret = token.slice(token.lastIndexOf("_") + 1);

    await service.revokeCredential(credential.id);

    const reconstructedToken = `vma_${credential.id}_${secret}`;
    await expect(
      service.verifyBearerToken(`Bearer ${reconstructedToken}`),
    ).rejects.toThrow();
  });

  it("rejects token with wrong secret", async () => {
    const vpsId = await createVps();
    const { service } = makeService();
    const { credential } = await service.createCredential(vpsId);
    const wrongToken = `vma_${credential.id}_${"a".repeat(64)}`;
    await expect(
      service.verifyBearerToken(`Bearer ${wrongToken}`),
    ).rejects.toThrow();
  });

  it("rejects token for non-existent credential", async () => {
    const { service } = makeService();
    await expect(
      service.verifyBearerToken(
        "Bearer vma_nonexistent_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      ),
    ).rejects.toThrow();
  });
});

// ── Payload validation ──────────────────────────────────────────────────

describe("agent metric payload validation", () => {
  it("accepts valid payload via ingest", async () => {
    const vpsId = await createVps();
    const { service } = makeService();
    const { credential } = await service.createCredential(vpsId);

    const result = await service.ingestMetric(credential, validPayload());
    expect(result.sample.vpsId).toBe(vpsId);
    expect(result.sample.cpu).toBe(42);
    expect(result.sample.source).toBe("agent");
    expect(result.sample.receivedAt).toBeDefined();
    expect(result.config).toEqual({ dockerMetricsEnabled: false });
  });
});

// ── HTTP endpoint integration ───────────────────────────────────────────

describe("POST /api/agent/metrics", () => {
  let agentService: AgentService;
  let validToken: string;
  let credentialId: string;
  let vpsId: string;

  beforeEach(async () => {
    vpsId = await createVps();
    const { service } = makeService();
    agentService = service;
    const result = await agentService.createCredential(vpsId);
    validToken = result.token;
    credentialId = result.credential.id;
  });

  it("accepts valid metric payload and returns ok", async () => {
    const res = await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${validToken}`)
      .send(validPayload())
      .expect(201);

    expect(res.body.data).toEqual({
      ok: true,
      vpsId,
      receivedAt: expect.any(String),
      config: { dockerMetricsEnabled: false },
    });
  });

  it("rejects missing authorization header", async () => {
    const res = await request(app())
      .post("/api/agent/metrics")
      .send(validPayload())
      .expect(401);

    expect(res.body.error.message).toContain("Missing authorization");
  });

  it("rejects invalid bearer token", async () => {
    const res = await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", "Bearer invalid_token_format")
      .send(validPayload())
      .expect(401);

    expect(res.body.error.message).toContain("Invalid token");
  });

  it("rejects revoked token (correct secret, revoked credential)", async () => {
    // Revoke the credential first
    await agentService.revokeCredential(credentialId);
    const secret = validToken.slice(validToken.lastIndexOf("_") + 1);
    const correctToken = `vma_${credentialId}_${secret}`;

    const res = await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${correctToken}`)
      .send(validPayload())
      .expect(401);

    expect(res.body.error.message).toContain("Token has been revoked");
  });

  it("rejects payload with mismatched vpsId", async () => {
    const res = await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${validToken}`)
      .send(validPayload({ vpsId: "wrong_vps" }))
      .expect(401);

    expect(res.body.error.message).toContain("VPS ID mismatch");
  });

  it("rejects ingest when VPS was deleted", async () => {
    // Delete the VPS, then try to ingest
    await vpsRepo.delete(vpsId);

    const res = await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${validToken}`)
      .send(validPayload())
      .expect(404);

    expect(res.body.error.message).toContain("VPS not found");
  });

  describe("payload validation", () => {
    it("rejects cpu over 100", async () => {
      await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validPayload({ cpu: 150 }))
        .expect(400);
    });

    it("rejects negative memory", async () => {
      await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validPayload({ memory: -1 }))
        .expect(400);
    });

    it("rejects disk over 100", async () => {
      await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validPayload({ disk: 101 }))
        .expect(400);
    });

    it("rejects negative loadAverage", async () => {
      await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validPayload({ loadAverage: -0.5 }))
        .expect(400);
    });

    it("rejects too-old collectedAt", async () => {
      await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(
          validPayload({
            collectedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
          }),
        )
        .expect(400);
    });

    it("rejects too-future collectedAt", async () => {
      await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(
          validPayload({
            collectedAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          }),
        )
        .expect(400);
    });

    it("rejects missing agentVersion", async () => {
      await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validPayload({ agentVersion: "" }))
        .expect(400);
    });

    it("rejects NaN cpu", async () => {
      await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validPayload({ cpu: NaN }))
        .expect(400);
    });
  });

  describe("system info ingestion", () => {
    it("accepts valid payload with system info", async () => {
      const res = await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(
          validPayload({
            system: {
              os: {
                family: "linux",
                name: "Ubuntu",
                version: "22.04",
                prettyName: "Ubuntu 22.04.3 LTS",
              },
              kernel: {
                release: "5.15.0-91-generic",
                version: "#101-Ubuntu SMP",
                arch: "x86_64",
              },
              cpu: {
                cores: 4,
                model: "Intel(R) Xeon(R) Platinum 8375C CPU @ 2.90GHz",
              },
              memory: {
                totalBytes: 8_589_934_592,
                availableBytes: 4_294_967_296,
              },
              rootDisk: {
                mountPoint: "/",
                fsType: "ext4",
                totalBytes: 107_374_182_400,
                usedBytes: 53_687_091_200,
                freeBytes: 53_687_091_200,
              },
            },
          }),
        )
        .expect(201);
      expect(res.body.data.ok).toBe(true);
    });

    it("accepts minimal system info (only rootDisk required fields)", async () => {
      const res = await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(
          validPayload({
            system: {
              rootDisk: { mountPoint: "/" },
            },
          }),
        )
        .expect(201);
      expect(res.body.data.ok).toBe(true);
    });

    it("stores system info accessible via agent repository", async () => {
      await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(
          validPayload({
            agentVersion: "2.0.0",
            system: {
              os: { family: "linux" },
              cpu: { cores: 8 },
            },
          }),
        )
        .expect(201);

      const agentRepo = createJsonAgentRepository(
        join(tempDir, "data", "agents.json"),
      );
      const systemInfo = await agentRepo.getSystemInfo(vpsId);
      expect(systemInfo).toBeDefined();
      expect(systemInfo!.vpsId).toBe(vpsId);
      expect(systemInfo!.os?.family).toBe("linux");
      expect(systemInfo!.cpu?.cores).toBe(8);
      expect(systemInfo!.agentVersion).toBe("2.0.0");
      expect(systemInfo!.collectedAt).toBeDefined();
      expect(systemInfo!.receivedAt).toBeDefined();
    });

    it("keeps newer system info when an older collectedAt arrives later", async () => {
      const newerCollectedAt = new Date().toISOString();
      const olderCollectedAt = new Date(Date.now() - 60_000).toISOString();

      await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(
          validPayload({
            collectedAt: newerCollectedAt,
            system: {
              os: { family: "linux", name: "newer" },
            },
          }),
        )
        .expect(201);

      await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(
          validPayload({
            collectedAt: olderCollectedAt,
            system: {
              os: { family: "linux", name: "older" },
            },
          }),
        )
        .expect(201);

      const agentRepo = createJsonAgentRepository(
        join(tempDir, "data", "agents.json"),
      );
      const systemInfo = await agentRepo.getSystemInfo(vpsId);
      expect(systemInfo?.collectedAt).toBe(newerCollectedAt);
      expect(systemInfo?.os?.name).toBe("newer");
    });

    it("rejects system with unknown nested fields", async () => {
      await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(
          validPayload({
            system: {
              os: { family: "linux", extraField: "should be rejected" },
            },
          }),
        )
        .expect(400);
    });

    it("rejects system with cpu cores > 4096", async () => {
      await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(
          validPayload({
            system: {
              cpu: { cores: 5000 },
            },
          }),
        )
        .expect(400);
    });

    it("rejects system with negative memory bytes", async () => {
      await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(
          validPayload({
            system: {
              memory: { totalBytes: -1 },
            },
          }),
        )
        .expect(400);
    });

    it("rejects system with empty mountPoint", async () => {
      await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(
          validPayload({
            system: {
              rootDisk: { mountPoint: "" },
            },
          }),
        )
        .expect(400);
    });

    it("rejects system with oversize os name string", async () => {
      await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(
          validPayload({
            system: {
              os: { name: "x".repeat(600) },
            },
          }),
        )
        .expect(400);
    });
  });

  it("metric appears via /api/metrics after ingest", async () => {
    const { createSessionCookie } = await import("./test-helpers.js");
    const localApp = app({ mode: "local" });
    const sessionCookie = await createSessionCookie(
      tempDir,
      demoConfig.dashboardSessionSecret,
    );

    await request(localApp)
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${validToken}`)
      .send(validPayload())
      .expect(201);

    const res = await request(localApp)
      .get("/api/metrics")
      .set("Cookie", sessionCookie)
      .expect(200);
    const agentMetric = res.body.data.find(
      (m: { vpsId: string }) => m.vpsId === vpsId,
    );
    expect(agentMetric).toBeDefined();
    expect(agentMetric.cpu).toBe(42);
    expect(agentMetric.source).toBe("agent");
    expect(agentMetric.collectedAt).toBeDefined();
  });

  it("no raw token in responses or error messages", async () => {
    const res = await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${validToken}`)
      .send(validPayload())
      .expect(201);

    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain("vma_");
    expect(bodyStr).not.toContain(validToken);
  });

  it("updates agent state after ingest", async () => {
    await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${validToken}`)
      .send(validPayload({ agentVersion: "2.0.0" }))
      .expect(201);

    const agentRepo = createJsonAgentRepository(
      join(tempDir, "data", "agents.json"),
    );
    const state = await agentRepo.getState(vpsId);
    expect(state).toBeDefined();
    expect(state!.status).toBe("online");
    expect(state!.version).toBe("2.0.0");
    expect(state!.lastSeenAt).toBeDefined();
  });

  it("updates credential lastUsedAt after ingest", async () => {
    await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${validToken}`)
      .send(validPayload())
      .expect(201);

    const agentRepo = createJsonAgentRepository(
      join(tempDir, "data", "agents.json"),
    );
    const credential = await agentRepo.getCredential(credentialId);
    expect(credential).toBeDefined();
    expect(credential!.lastUsedAt).toBeDefined();
  });
});

// ── Rate limiting ───────────────────────────────────────────────────────

describe("rate limiting", () => {
  it("returns 429 when exceeding agent rate limit", async () => {
    const vpsId = await createVps();
    const { service } = makeService();
    const { token } = await service.createCredential(vpsId);

    // Use a low rateLimitMax so the agent limit (max * 5) is easy to exceed
    // With max=1 → agent limit = 5 per 500ms window
    const limitedConfig: AppConfig = {
      ...demoConfig,
      rateLimitMax: 1,
      rateLimitWindowMs: 500,
    };
    const limitedApp = app(limitedConfig);

    // Send 7 requests rapidly — later ones should 429
    const results: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await request(limitedApp)
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${token}`)
        .send(validPayload());
      results.push(res.status);
    }

    const fours = results.filter((s) => s === 429);
    expect(fours.length).toBeGreaterThan(0);
    // The first request should succeed
    expect(results[0]).toBe(201);
  });

  it("allows normal cadence under rate limit", async () => {
    const vpsId = await createVps();
    const { service } = makeService();
    const { token } = await service.createCredential(vpsId);

    const res1 = await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${token}`)
      .send(validPayload())
      .expect(201);

    const res2 = await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${token}`)
      .send(validPayload())
      .expect(201);

    expect(res1.body.data.ok).toBe(true);
    expect(res2.body.data.ok).toBe(true);
  });
});

// ── Freshness ───────────────────────────────────────────────────────────

describe("freshness using receivedAt", () => {
  it("recent receivedAt is fresh", () => {
    expect(isFreshTimestamp(new Date().toISOString())).toBe(true);
  });

  it("old receivedAt is stale", () => {
    const old = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(isFreshTimestamp(old)).toBe(false);
  });

  it("very old receivedAt is stale", () => {
    const veryOld = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(isFreshTimestamp(veryOld)).toBe(false);
  });

  it("ingested metric has receivedAt set for freshness computation", async () => {
    const vpsId = await createVps();
    const { service } = makeService();
    const { credential } = await service.createCredential(vpsId);
    const result = await service.ingestMetric(credential, validPayload());

    expect(result.sample.receivedAt).toBeDefined();
    expect(isFreshTimestamp(result.sample.receivedAt!)).toBe(true);
  });
});

// ── Docker metrics ───────────────────────────────────────────────────────

function validDockerPayload(overrides?: Record<string, unknown>) {
  return {
    collectedAt: new Date().toISOString(),
    agentVersion: "1.0.0",
    schemaVersion: 1 as const,
    available: true,
    containerTotal: 3,
    containerRunning: 2,
    cpuPercent: 45.5,
    memoryUsageBytes: 524_288_000,
    memoryLimitBytes: 1_073_741_824,
    networkRxBytes: 1_000_000,
    networkTxBytes: 500_000,
    blockReadBytes: 100_000,
    blockWriteBytes: 50_000,
    pids: 42,
    containers: [
      {
        id: "abc123def456",
        name: "/web-nginx",
        image: "nginx:1.25",
        status: "Up 3 hours",
        state: "running",
        createdAt: new Date().toISOString(),
        cpuPercent: 12.3,
        memoryUsageBytes: 65_536_000,
        memoryLimitBytes: 268_435_456,
        networkRxBytes: 800_000,
        networkTxBytes: 400_000,
        blockReadBytes: 50_000,
        blockWriteBytes: 20_000,
        pids: 12,
      },
    ],
    ...overrides,
  };
}

describe("Docker metrics ingestion", () => {
  let agentService: AgentService;
  let validToken: string;
  let credentialId: string;
  let vpsId: string;

  beforeEach(async () => {
    vpsId = await createVps();
    const { service } = makeService();
    agentService = service;
    const result = await agentService.createCredential(vpsId);
    validToken = result.token;
    credentialId = result.credential.id;
  });

  it("ignores docker payload when dockerMetricsEnabled is false (default)", async () => {
    const res = await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${validToken}`)
      .send(validPayload({ docker: validDockerPayload() }))
      .expect(201);

    expect(res.body.data.config).toEqual({ dockerMetricsEnabled: false });

    const agentRepo = createJsonAgentRepository(
      join(tempDir, "data", "agents.json"),
    );
    const stored = await agentRepo.getDockerMetrics(vpsId);
    expect(stored).toBeUndefined();
  });

  it("stores docker metrics when dockerMetricsEnabled is true", async () => {
    // Enable Docker metrics
    await vpsRepo.update(vpsId, { dockerMetricsEnabled: true });

    const res = await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${validToken}`)
      .send(validPayload({ docker: validDockerPayload() }))
      .expect(201);

    expect(res.body.data.config).toEqual({ dockerMetricsEnabled: true });

    const agentRepo = createJsonAgentRepository(
      join(tempDir, "data", "agents.json"),
    );
    const stored = await agentRepo.getDockerMetrics(vpsId);
    expect(stored).toBeDefined();
    expect(stored!.vpsId).toBe(vpsId);
    expect(stored!.available).toBe(true);
    expect(stored!.containerTotal).toBe(3);
    expect(stored!.containerRunning).toBe(2);
    expect(stored!.containers).toHaveLength(1);
    expect(stored!.containers[0]!.name).toBe("/web-nginx");
  });

  it("stale collectedAt does not overwrite newer docker metrics", async () => {
    await vpsRepo.update(vpsId, { dockerMetricsEnabled: true });

    // Send newer payload first
    const newerCollectedAt = new Date().toISOString();
    await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${validToken}`)
      .send(
        validPayload({
          docker: validDockerPayload({
            collectedAt: newerCollectedAt,
            containerTotal: 10,
          }),
        }),
      )
      .expect(201);

    // Send older payload after
    const olderCollectedAt = new Date(Date.now() - 60_000).toISOString();
    await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${validToken}`)
      .send(
        validPayload({
          docker: validDockerPayload({
            collectedAt: olderCollectedAt,
            containerTotal: 5,
          }),
        }),
      )
      .expect(201);

    const agentRepo = createJsonAgentRepository(
      join(tempDir, "data", "agents.json"),
    );
    const stored = await agentRepo.getDockerMetrics(vpsId);
    expect(stored!.containerTotal).toBe(10);
  });

  it("rejects docker payload with too many containers (>20)", async () => {
    await vpsRepo.update(vpsId, { dockerMetricsEnabled: true });

    const manyContainers = Array.from({ length: 21 }, (_, i) => ({
      id: `c${i.toString().padStart(15, "0")}`,
      name: `/container-${i}`,
      image: "nginx:1.25",
      status: "Up 1 hour",
      state: "running",
      createdAt: new Date().toISOString(),
      cpuPercent: 1,
      memoryUsageBytes: 10_000_000,
      networkRxBytes: 1000,
      networkTxBytes: 500,
      blockReadBytes: 100,
      blockWriteBytes: 50,
      pids: 5,
    }));

    await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${validToken}`)
      .send(
        validPayload({
          docker: validDockerPayload({ containers: manyContainers }),
        }),
      )
      .expect(400);
  });

  it("rejects docker payload with negative values", async () => {
    await vpsRepo.update(vpsId, { dockerMetricsEnabled: true });

    await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${validToken}`)
      .send(validPayload({ docker: validDockerPayload({ cpuPercent: -1 }) }))
      .expect(400);
  });

  it("rejects system + docker extra fields (strict schema)", async () => {
    await vpsRepo.update(vpsId, { dockerMetricsEnabled: true });

    await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${validToken}`)
      .send(
        validPayload({
          docker: { ...validDockerPayload(), extraField: "rejected" },
        }),
      )
      .expect(400);
  });

  it("returns enabled config in response when dockerMetricsEnabled is true", async () => {
    await vpsRepo.update(vpsId, { dockerMetricsEnabled: true });
    const res = await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${validToken}`)
      .send(validPayload())
      .expect(201);
    expect(res.body.data.config).toEqual({ dockerMetricsEnabled: true });
  });

  it("clears docker metrics when disabled via update", async () => {
    // Enable and store
    await vpsRepo.update(vpsId, { dockerMetricsEnabled: true });
    await request(app())
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${validToken}`)
      .send(validPayload({ docker: validDockerPayload() }))
      .expect(201);

    const agentRepo = createJsonAgentRepository(
      join(tempDir, "data", "agents.json"),
    );
    expect(await agentRepo.getDockerMetrics(vpsId)).toBeDefined();

    // Disable via VPS repository directly (simulates what VpsService does)
    await vpsRepo.update(vpsId, { dockerMetricsEnabled: false });
    await agentRepo.deleteDockerMetrics(vpsId);

    expect(await agentRepo.getDockerMetrics(vpsId)).toBeUndefined();
  });
});
