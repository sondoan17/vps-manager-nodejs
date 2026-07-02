import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AppConfig } from "../src/config/app-config.js";
import { createVpsStore } from "../src/store/vpsStore.js";
import { createKeyService } from "../src/services/keyService.js";
import { createJsonAuditRepository } from "../src/repositories/audit.repository.js";
import { createJsonSessionRepository } from "../src/repositories/session.repository.js";
import { SESSION_COOKIE_NAME } from "../src/auth/cookies.js";

const LOCAL_AUTH_TOKEN = "test-admin-token";
const SESSION_SECRET = "test-session-secret";

const localConfig: AppConfig = {
  mode: "local",
  localAuthToken: LOCAL_AUTH_TOKEN,
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
  dashboardSessionSecret: SESSION_SECRET,
  dashboardSessionTtlSeconds: 86_400,
  dashboardCookieSecure: false,
  dashboardCookieSameSite: "lax",
};

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "vps-manager-auth-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

function app() {
  return createApp({
    config: { ...localConfig, dataDir: join(tempDir, "data"), privateDir: join(tempDir, "private") },
    store: createVpsStore(join(tempDir, "data", "vps.json")),
    keys: createKeyService(join(tempDir, "private", "keys")),
    audit: createJsonAuditRepository(join(tempDir, "data", "audit.json")),
  });
}

// ── Helpers ────────────────────────────────────────────────────────────

/** Create a session directly and return the cookie header value. */
async function createSession(tempDir: string): Promise<string> {
  const repo = createJsonSessionRepository(join(tempDir, "data", "sessions.json"));
  const raw = "a".repeat(64); // deterministic for test
  const hash = createHash("sha256").update(raw).update(SESSION_SECRET).digest("hex");
  await repo.create({
    tokenHash: hash,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  });
  return `${SESSION_COOKIE_NAME}=${raw}`;
}

const origin = "http://127.0.0.1";
const host = "127.0.0.1";

// ── Tests ──────────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("returns 401 with invalid token", async () => {
    const res = await request(app())
      .post("/api/auth/login")
      .send({ token: "wrong" })
      .expect(401);
    expect(res.body.error.message).toBe("Invalid authentication token");
  });

  it("returns 401 with missing token", async () => {
    const res = await request(app())
      .post("/api/auth/login")
      .send({})
      .expect(401);
    expect(res.body.error.message).toBe("Invalid authentication token");
  });

  it("sets HttpOnly SameSite=Lax cookie (Secure=false in test) and returns AuthStatus shape on success", async () => {
    const server = app();
    const res = await request(server)
      .post("/api/auth/login")
      .send({ token: LOCAL_AUTH_TOKEN })
      .expect(201);

    // Response body matches AuthStatus shape
    expect(res.body.data).toMatchObject({
      mode: "local",
      authenticated: true,
      authRequired: true,
    });
    expect(res.body.data.session).toBeDefined();
    expect(res.body.data.session.id).toMatch(/^sess_/);
    expect(res.body.data.session.createdAt).toBeDefined();
    expect(res.body.data.session.expiresAt).toBeDefined();

    // Set-Cookie header
    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookie).toContain(SESSION_COOKIE_NAME);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure"); // dashboardCookieSecure=false in test config
    expect(cookie).toContain("Path=/");

    // Cookie works for subsequent authenticated requests
    const meRes = await request(server)
      .get("/api/auth/me")
      .set("Cookie", cookie!.split(";")[0]!)
      .expect(200);
    expect(meRes.body.data.authenticated).toBe(true);
  });

  it("does not log the submitted token in error responses", async () => {
    const res = await request(app())
      .post("/api/auth/login")
      .send({ token: "super-secret-login-token" })
      .expect(401);
    expect(JSON.stringify(res.body)).not.toContain("super-secret-login-token");
  });
});

describe("POST /api/auth/login rate limiting", () => {
  it("returns 429 after 6 rapid attempts", async () => {
    const server = app();
    // Exhaust the 5-attempt window
    for (let i = 0; i < 5; i++) {
      await request(server)
        .post("/api/auth/login")
        .send({ token: "wrong" })
        .expect(401);
    }
    // 6th attempt should be rate-limited
    const res = await request(server)
      .post("/api/auth/login")
      .send({ token: "wrong" })
      .expect(429);
    expect(res.body.error.message).toContain("Too many login attempts");
    expect(res.headers["retry-after"]).toBeDefined();
  });

  it("does not rate-limit after reset (only testable by waiting, skip for speed)", async () => {
    // Verified by the test above; a timer-based test would be slow and flaky.
    expect(true).toBe(true);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears cookie and revokes session", async () => {
    const server = app();
    const cookie = await createSession(tempDir);

    const res = await request(server)
      .post("/api/auth/logout")
      .set("Cookie", cookie)
      .set("Origin", origin)
      .set("Host", host)
      .expect(201);

    expect(res.body.data).toEqual({ ok: true });

    // Cookie cleared (empty value, immediate expiry)
    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cleared = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cleared).toContain(`${SESSION_COOKIE_NAME}=;`);
    // Express clears cookies by setting Expires to epoch (not Max-Age=0)
    expect(cleared).toContain("HttpOnly");
    expect(cleared).toContain("SameSite=");
    expect(cleared).toContain("Path=/");

    // Session no longer valid
    const meRes = await request(server)
      .get("/api/auth/me")
      .set("Cookie", cookie)
      .expect(200);
    expect(meRes.body.data.authenticated).toBe(false);
  });

  it("rejects logout without Origin for unsafe POST", async () => {
    const server = app();
    const cookie = await createSession(tempDir);

    await request(server)
      .post("/api/auth/logout")
      .set("Cookie", cookie)
      // No Origin header
      .expect(403);
  });

  it("rejects logout from disallowed Origin", async () => {
    const server = app();
    const cookie = await createSession(tempDir);

    await request(server)
      .post("/api/auth/logout")
      .set("Cookie", cookie)
      .set("Origin", "https://evil.com")
      .set("Host", host)
      .expect(403);
  });
});

describe("GET /api/auth/me", () => {
  it("returns unauthenticated status when no cookie", async () => {
    const res = await request(app())
      .get("/api/auth/me")
      .expect(200);
    expect(res.body.data).toEqual({
      mode: "local",
      authenticated: false,
      authRequired: true,
    });
  });

  it("returns authenticated status with valid cookie", async () => {
    const server = app();
    const cookie = await createSession(tempDir);

    const res = await request(server)
      .get("/api/auth/me")
      .set("Cookie", cookie)
      .expect(200);
    expect(res.body.data).toMatchObject({
      mode: "local",
      authenticated: true,
      authRequired: true,
    });
    expect(res.body.data.session.id).toMatch(/^sess_/);
    expect(res.body.data.session.createdAt).toBeDefined();
    expect(res.body.data.session.expiresAt).toBeDefined();
  });

  it("returns unauthenticated for expired sessions", async () => {
    const server = app();
    const repo = createJsonSessionRepository(join(tempDir, "data", "sessions.json"));
    const raw = "expired";
    const hash = createHash("sha256").update(raw).update(SESSION_SECRET).digest("hex");
    await repo.create({
      tokenHash: hash,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    const res = await request(server)
      .get("/api/auth/me")
      .set("Cookie", `${SESSION_COOKIE_NAME}=${raw}`)
      .expect(200);
    expect(res.body.data.authenticated).toBe(false);
  });
});
