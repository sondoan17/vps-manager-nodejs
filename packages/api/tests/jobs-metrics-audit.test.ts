import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AppConfig } from "../src/config/app-config.js";
import { createJsonAuditRepository } from "../src/repositories/audit.repository.js";
import { createJsonJobRepository } from "../src/repositories/job.repository.js";
import { createJsonMetricRepository } from "../src/repositories/metric.repository.js";
import { createKeyService } from "../src/services/keyService.js";
import { createVpsStore } from "../src/store/vpsStore.js";

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
};

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "vps-manager-jma-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

function app(overrides?: Partial<AppConfig>) {
  const config = { ...demoConfig, ...overrides };
  return createApp({
    config: { ...config, dataDir: join(tempDir, "data"), privateDir: join(tempDir, "private") },
    store: createVpsStore(join(tempDir, "data", "vps.json")),
    keys: createKeyService(join(tempDir, "private", "keys")),
    audit: createJsonAuditRepository(join(tempDir, "data", "audit.json")),
    jobs: createJsonJobRepository(join(tempDir, "data", "jobs.json")),
    metrics: createJsonMetricRepository(join(tempDir, "data", "metrics.json"))
  });
}

describe("jobs API", () => {
  describe("demo mode", () => {
    it("returns seeded demo jobs", async () => {
      const res = await request(app()).get("/api/jobs").expect(200);

      expect(res.body.data).toHaveLength(4);
      expect(res.body.data.map((job: { id: string }) => job.id)).toEqual([
        "job_demo_disk_check",
        "job_demo_collect_metrics",
        "job_demo_verify_key",
        "job_demo_rotate_key_failed"
      ]);
      expect(res.body.data.map((job: { status: string }) => job.status)).toEqual(["queued", "running", "succeeded", "failed"]);
    });

    it("includes job progress and output preview", async () => {
      const res = await request(app()).get("/api/jobs").expect(200);

      const running = res.body.data.find((job: { id: string }) => job.id === "job_demo_collect_metrics");
      expect(running).toMatchObject({
        vpsId: "demo-edge-sgp-01",
        status: "running",
        progress: 64,
        outputPreview: "Collecting uptime, disk, and load averages..."
      });
    });

    it("does not leak credentials in response", async () => {
      const res = await request(app()).get("/api/jobs").expect(200);
      expect(JSON.stringify(res.body)).not.toMatch(/password|private key|secret/i);
    });
  });

  describe("local mode", () => {
    let sessionCookie: string;

    beforeEach(async () => {
      const { createSessionCookie } = await import("./test-helpers.js");
      sessionCookie = await createSessionCookie(tempDir, demoConfig.dashboardSessionSecret);
    });

    it("returns empty list when no jobs stored", async () => {
      const localConfig: AppConfig = {
        ...demoConfig,
        mode: "local"
      };
      const res = await request(app(localConfig)).get("/api/jobs").set("Cookie", sessionCookie).expect(200);
      expect(res.body.data).toEqual([]);
    });

    it("returns jobs from repository when data exists", async () => {
      const localConfig: AppConfig = {
        ...demoConfig,
        mode: "local",
        
      };
      // Manually append a job to the JSON file via the repo
      const repo = createJsonJobRepository(join(tempDir, "data", "jobs.json"));
      const job = await repo.append({
        vpsId: "vps_test_01",
        type: "check disk",
        status: "succeeded",
        progress: 100,
        startedAt: "2026-06-25T10:00:00.000Z",
        finishedAt: "2026-06-25T10:00:05.000Z",
        exitCode: 0,
        outputPreview: "Disk usage: 45%"
      });

      const res = await request(app(localConfig)).get("/api/jobs").set("Cookie", sessionCookie).expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        id: job.id,
        vpsId: "vps_test_01",
        type: "check disk",
        status: "succeeded",
        exitCode: 0
      });
    });
  });
});

describe("metrics API", () => {
  describe("demo mode", () => {
    it("returns seeded demo metrics", async () => {
      const res = await request(app()).get("/api/metrics").expect(200);

      expect(res.body.data).toHaveLength(3);
      expect(res.body.data.map((m: { vpsId: string }) => m.vpsId)).toEqual([
        "demo-edge-sgp-01",
        "demo-api-fra-02",
        "demo-worker-sfo-01"
      ]);
    });

    it("includes freshness field", async () => {
      const res = await request(app()).get("/api/metrics").expect(200);
      expect(res.body.data.map((m: { freshness: string }) => m.freshness)).toEqual(["fresh", "fresh", "stale"]);
    });

    it("filters by vpsId query parameter", async () => {
      const res = await request(app()).get("/api/metrics?vpsId=demo-api-fra-02").expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        vpsId: "demo-api-fra-02",
        cpu: 72,
        memory: 78
      });
    });

    it("returns empty array for non-matching vpsId", async () => {
      const res = await request(app()).get("/api/metrics?vpsId=nonexistent").expect(200);
      expect(res.body.data).toEqual([]);
    });

    it("does not leak credentials in response", async () => {
      const res = await request(app()).get("/api/metrics").expect(200);
      expect(JSON.stringify(res.body)).not.toMatch(/password|private key|secret/i);
    });
  });

  describe("local mode", () => {
    let sessionCookie: string;

    beforeEach(async () => {
      const { createSessionCookie } = await import("./test-helpers.js");
      sessionCookie = await createSessionCookie(tempDir, demoConfig.dashboardSessionSecret);
    });

    it("returns empty list when no metrics stored", async () => {
      const localConfig: AppConfig = {
        ...demoConfig,
        mode: "local",
        
      };
      const res = await request(app(localConfig)).get("/api/metrics").set("Cookie", sessionCookie).expect(200);
      expect(res.body.data).toEqual([]);
    });

    it("returns metrics from repository and supports vpsId filter", async () => {
      const localConfig: AppConfig = {
        ...demoConfig,
        mode: "local",
        
      };
      const repo = createJsonMetricRepository(join(tempDir, "data", "metrics.json"));
      await repo.append({
        vpsId: "vps_alpha",
        cpu: 35,
        memory: 50,
        disk: 70,
        loadAverage: 0.5,
        networkRx: 1000,
        networkTx: 500,
        uptime: 86400,
        collectedAt: "2026-06-25T10:00:00.000Z"
      });
      await repo.append({
        vpsId: "vps_beta",
        cpu: 80,
        memory: 90,
        disk: 50,
        loadAverage: 2.0,
        networkRx: 2000,
        networkTx: 1500,
        uptime: 43200,
        collectedAt: "2026-06-25T10:00:00.000Z"
      });

      const all = await request(app(localConfig)).get("/api/metrics").set("Cookie", sessionCookie).expect(200);
      expect(all.body.data).toHaveLength(2);

      const filtered = await request(app(localConfig)).get("/api/metrics?vpsId=vps_alpha").set("Cookie", sessionCookie).expect(200);
      expect(filtered.body.data).toHaveLength(1);
      expect(filtered.body.data[0].cpu).toBe(35);
    });
  });
});

describe("audit API", () => {
  describe("demo mode", () => {
    it("returns seeded demo audit events", async () => {
      const res = await request(app()).get("/api/audit").expect(200);

      expect(res.body.data).toHaveLength(7);
      expect(res.body.data.map((e: { action: string }) => e.action)).toEqual([
        "demo.dashboard.view",
        "job.queued",
        "job.running",
        "job.succeeded",
        "job.failed",
        "terminal.opened",
        "ssh.host.blocked"
      ]);
    });

    it("filters by resourceId", async () => {
      const res = await request(app()).get("/api/audit?resourceId=job_demo_verify_key").expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        action: "job.succeeded",
        resourceId: "job_demo_verify_key",
        result: "success"
      });
    });

    it("filters by action", async () => {
      const res = await request(app()).get("/api/audit?action=job.queued").expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        action: "job.queued",
        resourceType: "job"
      });
    });

    it("filters by result", async () => {
      const res = await request(app()).get("/api/audit?result=blocked").expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        action: "ssh.host.blocked",
        result: "blocked"
      });
    });

    it("returns empty array for non-matching filter", async () => {
      const res = await request(app()).get("/api/audit?resourceId=nonexistent").expect(200);
      expect(res.body.data).toEqual([]);
    });

    it("does not leak credentials in response", async () => {
      const res = await request(app()).get("/api/audit").expect(200);
      expect(JSON.stringify(res.body)).not.toMatch(/password|private key|secret/i);
    });
  });

  describe("local mode", () => {
    let sessionCookie: string;

    beforeEach(async () => {
      const { createSessionCookie } = await import("./test-helpers.js");
      sessionCookie = await createSessionCookie(tempDir, demoConfig.dashboardSessionSecret);
    });

    it("returns empty list when no audit events stored", async () => {
      const localConfig: AppConfig = {
        ...demoConfig,
        mode: "local",
        
      };
      const res = await request(app(localConfig)).get("/api/audit").set("Cookie", sessionCookie).expect(200);
      expect(res.body.data).toEqual([]);
    });

    it("returns audit events from repository and supports filters", async () => {
      const localConfig: AppConfig = {
        ...demoConfig,
        mode: "local",
        
      };
      const repo = createJsonAuditRepository(join(tempDir, "data", "audit.json"));
      const e1 = await repo.append({
        actor: "admin",
        action: "vps.create",
        resourceType: "vps",
        resourceId: "vps_001",
        result: "success",
        metadata: { host: "203.0.113.10" }
      });
      const e2 = await repo.append({
        actor: "admin",
        action: "vps.delete",
        resourceType: "vps",
        resourceId: "vps_002",
        result: "blocked",
        metadata: { reason: "protected" }
      });

      const all = await request(app(localConfig)).get("/api/audit").set("Cookie", sessionCookie).expect(200);
      expect(all.body.data).toHaveLength(2);

      const actionFilter = await request(app(localConfig)).get("/api/audit?action=vps.create").set("Cookie", sessionCookie).expect(200);
      expect(actionFilter.body.data).toHaveLength(1);
      expect(actionFilter.body.data[0].resourceId).toBe("vps_001");

      const resultFilter = await request(app(localConfig)).get("/api/audit?result=blocked").set("Cookie", sessionCookie).expect(200);
      expect(resultFilter.body.data).toHaveLength(1);
      expect(resultFilter.body.data[0].resourceId).toBe("vps_002");
    });
  });
});
