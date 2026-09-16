import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppConfig } from "../src/config/app-config.js";
import { DashboardSessionService } from "../src/auth/dashboard-session.service.js";
import { OriginGuard } from "../src/auth/origin-guard.js";
import { isExactAllowedOrigin, isWebSocketOriginAllowed } from "../src/auth/origin-policy.js";
import { createJsonSessionRepository } from "../src/persistence/repositories/session.repository.js";

const config = {
  mode: "local",
  dashboardSessionSecret: "pepper",
  dashboardPublicOrigin: "https://dashboard.example.test",
} as AppConfig;

const request = (cookie?: string) => ({ headers: { cookie } }) as never;
const context = (req: Record<string, unknown>) => ({
  switchToHttp: () => ({ getRequest: () => req }),
}) as never;

describe("dashboard session and origin primitives", () => {
  let dir: string;
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("authenticates a cookie using the hashed token and returns metadata", async () => {
    dir = await mkdtemp(join(tmpdir(), "session-test-"));
    const repo = createJsonSessionRepository(join(dir, "sessions.json"));
    const service = new DashboardSessionService(config, repo);
    const created = await repo.create({
      tokenHash: service.hashToken("token"),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const metadata = await service.authenticate(request("vps_dashboard_sid=token"));
    expect(metadata).toMatchObject({ id: created.id });
    expect(metadata).not.toHaveProperty("tokenHash");
    expect(metadata).not.toHaveProperty("revokedAt");
  });

  it("rejects missing, invalid, expired, and revoked sessions", async () => {
    dir = await mkdtemp(join(tmpdir(), "session-test-"));
    const repo = createJsonSessionRepository(join(dir, "sessions.json"));
    const service = new DashboardSessionService(config, repo);
    await expect(service.authenticate(request())).rejects.toMatchObject({ response: { error: { message: "Authentication required" } } });
    await expect(service.authenticate(request("vps_dashboard_sid=bad"))).rejects.toBeDefined();
    const expired = await repo.create({ tokenHash: service.hashToken("expired"), expiresAt: new Date(Date.now() - 1).toISOString() });
    expect(await repo.findActiveById(expired.id)).toBeUndefined();
    const revoked = await repo.create({ tokenHash: service.hashToken("revoked"), expiresAt: new Date(Date.now() + 60_000).toISOString() });
    await repo.revoke(revoked.id);
    expect(await repo.findActiveById(revoked.id)).toBeUndefined();
    await expect(service.authenticate(request("vps_dashboard_sid=expired"))).rejects.toBeDefined();
    await expect(service.authenticate(request("vps_dashboard_sid=revoked"))).rejects.toBeDefined();
  });

  it("applies exact origin policy", () => {
    const base = { configuredOrigin: "https://dashboard.example.test" };
    expect(isExactAllowedOrigin({ ...base, origin: "https://dashboard.example.test" })).toBe(true);
    expect(isExactAllowedOrigin({ ...base, origin: "https://dashboard.example.test.evil" })).toBe(false);
    expect(isExactAllowedOrigin({ origin: "http://dashboard.example.test", host: "dashboard.example.test" })).toBe(true);
    expect(isExactAllowedOrigin({ origin: "http://dashboard.example.test", configuredOrigin: "https://dashboard.example.test" })).toBe(false);
    expect(isExactAllowedOrigin({ origin: "https://dashboard.example.test:8443", host: "dashboard.example.test" })).toBe(false);
    expect(isExactAllowedOrigin({ origin: "not-an-origin", host: "dashboard.example.test" })).toBe(false);
    expect(isExactAllowedOrigin({ host: "dashboard.example.test" })).toBe(false);
  });

  it("strict WebSocket policy requires canonical exact origins", () => {
    const expected = "https://dashboard.example.test";
    for (const origin of [undefined, "", "null", "bad", "https://dashboard.example.test/path", "https://dashboard.example.test/?x=1", "https://dashboard.example.test/#x", "https://u:p@dashboard.example.test", "https://dashboard.example.test,https://evil.test"]) {
      expect(isWebSocketOriginAllowed({ origin, configuredOrigin: expected })).toBe(false);
    }
    expect(isWebSocketOriginAllowed({ origin: expected, configuredOrigin: expected })).toBe(true);
    expect(isWebSocketOriginAllowed({ origin: "https://dashboard.example.test:443", configuredOrigin: expected })).toBe(true);
    expect(isWebSocketOriginAllowed({ origin: "http://dashboard.example.test", configuredOrigin: expected })).toBe(false);
    expect(isWebSocketOriginAllowed({ origin: "https://dashboard.example.test:8443", configuredOrigin: expected })).toBe(false);
    expect(isWebSocketOriginAllowed({ origin: expected, configuredOrigin: "https://other.example.test" , expectedOrigin: expected })).toBe(false);
    expect(isWebSocketOriginAllowed({ origin: expected, expectedOrigin: expected })).toBe(true);
  });

  it("preserves OriginGuard missing and malformed origin errors", () => {
    const guard = new OriginGuard(config);
    expect(() => guard.canActivate(context({ method: "POST", headers: { host: "dashboard.example.test" } }))).toThrowError(expect.objectContaining({ response: { error: { message: "Origin header required" } } }));
    expect(() => guard.canActivate(context({ method: "POST", headers: { host: "dashboard.example.test", origin: "bad" } }))).toThrowError(expect.objectContaining({ response: { error: { message: "Invalid origin" } } }));
    expect(guard.canActivate(context({ method: "POST", headers: { host: "dashboard.example.test", origin: "https://dashboard.example.test" } }))).toBe(true);
  });
});
