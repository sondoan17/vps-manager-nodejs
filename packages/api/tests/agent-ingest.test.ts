import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AppConfig } from "../src/config/app-config.js";
import type { VpsRepository } from "../src/repositories/vps.repository.js";
import { createJsonAgentRepository } from "../src/repositories/agent.repository.js";
import { createJsonAuditRepository } from "../src/repositories/audit.repository.js";
import { createJsonJobRepository } from "../src/repositories/job.repository.js";
import { createJsonMetricRepository } from "../src/repositories/metric.repository.js";
import { createKeyService } from "../src/services/keyService.js";
import { createVpsStore } from "../src/store/vpsStore.js";
import { AgentService } from "../src/services/agent.service.js";
import { isFreshTimestamp } from "../src/services/monitoring.service.js";

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
    username: "root"
  });
  return record.id;
}

function makeService() {
  const agentRepo = createJsonAgentRepository(join(tempDir, "data", "agents.json"));
  const metricRepo = createJsonMetricRepository(join(tempDir, "data", "metrics.json"));
  const service = new AgentService(agentRepo, metricRepo, vpsRepo);
  return { agentRepo, metricRepo, service };
}

function app(overrides?: Partial<AppConfig>) {
  const config = { ...demoConfig, ...overrides };
  return createApp({
    config: { ...config, dataDir: join(tempDir, "data"), privateDir: join(tempDir, "private") },
    store: vpsRepo,
    keys: createKeyService(join(tempDir, "private", "keys")),
    audit: createJsonAuditRepository(join(tempDir, "data", "audit.json")),
    jobs: createJsonJobRepository(join(tempDir, "data", "jobs.json")),
    metrics: createJsonMetricRepository(join(tempDir, "data", "metrics.json")),
    agent: createJsonAgentRepository(join(tempDir, "data", "agents.json"))
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
    ...overrides
  };
}

// ── VPS existence ───────────────────────────────────────────────────────

describe("VPS existence checks", () => {
  it("createCredential fails when VPS does not exist", async () => {
    const { service } = makeService();
    await expect(service.createCredential("nonexistent_vps")).rejects.toThrow("VPS not found");
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
    await expect(service.ingestMetric(credential, validPayload())).rejects.toThrow("VPS not found");
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
    await expect(service.verifyBearerToken("Bearer invalidtoken")).rejects.toThrow();
  });

  it("rejects revoked credential even with correct secret", async () => {
    const vpsId = await createVps();
    const { service } = makeService();
    const { credential, token } = await service.createCredential(vpsId);
    const secret = token.slice(token.lastIndexOf("_") + 1);

    await service.revokeCredential(credential.id);

    const reconstructedToken = `vma_${credential.id}_${secret}`;
    await expect(service.verifyBearerToken(`Bearer ${reconstructedToken}`)).rejects.toThrow();
  });

  it("rejects token with wrong secret", async () => {
    const vpsId = await createVps();
    const { service } = makeService();
    const { credential } = await service.createCredential(vpsId);
    const wrongToken = `vma_${credential.id}_${"a".repeat(64)}`;
    await expect(service.verifyBearerToken(`Bearer ${wrongToken}`)).rejects.toThrow();
  });

  it("rejects token for non-existent credential", async () => {
    const { service } = makeService();
    await expect(service.verifyBearerToken("Bearer vma_nonexistent_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890")).rejects.toThrow();
  });
});

// ── Payload validation ──────────────────────────────────────────────────

describe("agent metric payload validation", () => {
  it("accepts valid payload via ingest", async () => {
    const vpsId = await createVps();
    const { service } = makeService();
    const { credential } = await service.createCredential(vpsId);

    const sample = await service.ingestMetric(credential, validPayload());
    expect(sample.vpsId).toBe(vpsId);
    expect(sample.cpu).toBe(42);
    expect(sample.source).toBe("agent");
    expect(sample.receivedAt).toBeDefined();
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
      receivedAt: expect.any(String)
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
        .send(validPayload({ collectedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString() }))
        .expect(400);
    });

    it("rejects too-future collectedAt", async () => {
      await request(app())
        .post("/api/agent/metrics")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validPayload({ collectedAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() }))
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

  it("metric appears via /api/metrics after ingest", async () => {
    const { createSessionCookie } = await import("./test-helpers.js");
    const localApp = app({ mode: "local", localAuthToken: "test-token" });
    const sessionCookie = await createSessionCookie(tempDir, demoConfig.dashboardSessionSecret);

    await request(localApp)
      .post("/api/agent/metrics")
      .set("Authorization", `Bearer ${validToken}`)
      .send(validPayload())
      .expect(201);

    const res = await request(localApp).get("/api/metrics").set("Cookie", sessionCookie).expect(200);
    const agentMetric = res.body.data.find((m: { vpsId: string }) => m.vpsId === vpsId);
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

    const agentRepo = createJsonAgentRepository(join(tempDir, "data", "agents.json"));
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

    const agentRepo = createJsonAgentRepository(join(tempDir, "data", "agents.json"));
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
    const sample = await service.ingestMetric(credential, validPayload());

    expect(sample.receivedAt).toBeDefined();
    expect(isFreshTimestamp(sample.receivedAt!)).toBe(true);
  });
});
