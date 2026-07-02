import { createDatabasePool } from "./pool.js";
import { runMigrations } from "./migrations.js";
import { loadAppConfig } from "../config/app-config.js";

const includeOptional = process.argv.includes("--include-optional");

const config = loadAppConfig();

if (config.storageDriver !== "postgres") {
  throw new Error("Set STORAGE_DRIVER=postgres before running database migrations");
}

const pool = createDatabasePool(config);

try {
  const result = await runMigrations(pool, { includeOptional });
  const summary = result.applied.length ? result.applied.join(", ") : "none";
  console.log(`Applied migrations: ${summary}`);
} finally {
  await pool.end();
}
