import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AppConfig } from "../src/config/app-config.js";
import { parseAppConfig } from "../src/config/app-config.js";
import { redactString, redactValue } from "../src/common/redaction.js";
import { SshHostBlockedError } from "../src/errors.js";
import { assertSshHostAllowed } from "../src/security/ssh-host-policy.js";
import { createKeyService } from "../src/services/keyService.js";
import { createVpsStore } from "../src/store/vpsStore.js";
import { createJsonAuditRepository } from "../src/repositories/audit.repository.js";

let tempDir: string;

const demoConfig: AppConfig = {
  mode: "demo",
  enableWebTerminal: false,
  allowPrivateNetworkTargets: false,
  dataDir: "data",
  privateDir: "private",
  rateLimitWindowMs: 60_000,
  rateLimitMax: 120
};

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "vps-manager-phase-one-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

function testApp(config: AppConfig = demoConfig) {
  const scopedConfig = { ...config, dataDir: join(tempDir, "data"), privateDir: join(tempDir, "private") };
  return createApp({
    config: scopedConfig,
    store: createVpsStore(join(tempDir, "data", "vps.json")),
    keys: createKeyService(join(tempDir, "private", "keys")),
    audit: createJsonAuditRepository(join(tempDir, "data", "audit.json"))
  });
}

describe("phase one config", () => {
  it("defaults to safe demo mode", () => {
    expect(parseAppConfig({} as NodeJS.ProcessEnv)).toMatchObject({
      mode: "demo",
      enableWebTerminal: false,
      allowPrivateNetworkTargets: false,
      dataDir: "data",
      privateDir: "private"
    });
  });

  it("fails fast for unsafe local and terminal settings", () => {
    expect(() => parseAppConfig({ APP_MODE: "local" } as NodeJS.ProcessEnv)).toThrow(/LOCAL_AUTH_TOKEN/);
    expect(() => parseAppConfig({ APP_MODE: "demo", ENABLE_WEB_TERMINAL: "true" } as NodeJS.ProcessEnv)).toThrow(/ENABLE_WEB_TERMINAL/);
  });
});

describe("phase one redaction", () => {
  it("redacts secret keys and secret-looking strings", () => {
    expect(redactString("password=secret ssh-ed25519 AAAATEST user@example")).not.toContain("secret");
    expect(redactString("-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----")).toBe("[REDACTED]");
    expect(redactValue({ password: "secret", nested: { privateKey: "key" }, ok: "visible" })).toEqual({
      password: "[REDACTED]",
      nested: { privateKey: "[REDACTED]" },
      ok: "visible"
    });
  });
});

describe("phase one SSH host policy", () => {
  it("blocks metadata, localhost, and private hosts unless explicitly local", () => {
    expect(() => assertSshHostAllowed("169.254.169.254", demoConfig)).toThrow(SshHostBlockedError);
    expect(() => assertSshHostAllowed("localhost", demoConfig)).toThrow(SshHostBlockedError);
    expect(() => assertSshHostAllowed("10.0.0.5", demoConfig)).toThrow(SshHostBlockedError);

    const localConfig = { ...demoConfig, mode: "local" as const, localAuthToken: "token", allowPrivateNetworkTargets: true };
    expect(() => assertSshHostAllowed("10.0.0.5", localConfig)).not.toThrow();
    expect(() => assertSshHostAllowed("203.0.113.20", demoConfig)).not.toThrow();
  });
});

describe("phase one route security", () => {
  it("keeps demo mutations compatible and adds security headers/request IDs", async () => {
    const response = await request(testApp()).post("/api/vps").send({ name: "prod", host: "203.0.113.20", port: 22, username: "root" }).expect(201);
    expect(response.headers["x-request-id"]).toBeDefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.body.data).toMatchObject({ provider: "unknown", tags: [], status: "unknown" });
  });

  it("requires bearer auth for local-mode mutations", async () => {
    const config = { ...demoConfig, mode: "local" as const, localAuthToken: "local-token" };
    const server = testApp(config);

    await request(server).get("/api/health").expect(200, { ok: true });
    await request(server).post("/api/vps").send({ name: "prod", host: "203.0.113.20", port: 22, username: "root" }).expect(401);

    await request(server)
      .post("/api/vps")
      .set("Authorization", "Bearer local-token")
      .send({ name: "prod", host: "203.0.113.20", port: 22, username: "root" })
      .expect(201);
  });

  it("blocks real SSH in demo mode and writes redacted audit events", async () => {
    const server = testApp();
    const created = await request(server).post("/api/vps").send({ name: "prod", host: "203.0.113.20", port: 22, username: "root" }).expect(201);

    const blocked = await request(server).post(`/api/vps/${created.body.data.id}/provision-key`).send({ password: "super-secret" }).expect(403);
    expect(blocked.body.error.message).toBe("Real SSH is disabled in demo mode");
    expect(JSON.stringify(blocked.body)).not.toContain("super-secret");

    const audit = await readFile(join(tempDir, "data", "audit.json"), "utf8");
    expect(audit).toContain("vps.key.provision");
    expect(audit).not.toContain("super-secret");
  });
});
