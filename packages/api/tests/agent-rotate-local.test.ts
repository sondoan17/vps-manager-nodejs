import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import type { AppConfig } from "../src/config/app-config.js";
import type { VpsRepository } from "../src/persistence/repositories/vps.repository.js";
import { createJsonAgentRepository } from "../src/persistence/repositories/agent.repository.js";
import { createJsonAuditRepository } from "../src/persistence/repositories/audit.repository.js";
import { createJsonJobRepository } from "../src/persistence/repositories/job.repository.js";
import { createJsonMetricRepository } from "../src/persistence/repositories/metric.repository.js";
import { createKeyService } from "../src/ssh/keyService.js";
import { createVpsStore } from "../src/persistence/store/vpsStore.js";
import { LocalAgentRotationHelper } from "../src/agents/local-agent-rotation-helper.service.js";
import type { CommandJob } from "../src/jobs/jobs.models.js";
import type { KeyService } from "../src/ssh/keyService.js";

const localConfig: AppConfig = {
  mode: "local",
  enableWebTerminal: false,
  allowPrivateNetworkTargets: false,
  dataDir: "data",
  privateDir: "private",
  rateLimitWindowMs: 60_000,
  rateLimitMax: 120,
  agentInstallIntervalSeconds: 15,
  allowInsecureAgentHttp: false,
  storageDriver: "json",
  dbSsl: false,
  dbPoolMax: 10,
  dashboardSessionTtlSeconds: 86_400,
  dashboardCookieSecure: false,
  dashboardCookieSameSite: "lax",
  dashboardSessionSecret: "rotate-test-secret-32+chars-here!!!",
  trustProxyHops: 0,
  jobHistoryLimit: 1000,
  auditHistoryLimit: 5000,
  metricWindowLimit: 120,
  sshHostKeyPins: {},
  sshHostKeyPolicy: "strict",
};

let tempDir: string;
let vpsRepo: VpsRepository;
let keys: KeyService;
let sessionCookie: string;
let sharedAgentRepo: ReturnType<typeof createJsonAgentRepository>;
let sharedJobRepo: ReturnType<typeof createJsonJobRepository>;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "vps-manager-rotate-"));
  vpsRepo = createVpsStore(join(tempDir, "data", "vps.json"));
  sharedAgentRepo = createJsonAgentRepository(join(tempDir, "data", "agents.json"));
  sharedJobRepo = createJsonJobRepository(join(tempDir, "data", "jobs.json"));
  keys = createKeyService(join(tempDir, "private", "keys"));
  const { createSessionCookie } = await import("./test-helpers.js");
  sessionCookie = await createSessionCookie(
    tempDir,
    localConfig.dashboardSessionSecret,
  );
});

afterEach(async () => {
  for (let attempt = 0; attempt < 200; attempt++) {
    let jobs: CommandJob[];
    try {
      jobs = await sharedJobRepo.list();
    } catch {
      await new Promise((r) => setTimeout(r, 25));
      continue;
    }
    if (
      jobs.every(
        (job) =>
          job.status === "succeeded" ||
          job.status === "failed" ||
          job.status === "cancelled",
      )
    )
      break;
    await new Promise((r) => setTimeout(r, 100));
  }
  vi.restoreAllMocks();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await rm(tempDir, { recursive: true, force: true });
      break;
    } catch {
      if (attempt === 4) throw new Error(`Failed to cleanup ${tempDir}`);
      await new Promise((r) => setTimeout(r, 100));
    }
  }
});

function app() {
  return createApp({
    store: vpsRepo,
    keys,
    audit: createJsonAuditRepository(join(tempDir, "data", "audit.json")),
    jobs: sharedJobRepo,
    metrics: createJsonMetricRepository(join(tempDir, "data", "metrics.json")),
    agent: sharedAgentRepo,
    config: {
      ...localConfig,
      dataDir: join(tempDir, "data"),
      privateDir: join(tempDir, "private"),
    },
  });
}

function withCookie(req: request.Test) {
  return req
    .set("Cookie", sessionCookie)
    .set("Origin", "http://127.0.0.1")
    .set("Host", "127.0.0.1");
}

async function createLocalVps(): Promise<string> {
  const record = await vpsRepo.ensureLocalHost({
    id: "local-host",
    name: "local-host",
    host: "127.0.0.1",
    port: 22,
    username: "root",
    kind: "local",
    managedBy: "system",
  });
  return record.id;
}

async function createRemoteVps(): Promise<string> {
  const record = await vpsRepo.create({
    name: "remote-vps",
    host: "203.0.113.50",
    port: 22,
    username: "root",
  });
  return record.id;
}

async function waitForJob(
  jobId: string,
  want: "succeeded" | "failed",
  timeoutMs = 15_000,
): Promise<CommandJob> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = await sharedJobRepo.get(jobId);
    if (job?.status === want) return job;
    if (
      job?.status === "succeeded" ||
      job?.status === "failed" ||
      job?.status === "cancelled"
    ) {
      throw new Error(
        `Rotate job ended as ${job.status}: ${job.errorMessage ?? "unknown"}`,
      );
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`waitForJob timed out after ${timeoutMs}ms`);
}

describe("POST /api/vps/:id/rotate-agent", () => {
  it("returns 401 without an authenticated session", async () => {
    const vpsId = await createLocalVps();
    await request(app()).post(`/api/vps/${vpsId}/rotate-agent`).expect(401);
  });

  it("rejects remote/user-managed hosts with 400", async () => {
    const vpsId = await createRemoteVps();
    const res = await withCookie(
      request(app()).post(`/api/vps/${vpsId}/rotate-agent`),
    ).expect(400);
    expect(res.body.error.message).toMatch(/local/i);
  });

  it("helper failure preserves the old active credential", async () => {
    const server = app();
    const vpsId = await createLocalVps();
    const old = await sharedAgentRepo.createCredential({
      vpsId,
      secretHash: "sha256_old",
      status: "active",
    });

    vi.spyOn(
      LocalAgentRotationHelper.prototype,
      "applyCredential",
    ).mockRejectedValueOnce(new Error("helper boom"));

    const post = await withCookie(
      request(server).post(`/api/vps/${vpsId}/rotate-agent`),
    ).expect(201);
    const jobId: string = post.body.data.jobId;
    const newCredentialId: string = post.body.data.credentialId;
    expect(jobId).toMatch(/^job_/);

    await waitForJob(jobId, "failed");

    const creds = await sharedAgentRepo.listCredentialsByVps(vpsId);
    const oldAfter = creds.find((c) => c.id === old.id);
    expect(oldAfter?.status).toBe("active");
    const fresh = creds.find((c) => c.id === newCredentialId);
    expect(fresh?.status).toBe("revoked");
  }, 15_000);

  it("helper success rotates to the new credential with a redacted response", async () => {
    const server = app();
    const vpsId = await createLocalVps();
    const old = await sharedAgentRepo.createCredential({
      vpsId,
      secretHash: "sha256_old",
      status: "active",
    });

    vi.spyOn(
      LocalAgentRotationHelper.prototype,
      "applyCredential",
    ).mockResolvedValueOnce(undefined);

    const post = await withCookie(
      request(server).post(`/api/vps/${vpsId}/rotate-agent`),
    ).expect(201);
    expect(post.body.data.jobId).toMatch(/^job_/);
    expect(post.body.data.credentialId).toBeDefined();
    expect(JSON.stringify(post.body)).not.toContain("vma_");

    await waitForJob(post.body.data.jobId, "succeeded");

    const creds = await sharedAgentRepo.listCredentialsByVps(vpsId);
    const rotated = creds.find((c) => c.id === post.body.data.credentialId);
    expect(rotated?.status).toBe("active");
    const oldAfter = creds.find((c) => c.id === old.id);
    expect(oldAfter?.status).toBe("revoked");

    const jobsRes = await withCookie(request(server).get("/api/jobs")).expect(
      200,
    );
    expect(JSON.stringify(jobsRes.body)).not.toContain("vma_");
  }, 15_000);
});
