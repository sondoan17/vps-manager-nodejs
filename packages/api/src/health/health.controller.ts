import {
  Controller,
  Get,
  Inject,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { Pool } from "pg";
import type { AppConfig } from "../config/app-config.js";
import { APP_CONFIG, DATABASE_POOL } from "../tokens.js";
import { loadMigrations, selectMigrations } from "../db/migrations.js";

// In-memory cache of required migration IDs (lazily populated)
let cachedRequiredIds: string[] | undefined;

async function getRequiredMigrationIds(): Promise<string[]> {
  if (cachedRequiredIds) return cachedRequiredIds;
  const all = await loadMigrations();
  const required = selectMigrations(all, false);
  cachedRequiredIds = required.map((m) => m.id);
  return cachedRequiredIds;
}

@Controller("api/health")
export class HealthController {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Optional() @Inject(DATABASE_POOL) private readonly pool?: Pool,
  ) {}

  @Get()
  async health(): Promise<Record<string, unknown>> {
    // ---- JSON mode: always exact { ok: true } ----
    if (this.config.storageDriver !== "postgres") {
      return { ok: true };
    }

    // ---- Postgres mode: check DB + schema ----
    if (!this.pool) {
      throw new ServiceUnavailableException("Database pool not available");
    }

    // Lightweight DB connectivity check
    try {
      await this.pool.query("SELECT 1");
    } catch {
      throw new ServiceUnavailableException("Database connection failed");
    }

    // Schema migrations check
    let appliedRows: { id: string }[];
    try {
      const result = await this.pool.query<{ id: string }>(
        "SELECT id FROM schema_migrations ORDER BY id",
      );
      appliedRows = result.rows;
    } catch {
      throw new ServiceUnavailableException(
        "Schema migrations table not found or query failed",
      );
    }

    const appliedSet = new Set(appliedRows.map((r) => r.id));
    const requiredIds = await getRequiredMigrationIds();
    const missing = requiredIds.filter((id) => !appliedSet.has(id));

    if (missing.length > 0) {
      throw new ServiceUnavailableException(
        `Required migrations not applied: ${missing.join(", ")}`,
      );
    }

    return {
      ok: true,
      storage: "postgres",
      database: { ok: true },
      schema: { ok: true },
    };
  }
}
