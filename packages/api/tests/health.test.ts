import { describe, expect, it, vi, beforeEach } from "vitest";
import { ServiceUnavailableException } from "@nestjs/common";
import type { AppConfig } from "../src/config/app-config.js";
import { HealthController } from "../src/health/health.controller.js";

// ---------------------------------------------------------------------------
// Mock loadMigrations / selectMigrations so tests never read real files
// ---------------------------------------------------------------------------
vi.mock("../src/db/migrations.js", () => ({
  loadMigrations: vi.fn(),
  selectMigrations: vi.fn(),
}));

async function mockMigrations() {
  const mod = await import("../src/db/migrations.js");
  return {
    loadMigrations: mod.loadMigrations as import("vitest").Mock,
    selectMigrations: mod.selectMigrations as import("vitest").Mock,
  };
}

// ---------------------------------------------------------------------------
// Shared configs
// ---------------------------------------------------------------------------

const jsonConfig: AppConfig = {
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

const pgConfig: AppConfig = {
  ...jsonConfig,
  storageDriver: "postgres",
  databaseUrl: "postgres://test:test@localhost:5432/test",
};

// Mock pool factory
function mockPool(behaviour: { query?: (...args: unknown[]) => unknown } = {}) {
  const defaultQuery = vi.fn().mockResolvedValue({ rows: [] });
  return {
    query: behaviour.query ?? defaultQuery,
    end: vi.fn(),
  } as never;
}

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------

beforeEach(async () => {
  const mod = await mockMigrations();
  mod.loadMigrations.mockReset();
  mod.selectMigrations.mockReset();

  // Clear the module-level cache in the controller module
  // by re-importing fresh (vitest caching means we need to access the variable)
  const ctrlModule = await import("../src/health/health.controller.js");
  // The cache variable is not exported, but we can force re-fetch by
  // clearing the mock — the lazy check will re-call loadMigrations.
});

// ---------------------------------------------------------------------------
// JSON mode tests
// ---------------------------------------------------------------------------

describe("HealthController — JSON storage", () => {
  it("returns exact { ok: true }", async () => {
    const ctrl = new HealthController(jsonConfig);
    const result = await ctrl.health();
    expect(result).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// Postgres mode tests
// ---------------------------------------------------------------------------

describe("HealthController — Postgres storage", () => {
  beforeEach(async () => {
    const mod = await mockMigrations();
    // Default: core migrations (non-optional)
    mod.loadMigrations.mockResolvedValue([
      { id: "001_core_schema.sql", path: "/fake/001_core_schema.sql", sql: "CREATE TABLE ..." },
      { id: "002_metric_indexes.sql", path: "/fake/002_metric_indexes.sql", sql: "CREATE INDEX ..." },
      { id: "003_timescale_optional.sql", path: "/fake/003_timescale_optional.sql", sql: "CREATE EXTENSION ..." },
      { id: "006_rate_limit_buckets.sql", path: "/fake/006_rate_limit_buckets.sql", sql: "CREATE TABLE ..." },
    ]);
    mod.selectMigrations.mockImplementation((migs: { id: string }[], includeOptional: boolean) =>
      includeOptional ? migs : migs.filter((m) => !m.id.includes("optional")),
    );
  });

  it("returns structured success when pool + schema + migrations ok", async () => {
    const pool = mockPool({
      query: vi.fn().mockImplementation((sql: string) => {
        if (sql === "SELECT 1") return { rows: [{ "?column?": 1 }] };
        if (sql.includes("schema_migrations")) {
          return {
            rows: [
              { id: "001_core_schema.sql" },
              { id: "002_metric_indexes.sql" },
              { id: "006_rate_limit_buckets.sql" },
            ],
          };
        }
        return { rows: [] };
      }),
    });
    const ctrl = new HealthController(pgConfig, pool);
    const result = await ctrl.health();
    expect(result).toEqual({
      ok: true,
      storage: "postgres",
      database: { ok: true },
      schema: { ok: true },
    });
  });

  it("throws ServiceUnavailableException when pool is undefined", async () => {
    const ctrl = new HealthController(pgConfig);
    await expect(ctrl.health()).rejects.toThrow(ServiceUnavailableException);
    await expect(ctrl.health()).rejects.toThrow("Database pool not available");
  });

  it("throws ServiceUnavailableException when SELECT 1 fails", async () => {
    const pool = mockPool({
      query: vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED")),
    });
    const ctrl = new HealthController(pgConfig, pool);
    await expect(ctrl.health()).rejects.toThrow(ServiceUnavailableException);
  });

  it("throws ServiceUnavailableException when schema_migrations query fails", async () => {
    const pool = mockPool({
      query: vi.fn().mockImplementation((sql: string) => {
        if (sql === "SELECT 1") return { rows: [{ "?column?": 1 }] };
        throw new Error('relation "schema_migrations" does not exist');
      }),
    });
    const ctrl = new HealthController(pgConfig, pool);
    await expect(ctrl.health()).rejects.toThrow(ServiceUnavailableException);
    await expect(ctrl.health()).rejects.toThrow("Schema migrations table not found");
  });

  it("throws ServiceUnavailableException when required migration is missing", async () => {
    const pool = mockPool({
      query: vi.fn().mockImplementation((sql: string) => {
        if (sql === "SELECT 1") return { rows: [{ "?column?": 1 }] };
        if (sql.includes("schema_migrations")) {
          return { rows: [{ id: "001_core_schema.sql" }] }; // 002_metric_indexes.sql is missing
        }
        return { rows: [] };
      }),
    });
    const ctrl = new HealthController(pgConfig, pool);
    await expect(ctrl.health()).rejects.toThrow(ServiceUnavailableException);
    await expect(ctrl.health()).rejects.toThrow("002_metric_indexes.sql");
    await expect(ctrl.health()).rejects.toThrow("006_rate_limit_buckets.sql");
  });

  it("throws ServiceUnavailableException with missing migration names in message", async () => {
    const pool = mockPool({
      query: vi.fn().mockImplementation((sql: string) => {
        if (sql === "SELECT 1") return { rows: [{ "?column?": 1 }] };
        if (sql.includes("schema_migrations")) return { rows: [] }; // nothing applied
        return { rows: [] };
      }),
    });
    const ctrl = new HealthController(pgConfig, pool);
    await expect(ctrl.health()).rejects.toThrow(ServiceUnavailableException);
    await expect(ctrl.health()).rejects.toThrow("001_core_schema.sql");
    await expect(ctrl.health()).rejects.toThrow("002_metric_indexes.sql");
    await expect(ctrl.health()).rejects.toThrow("006_rate_limit_buckets.sql");
  });
});
